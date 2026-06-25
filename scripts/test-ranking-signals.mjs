import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = new URL('..', import.meta.url);
const data = JSON.parse(await readFile(new URL('../data/products.crawled.json', import.meta.url), 'utf8'));
const products = data.products ?? [];
const port = Number(process.env.RANKING_SIGNAL_TEST_PORT ?? 8793);
const baseUrl = `http://127.0.0.1:${port}`;
const reportPath = new URL('../reports/ranking-signal-quality-test-20260625.json', import.meta.url);
const mdReportPath = new URL('../reports/ranking-signal-quality-test-20260625.md', import.meta.url);

function normalize(v) { return String(v ?? '').toLowerCase().replace(/[^0-9a-z가-힣\s]/g, ' ').replace(/\s+/g, ' ').trim(); }
function tight(v) { return normalize(v).replace(/\s+/g, ''); }
function categoryPath(p) { return (p.category_path ?? []).join(' > '); }
function leafCategory(path) { return String(path).split(' > ').at(-1) ?? path; }
function brandName(p) { return p.brand?.name_ko ?? p.brand?.name_en ?? ''; }
function finalPrice(p) { return p.price?.final_price ?? p.price?.sale_price ?? null; }
function reviewCount(p) { return p.review?.total_count ?? 0; }
function satisfaction(p) { return p.review?.satisfaction_score ?? 0; }
function brandMatches(actualBrand, requestedBrand) {
  const actual = normalize(actualBrand);
  const requested = normalize(requestedBrand);
  return actual === requested || actual.startsWith(`${requested} `) || tight(actual).startsWith(tight(requested));
}
function countBy(values) {
  const counts = new Map();
  for (const v of values.filter(Boolean)) counts.set(v, (counts.get(v) ?? 0) + 1);
  return counts;
}
function pickTop(counts, n) {
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([key, count]) => ({ key, count }));
}
function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}
function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

const brandCounts = countBy(products.map(brandName));
const categoryCounts = countBy(products.map(categoryPath));
const topBrands = pickTop(brandCounts, 35).filter(x => x.key && x.count >= 3);
const topCategories = pickTop(categoryCounts, 25).filter(x => x.key);
const scenarios = [];

for (const { key: brand, count } of topBrands) {
  const brandProducts = products.filter(p => brandMatches(brandName(p), brand));
  const dominantCategory = pickTop(countBy(brandProducts.map(categoryPath)), 1)[0]?.key;
  const queryLeaf = dominantCategory ? leafCategory(dominantCategory) : '상품';
  scenarios.push({
    scenario: 'brand_relevance',
    brand,
    source_count: count,
    request: { query: `${brand} ${queryLeaf} 추천`, brand, limit: 5, customer_profile: { style_preference: ['데일리'], purchase_context: '브랜드 우선 추천' } }
  });
}

for (const { key: category } of topCategories) {
  const catProducts = products.filter(p => categoryPath(p) === category);
  const prices = catProducts.map(finalPrice).filter(v => Number.isFinite(v));
  const p60 = percentile(prices, 60);
  if (!p60) continue;
  const budget = Math.ceil(p60 / 1000) * 1000;
  scenarios.push({
    scenario: 'price_budget_fit',
    category,
    budget,
    request: { query: `${leafCategory(category)} ${Math.round(budget / 10000)}만원 이하 추천`, category, budget, limit: 5, customer_profile: { style_preference: ['실용적'], purchase_context: '예산 우선 추천' } }
  });
}

for (const { key: category } of topCategories.slice(0, 25)) {
  const catProducts = products.filter(p => categoryPath(p) === category && reviewCount(p) > 0);
  if (catProducts.length < 5) continue;
  const medReview = median(catProducts.map(reviewCount));
  scenarios.push({
    scenario: 'review_trust_signal',
    category,
    median_review_count: medReview,
    request: { query: `${leafCategory(category)} 리뷰 많은 상품 추천`, category, limit: 5, customer_profile: { style_preference: ['검증된 상품'], purchase_context: '리뷰 신뢰 우선 추천' } }
  });
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
  for (const rec of recs) {
    if (!rec.score_breakdown) failures.push(`missing_score_breakdown:${rec.product_id}`);
    if (!rec.score_breakdown?.explanation) failures.push(`missing_score_explanation:${rec.product_id}`);
    if (!rec.why_recommended) failures.push(`missing_reason:${rec.product_id}`);
    if (!rec.decision_badges) failures.push(`missing_decision_badges:${rec.product_id}`);
  }
  const totals = recs.map(r => r.score_breakdown?.total).filter(v => Number.isFinite(v));
  if (totals.some((v, i) => i > 0 && v > totals[i - 1] + 0.001)) failures.push('score_total_not_descending');

  if (s.scenario === 'brand_relevance') {
    const mismatches = recs.filter(r => !brandMatches(brandName(r), s.brand));
    if (mismatches.length) failures.push(`brand_mismatch:${mismatches.map(r => r.product_id).join(',')}`);
    const top = recs[0];
    if (top && top.score_breakdown.intent_match <= 0) failures.push('top_missing_intent_match');
  }
  if (s.scenario === 'price_budget_fit') {
    const over = recs.filter(r => finalPrice(r) > s.budget);
    if (over.length) failures.push(`price_over_budget:${over.map(r => r.product_id).join(',')}`);
    const top = recs[0];
    if (top && top.score_breakdown.price_fit <= 0) failures.push('top_nonpositive_price_fit');
  }
  if (s.scenario === 'review_trust_signal') {
    const top = recs[0];
    if (top && top.score_breakdown.review_trust <= 0) failures.push('top_nonpositive_review_trust');
    if (top && reviewCount(top) < Math.max(1, Math.floor((s.median_review_count ?? 0) * 0.5))) failures.push(`top_review_count_weak:${reviewCount(top)}/${s.median_review_count}`);
  }
  return [...new Set(failures)];
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
    const validationFailures = status === 200 && payload ? validateScenario(s, payload) : ['http_or_json_failure'];
    const recs = payload?.recommendations ?? [];
    records.push({
      index: index + 1,
      scenario: s.scenario,
      request: s.request,
      status,
      latency_ms: latencyMs,
      recommendation_count: recs.length,
      top_recommendation: recs[0] ? {
        product_id: recs[0].product_id,
        name_ko: recs[0].name_ko,
        brand: brandName(recs[0]),
        category: categoryPath(recs[0]),
        final_price: finalPrice(recs[0]),
        review_count: reviewCount(recs[0]),
        satisfaction_score: satisfaction(recs[0]),
        score: recs[0].score,
        score_breakdown: recs[0].score_breakdown
      } : null,
      validation_failures: error ? [error] : validationFailures
    });
  }
} finally {
  server.kill('SIGTERM');
}

