import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = new URL('..', import.meta.url);
const data = JSON.parse(await readFile(new URL('../data/products.crawled.json', import.meta.url), 'utf8'));
const products = data.products ?? [];
const port = Number(process.env.SEARCH_API_TEST_PORT ?? 8791);
const baseUrl = `http://127.0.0.1:${port}`;
const reportPath = new URL('../reports/product-search-api-mass-test-20260625.json', import.meta.url);
const mdReportPath = new URL('../reports/product-search-api-mass-test-20260625.md', import.meta.url);

function categoryPath(p) {
  return (p.category_path ?? []).join(' > ');
}
function finalPrice(p) {
  return p.price?.final_price ?? p.price?.sale_price ?? null;
}
function brandName(p) {
  return p.brand?.name_ko ?? p.brand?.name_en ?? '';
}
function normalize(v) {
  return String(v ?? '').toLowerCase().replace(/[^0-9a-z가-힣\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function tight(v) {
  return normalize(v).replace(/\s+/g, '');
}
function pickTop(counts, n) {
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([key, count]) => ({ key, count }));
}
function countBy(values) {
  const counts = new Map();
  for (const v of values.filter(Boolean)) counts.set(v, (counts.get(v) ?? 0) + 1);
  return counts;
}

const categoryCounts = countBy(products.map(categoryPath));
const brandCounts = countBy(products.map(brandName));
const topCategories = pickTop(categoryCounts, 50);
const topBrands = pickTop(brandCounts, 45).filter(x => x.key);
const colors = ['블랙', '그레이', '차콜', '화이트', '아이보리', '베이지', '네이비', '브라운', '카키', '블루'];

const queries = [];
for (const { key } of topCategories) {
  const leaf = key.split(' > ').at(-1);
  queries.push({ type: 'category_structured', body: { category: key, limit: 8 }, expect: { category: key, nonempty: true } });
  queries.push({ type: 'category_leaf_query', body: { query: leaf, limit: 8 }, expect: { categoryContains: leaf, nonempty: true } });
}
for (const { key } of topBrands) {
  queries.push({ type: 'brand_structured', body: { brand: key, limit: 6 }, expect: { brand: key, nonempty: true } });
}
for (const { key: category } of topCategories.slice(0, 30)) {
  const leaf = category.split(' > ').at(-1);
  for (const color of colors.slice(0, 3)) {
    queries.push({ type: 'natural_color_category', body: { query: `${color} ${leaf} 추천`, limit: 5 }, expect: { nonempty: false } });
  }
}
for (const { key: brand } of topBrands.slice(0, 25)) {
  const sample = products.find(p => brandName(p) === brand && categoryPath(p));
  if (!sample) continue;
  const leaf = categoryPath(sample).split(' > ').at(-1);
  queries.push({ type: 'brand_category_natural', body: { query: `${brand} ${leaf}`, brand, limit: 5 }, expect: { brand, nonempty: true } });
}
for (const budget of [30000, 50000, 80000, 120000, 200000]) {
  for (const { key: category } of topCategories.slice(0, 12)) {
    const leaf = category.split(' > ').at(-1);
    queries.push({ type: 'budget_category', body: { query: leaf, category, price_max: budget, limit: 7 }, expect: { category, priceMax: budget, nonempty: false } });
  }
}

const selectedQueries = queries.slice(0, Number(process.env.SEARCH_API_TEST_QUERIES ?? 320));

const server = spawn(process.execPath, ['src/server.mjs'], {
  cwd: fileURLToPath(projectRoot),
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe']
});
let serverOutput = '';
server.stdout.on('data', d => { serverOutput += d.toString(); });
server.stderr.on('data', d => { serverOutput += d.toString(); });

function brandMatches(actualBrand, requestedBrand) {
  const actual = normalize(actualBrand);
  const requested = normalize(requestedBrand);
  if (!requested) return true;
  if (actual === requested) return true;
  return actual.startsWith(`${requested} `) || tight(actual).startsWith(tight(requested));
}

async function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function waitForHealth() {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < 15000) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) return await res.json();
      lastError = new Error(`health ${res.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(250);
  }
  throw lastError ?? new Error('server did not become healthy');
}
function validateResults(testCase, response) {
  const failures = [];
  const results = response.results ?? [];
  const expect = testCase.expect ?? {};
  if (expect.nonempty && results.length === 0) failures.push('expected_nonempty_results');
  if (results.length > (testCase.body.limit ?? 10)) failures.push('limit_exceeded');
  for (const item of results) {
    const cPath = categoryPath(item);
    const brand = brandName(item);
    const price = finalPrice(item);
    if (expect.category && !(tight(cPath).includes(tight(expect.category)) || tight(expect.category).includes(tight(cPath)))) failures.push(`category_mismatch:${item.product_id}`);
    if (expect.categoryContains && !tight(cPath).includes(tight(expect.categoryContains)) && !tight(item.name_ko).includes(tight(expect.categoryContains))) failures.push(`category_contains_mismatch:${item.product_id}`);
    if (expect.brand && !brandMatches(brand, expect.brand)) failures.push(`brand_mismatch:${item.product_id}`);
    if (expect.priceMax && price !== null && price > expect.priceMax) failures.push(`price_over_max:${item.product_id}`);
  }
  return [...new Set(failures)];
}

const startedAt = new Date().toISOString();
let health;
const records = [];
try {
  health = await waitForHealth();
  for (const [index, testCase] of selectedQueries.entries()) {
    const t0 = performance.now();
    let status = 0;
    let payload = null;
    let error = null;
    try {
      const res = await fetch(`${baseUrl}/products/search`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(testCase.body)
      });
      status = res.status;
      payload = await res.json();
    } catch (err) {
      error = err.message;
    }
    const latencyMs = Math.round((performance.now() - t0) * 100) / 100;
    const validationFailures = status === 200 && payload ? validateResults(testCase, payload) : ['http_or_json_failure'];
    records.push({
      index: index + 1,
      type: testCase.type,
      request: testCase.body,
      status,
      latency_ms: latencyMs,
      result_count: payload?.results?.length ?? 0,
      top_result: payload?.results?.[0] ? {
        product_id: payload.results[0].product_id,
        name_ko: payload.results[0].name_ko,
        brand: brandName(payload.results[0]),
        category: categoryPath(payload.results[0]),
        final_price: finalPrice(payload.results[0]),
        score: payload.results[0].score
      } : null,
      validation_failures: error ? [error] : validationFailures
    });
  }
} finally {
  server.kill('SIGTERM');
}

const latencies = records.map(r => r.latency_ms).sort((a, b) => a - b);
const failures = records.filter(r => r.status !== 200 || r.validation_failures.length);
const nonempty = records.filter(r => r.result_count > 0).length;
const byType = {};
for (const r of records) {
  byType[r.type] ??= { count: 0, pass: 0, nonempty: 0, avg_latency_ms: 0 };
  byType[r.type].count += 1;
  if (r.status === 200 && r.validation_failures.length === 0) byType[r.type].pass += 1;
  if (r.result_count > 0) byType[r.type].nonempty += 1;
  byType[r.type].avg_latency_ms += r.latency_ms;
}
for (const stat of Object.values(byType)) stat.avg_latency_ms = Math.round((stat.avg_latency_ms / stat.count) * 100) / 100;
const percentile = p => latencies.length ? latencies[Math.min(latencies.length - 1, Math.floor((p / 100) * latencies.length))] : null;
const report = {
  started_at: startedAt,
  completed_at: new Date().toISOString(),
  base_url: baseUrl,
  health,
  dataset: {
    products: products.length,
    distinct_brands: brandCounts.size,
    distinct_category_paths: categoryCounts.size
  },
  summary: {
    total_queries: records.length,
    passed: records.length - failures.length,
    failed: failures.length,
    nonempty_queries: nonempty,
    empty_queries: records.length - nonempty,
    p50_latency_ms: percentile(50),
    p95_latency_ms: percentile(95),
    max_latency_ms: latencies.at(-1) ?? null
  },
  by_type: byType,
  failure_samples: failures.slice(0, 30),
  sample_successes: records.filter(r => r.status === 200 && !r.validation_failures.length && r.result_count > 0).slice(0, 20),
  all_records: records
};

await mkdir(dirname(fileURLToPath(reportPath)), { recursive: true });
await writeFile(reportPath, JSON.stringify(report, null, 2));
const md = `# Product Search API Mass Test — 2026-06-25\n\n` +
`- Base URL: ${baseUrl}\n` +
`- Products loaded: ${health?.products_loaded}\n` +
`- Dataset products: ${products.length}\n` +
`- Distinct brands: ${brandCounts.size}\n` +
`- Distinct category paths: ${categoryCounts.size}\n\n` +
`## Summary\n\n` +
`| Metric | Value |\n|---|---:|\n` +
`| Total queries | ${report.summary.total_queries} |\n` +
`| Passed | ${report.summary.passed} |\n` +
`| Failed | ${report.summary.failed} |\n` +
`| Non-empty queries | ${report.summary.nonempty_queries} |\n` +
`| Empty queries | ${report.summary.empty_queries} |\n` +
`| p50 latency ms | ${report.summary.p50_latency_ms} |\n` +
`| p95 latency ms | ${report.summary.p95_latency_ms} |\n` +
`| max latency ms | ${report.summary.max_latency_ms} |\n\n` +
`## By type\n\n| Type | Count | Pass | Non-empty | Avg latency ms |\n|---|---:|---:|---:|---:|\n` +
Object.entries(byType).map(([type, s]) => `| ${type} | ${s.count} | ${s.pass} | ${s.nonempty} | ${s.avg_latency_ms} |`).join('\n') +
`\n\n## Failure samples\n\n` +
(failures.length ? failures.slice(0, 10).map(f => `- #${f.index} ${f.type} ${JSON.stringify(f.request)} => ${f.validation_failures.join(', ')}`).join('\n') : '- None') +
`\n\n## Sample successes\n\n` +
report.sample_successes.slice(0, 10).map(s => `- #${s.index} ${s.type}: ${JSON.stringify(s.request)} => ${s.top_result?.product_id} / ${s.top_result?.name_ko} / ${s.result_count} results / ${s.latency_ms}ms`).join('\n') +
`\n`;
await writeFile(mdReportPath, md);
console.log(JSON.stringify({
  ok: failures.length === 0,
  report: fileURLToPath(reportPath),
  markdown_report: fileURLToPath(mdReportPath),
  summary: report.summary,
  by_type: report.by_type,
  failure_count: failures.length,
  server_output: serverOutput.trim().split('\n').slice(-3)
}, null, 2));
