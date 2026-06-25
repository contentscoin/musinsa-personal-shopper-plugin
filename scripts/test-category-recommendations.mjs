import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = new URL('..', import.meta.url);
const data = JSON.parse(await readFile(new URL('../data/products.crawled.json', import.meta.url), 'utf8'));
const products = data.products ?? [];
const port = Number(process.env.CATEGORY_RECOMMEND_TEST_PORT ?? 8792);
const baseUrl = `http://127.0.0.1:${port}`;
const reportPath = new URL('../reports/category-recommendation-quality-test-20260625.json', import.meta.url);
const mdReportPath = new URL('../reports/category-recommendation-quality-test-20260625.md', import.meta.url);

function normalize(v) {
  return String(v ?? '').toLowerCase().replace(/[^0-9a-z가-힣\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function tight(v) { return normalize(v).replace(/\s+/g, ''); }
function categoryPath(p) { return (p.category_path ?? []).join(' > '); }
function leafCategory(path) { return String(path).split(' > ').at(-1) ?? path; }
function topLevel(path) { return String(path).split(' > ')[0] ?? path; }
function finalPrice(p) { return p.price?.final_price ?? p.price?.sale_price ?? null; }
function countBy(values) {
  const counts = new Map();
  for (const v of values.filter(Boolean)) counts.set(v, (counts.get(v) ?? 0) + 1);
  return counts;
}
function pickTop(counts, n) {
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([key, count]) => ({ key, count }));
}
function categoryMatches(item, expectedPath) {
  const actual = categoryPath(item);
  const expectedLeaf = leafCategory(expectedPath);
  return tight(actual).includes(tight(expectedPath)) || tight(actual).includes(tight(expectedLeaf)) || tight(item.name_ko).includes(tight(expectedLeaf));
}
function sameTopLevel(item, expectedPath) {
  return topLevel(categoryPath(item)) === topLevel(expectedPath);
}
function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

const categoryCounts = countBy(products.map(categoryPath));
const selectedCategories = pickTop(categoryCounts, Number(process.env.CATEGORY_RECOMMEND_CATEGORIES ?? 80));
const scenarios = [];
for (const { key: path, count } of selectedCategories) {
  const leaf = leafCategory(path);
  const categoryProducts = products.filter(p => categoryPath(p) === path);
  const prices = categoryProducts.map(finalPrice).filter(v => Number.isFinite(v)).sort((a, b) => a - b);
  const med = median(prices);
  const budgets = [undefined];
  if (med) budgets.push(Math.ceil((med * 1.15) / 1000) * 1000);
  for (const budget of budgets) {
    scenarios.push({
      category_path: path,
      source_count: count,
      scenario: budget ? 'category_with_budget' : 'category_general',
      request: {
        query: budget ? `${leaf} ${Math.round(budget / 10000)}만원 이하 추천` : `${leaf} 추천`,
        budget,
        category: path,
        customer_profile: {
          style_preference: ['데일리', '기본', '실용적'],
          fit_preference: '정핏',
          purchase_context: `${leaf} 카테고리 후보 비교`
        },
        limit: 5
      }
    });
  }
}

const server = spawn(process.execPath, ['src/server.mjs'], {
  cwd: fileURLToPath(projectRoot),
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe']
});
let serverOutput = '';
server.stdout.on('data', d => { serverOutput += d.toString(); });
server.stderr.on('data', d => { serverOutput += d.toString(); });
async function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function waitForHealth() {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < 15000) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) return await res.json();
      lastError = new Error(`health ${res.status}`);
    } catch (error) { lastError = error; }
    await sleep(250);
  }
  throw lastError ?? new Error('server did not become healthy');
}
function validateScenario(s, response) {
  const failures = [];
  const recs = response.recommendations ?? [];
  if (!recs.length) failures.push('empty_recommendations');
  if (recs.length > s.request.limit) failures.push('limit_exceeded');
  if (!response.assistant_summary || typeof response.assistant_summary !== 'string') failures.push('missing_assistant_summary');
  if (!response.recommendation_confidence) failures.push('missing_recommendation_confidence');
  if (response.recommendation_confidence?.low_confidence && recs.length >= 3) failures.push('unexpected_low_confidence');
  for (const rec of recs) {
    if (!rec.score_breakdown) failures.push(`missing_score_breakdown:${rec.product_id}`);
    if (!rec.why_recommended) failures.push(`missing_reason:${rec.product_id}`);
    if (!rec.shopper_insight) failures.push(`missing_shopper_insight:${rec.product_id}`);
    if (s.request.budget && finalPrice(rec) > s.request.budget) failures.push(`price_over_budget:${rec.product_id}`);
  }
  const exactMatches = recs.filter(r => categoryMatches(r, s.category_path)).length;
  const topLevelMatches = recs.filter(r => sameTopLevel(r, s.category_path)).length;
  const requiredExact = Math.min(3, recs.length);
  if (exactMatches < requiredExact) failures.push(`weak_category_precision:${exactMatches}/${recs.length}`);
  if (topLevelMatches < requiredExact) failures.push(`weak_top_level_precision:${topLevelMatches}/${recs.length}`);
  const uniqueBrands = new Set(recs.map(r => r.brand?.name_ko ?? r.brand?.name_en).filter(Boolean)).size;
  const totals = recs.map(r => r.score_breakdown?.total).filter(v => Number.isFinite(v));
  if (totals.length && totals.some((v, i) => i > 0 && v > totals[i - 1] + 0.001)) failures.push('score_breakdown_not_sorted');
  return { failures: [...new Set(failures)], exactMatches, topLevelMatches, uniqueBrands };
}