const failures = records.filter(r => r.status !== 200 || r.validation_failures.length);
const latencies = records.map(r => r.latency_ms).sort((a, b) => a - b);
const latencyPct = p => latencies.length ? latencies[Math.min(latencies.length - 1, Math.floor((p / 100) * latencies.length))] : null;
const byScenario = {};
for (const r of records) {
  byScenario[r.scenario] ??= { count: 0, pass: 0, nonempty: 0, avg_latency_ms: 0, avg_top_price_fit: 0, avg_top_review_trust: 0 };
  const stat = byScenario[r.scenario];
  stat.count += 1;
  if (!r.validation_failures.length && r.status === 200) stat.pass += 1;
  if (r.recommendation_count) stat.nonempty += 1;
  stat.avg_latency_ms += r.latency_ms;
  stat.avg_top_price_fit += r.top_recommendation?.score_breakdown?.price_fit ?? 0;
  stat.avg_top_review_trust += r.top_recommendation?.score_breakdown?.review_trust ?? 0;
}
for (const stat of Object.values(byScenario)) {
  stat.avg_latency_ms = Math.round((stat.avg_latency_ms / stat.count) * 100) / 100;
  stat.avg_top_price_fit = Math.round((stat.avg_top_price_fit / stat.count) * 100) / 100;
  stat.avg_top_review_trust = Math.round((stat.avg_top_review_trust / stat.count) * 100) / 100;
}
const report = {
  started_at: startedAt,
  completed_at: new Date().toISOString(),
  base_url: baseUrl,
  health,
  dataset: { products: products.length, distinct_brands: brandCounts.size, distinct_category_paths: categoryCounts.size },
  summary: {
    total_scenarios: records.length,
    passed: records.length - failures.length,
    failed: failures.length,
    nonempty_scenarios: records.filter(r => r.recommendation_count > 0).length,
    p50_latency_ms: latencyPct(50),
    p95_latency_ms: latencyPct(95),
    max_latency_ms: latencies.at(-1) ?? null
  },
  by_scenario: byScenario,
  failure_samples: failures.slice(0, 40),
  sample_successes: records.filter(r => !r.validation_failures.length && r.recommendation_count > 0).slice(0, 24),
  all_records: records
};
await mkdir(dirname(fileURLToPath(reportPath)), { recursive: true });
await writeFile(reportPath, JSON.stringify(report, null, 2));
const md = `# Ranking Signal Quality Test — 2026-06-25\n\n` +
`- Base URL: ${baseUrl}\n` +
`- Products loaded: ${health?.products_loaded}\n` +
`- Dataset products: ${products.length}\n` +
`- Distinct brands: ${brandCounts.size}\n` +
`- Distinct category paths: ${categoryCounts.size}\n\n` +
`## Summary\n\n| Metric | Value |\n|---|---:|\n` +
`| Total scenarios | ${report.summary.total_scenarios} |\n` +
`| Passed | ${report.summary.passed} |\n` +
`| Failed | ${report.summary.failed} |\n` +
`| Non-empty scenarios | ${report.summary.nonempty_scenarios} |\n` +
`| p50 latency ms | ${report.summary.p50_latency_ms} |\n` +
`| p95 latency ms | ${report.summary.p95_latency_ms} |\n` +
`| max latency ms | ${report.summary.max_latency_ms} |\n\n` +
`## By scenario\n\n| Scenario | Count | Pass | Non-empty | Avg top price_fit | Avg top review_trust | Avg latency ms |\n|---|---:|---:|---:|---:|---:|---:|\n` +
Object.entries(byScenario).map(([name, s]) => `| ${name} | ${s.count} | ${s.pass} | ${s.nonempty} | ${s.avg_top_price_fit} | ${s.avg_top_review_trust} | ${s.avg_latency_ms} |`).join('\n') +
`\n\n## Failure samples\n\n` +
(failures.length ? failures.slice(0, 12).map(f => `- #${f.index} ${f.scenario} / ${JSON.stringify(f.request)} => ${f.validation_failures.join(', ')}`).join('\n') : '- None') +
`\n\n## Sample successes\n\n` +
report.sample_successes.slice(0, 12).map(s => `- #${s.index} ${s.scenario}: ${JSON.stringify(s.request)} => top=${s.top_recommendation?.product_id} ${s.top_recommendation?.name_ko} / price=${s.top_recommendation?.final_price} / reviews=${s.top_recommendation?.review_count} / total=${s.top_recommendation?.score_breakdown?.total} / ${s.latency_ms}ms`).join('\n') +
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