const startedAt = new Date().toISOString();
const records = [];
let health;
try {
  health = await waitForHealth();
  for (const [index, s] of scenarios.entries()) {
    const t0 = performance.now();
    let status = 0;
    let payload = null;
    let error = null;
    try {
      const res = await fetch(`${baseUrl}/shopper/recommend`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(s.request)
      });
      status = res.status;
      payload = await res.json();
    } catch (err) { error = err.message; }
    const latencyMs = Math.round((performance.now() - t0) * 100) / 100;
    const validation = status === 200 && payload ? validateScenario(s, payload) : { failures: ['http_or_json_failure'], exactMatches: 0, topLevelMatches: 0, uniqueBrands: 0 };
    records.push({
      index: index + 1,
      scenario: s.scenario,
      category_path: s.category_path,
      source_count: s.source_count,
      request: s.request,
      status,
      latency_ms: latencyMs,
      recommendation_count: payload?.recommendations?.length ?? 0,
      confidence: payload?.recommendation_confidence ?? null,
      exact_category_matches: validation.exactMatches,
      top_level_matches: validation.topLevelMatches,
      unique_brands: validation.uniqueBrands,
      top_recommendation: payload?.recommendations?.[0] ? {
        product_id: payload.recommendations[0].product_id,
        name_ko: payload.recommendations[0].name_ko,
        brand: payload.recommendations[0].brand?.name_ko,
        category: categoryPath(payload.recommendations[0]),
        final_price: finalPrice(payload.recommendations[0]),
        score: payload.recommendations[0].score,
        score_total: payload.recommendations[0].score_breakdown?.total
      } : null,
      validation_failures: error ? [error] : validation.failures
    });
  }
} finally {
  server.kill('SIGTERM');
}

const failures = records.filter(r => r.status !== 200 || r.validation_failures.length);
const latencies = records.map(r => r.latency_ms).sort((a, b) => a - b);
const percentile = p => latencies.length ? latencies[Math.min(latencies.length - 1, Math.floor((p / 100) * latencies.length))] : null;
const byScenario = {};
for (const r of records) {
  byScenario[r.scenario] ??= { count: 0, pass: 0, nonempty: 0, avg_latency_ms: 0, avg_exact_matches: 0, avg_unique_brands: 0 };
  const s = byScenario[r.scenario];
  s.count += 1;
  if (!r.validation_failures.length && r.status === 200) s.pass += 1;
  if (r.recommendation_count) s.nonempty += 1;
  s.avg_latency_ms += r.latency_ms;
  s.avg_exact_matches += r.exact_category_matches;
  s.avg_unique_brands += r.unique_brands;
}
for (const s of Object.values(byScenario)) {
  s.avg_latency_ms = Math.round((s.avg_latency_ms / s.count) * 100) / 100;
  s.avg_exact_matches = Math.round((s.avg_exact_matches / s.count) * 100) / 100;
  s.avg_unique_brands = Math.round((s.avg_unique_brands / s.count) * 100) / 100;
}
const report = {
  started_at: startedAt,
  completed_at: new Date().toISOString(),
  base_url: baseUrl,
  health,
  dataset: { products: products.length, distinct_category_paths: categoryCounts.size },
  summary: {
    total_scenarios: records.length,
    passed: records.length - failures.length,
    failed: failures.length,
    nonempty_scenarios: records.filter(r => r.recommendation_count > 0).length,
    p50_latency_ms: percentile(50),
    p95_latency_ms: percentile(95),
    max_latency_ms: latencies.at(-1) ?? null
  },
  by_scenario: byScenario,
  failure_samples: failures.slice(0, 40),
  sample_successes: records.filter(r => !r.validation_failures.length && r.recommendation_count > 0).slice(0, 20),
  all_records: records
};
await mkdir(dirname(fileURLToPath(reportPath)), { recursive: true });
await writeFile(reportPath, JSON.stringify(report, null, 2));
const md = `# Category Recommendation Quality Test — 2026-06-25\n\n` +
`- Base URL: ${baseUrl}\n` +
`- Products loaded: ${health?.products_loaded}\n` +
`- Dataset products: ${products.length}\n` +
`- Distinct category paths: ${categoryCounts.size}\n` +
`- Tested category paths: ${selectedCategories.length}\n\n` +
`## Summary\n\n| Metric | Value |\n|---|---:|\n` +
`| Total scenarios | ${report.summary.total_scenarios} |\n` +
`| Passed | ${report.summary.passed} |\n` +
`| Failed | ${report.summary.failed} |\n` +
`| Non-empty scenarios | ${report.summary.nonempty_scenarios} |\n` +
`| p50 latency ms | ${report.summary.p50_latency_ms} |\n` +
`| p95 latency ms | ${report.summary.p95_latency_ms} |\n` +
`| max latency ms | ${report.summary.max_latency_ms} |\n\n` +
`## By scenario\n\n| Scenario | Count | Pass | Non-empty | Avg exact category matches | Avg unique brands | Avg latency ms |\n|---|---:|---:|---:|---:|---:|---:|\n` +
Object.entries(byScenario).map(([name, s]) => `| ${name} | ${s.count} | ${s.pass} | ${s.nonempty} | ${s.avg_exact_matches} | ${s.avg_unique_brands} | ${s.avg_latency_ms} |`).join('\n') +
`\n\n## Failure samples\n\n` +
(failures.length ? failures.slice(0, 12).map(f => `- #${f.index} ${f.scenario} / ${f.category_path} / ${JSON.stringify(f.request)} => ${f.validation_failures.join(', ')}`).join('\n') : '- None') +
`\n\n## Sample successes\n\n` +
report.sample_successes.slice(0, 12).map(s => `- #${s.index} ${s.scenario} / ${s.category_path}: top=${s.top_recommendation?.product_id} ${s.top_recommendation?.name_ko} / exact=${s.exact_category_matches}/${s.recommendation_count} / brands=${s.unique_brands} / ${s.latency_ms}ms`).join('\n') +
`\n`;
await writeFile(mdReportPath, md);
console.log(JSON.stringify({
  ok: failures.length === 0,
  report: fileURLToPath(reportPath),
  markdown_report: fileURLToPath(mdReportPath),
  summary: report.summary,
  by_scenario: byScenario,
  failure_count: failures.length,
  server_output: serverOutput.trim().split('\n').slice(-3)
}, null, 2));
