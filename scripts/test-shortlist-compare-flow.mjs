import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = new URL('..', import.meta.url);
const data = JSON.parse(await readFile(new URL('../data/products.crawled.json', import.meta.url), 'utf8'));
const products = data.products ?? [];
const port = Number(process.env.SHORTLIST_COMPARE_TEST_PORT ?? 8794);
const baseUrl = `http://127.0.0.1:${port}`;
const reportPath = new URL('../reports/shortlist-compare-flow-test-20260625.json', import.meta.url);
const mdReportPath = new URL('../reports/shortlist-compare-flow-test-20260625.md', import.meta.url);

function finalPrice(item) { return item.price?.final_price ?? item.price?.sale_price ?? item.final_price ?? item.price ?? null; }
function reviewCount(item) { return item.review?.total_count ?? item.review_count ?? 0; }
function categoryPath(item) { return item.category_path?.join?.(' > ') ?? item.category ?? ''; }
function compactItem(item) {
  return item ? {
    product_id: item.product_id,
    product_name: item.product_name ?? item.name_ko,
    brand: item.brand?.name_ko ?? item.brand,
    category: categoryPath(item),
    final_price: finalPrice(item),
    review_count: reviewCount(item),
    score_total: item.score_breakdown?.total,
    url: item.url ?? item.source_url
  } : null;
}

const scenarios = [
  {
    name: 'hoodie_budget_flow',
    query: '남성 차콜 후드집업 5만원 이하 추천',
    category: '아우터 > 후드 집업',
    budget: 50000,
    limit: 5,
    profile: { usual_size: 'L', fit_preference: '오버핏', style_preference: ['데일리', '스트릿'] }
  },
  {
    name: 'sneaker_review_flow',
    query: '리뷰 많은 스니커즈 추천',
    category: '신발 > 스니커즈 > 패션스니커즈화',
    limit: 5,
    profile: { style_preference: ['검증된 상품', '데일리'], purchase_context: '신발 후보 비교' }
  },
  {
    name: 'denim_price_flow',
    query: '데님 팬츠 7만원 이하 추천',
    category: '바지 > 데님 팬츠',
    budget: 70000,
    limit: 5,
    profile: { fit_preference: '와이드', style_preference: ['캐주얼', '데일리'] }
  },
  {
    name: 'bag_compare_flow',
    query: '백팩 추천',
    category: '가방 > 백팩',
    limit: 5,
    profile: { style_preference: ['실용적', '데일리'], purchase_context: '수납력 좋은 가방 비교' }
  }
];

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
async function http(method, path, payload) {
  const t0 = performance.now();
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: payload ? { 'content-type': 'application/json' } : undefined,
    body: payload ? JSON.stringify(payload) : undefined
  });
  const latencyMs = Math.round((performance.now() - t0) * 100) / 100;
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${method} ${path} failed ${res.status}: ${text}`);
  return { body, latencyMs };
}
function validateRecord(record) {
  const failures = [];
  if (!record.recommendation?.recommendations?.length) failures.push('empty_recommendations');
  if ((record.recommendation?.shortlist?.length ?? 0) < 3) failures.push('shortlist_candidates_under_3');
  if (record.saved_shortlist?.item_count !== record.expected_unique_saved) failures.push(`saved_count_mismatch:${record.saved_shortlist?.item_count}/${record.expected_unique_saved}`);
  if (record.saved_after_duplicate?.item_count !== record.expected_unique_saved) failures.push('dedupe_failed_on_duplicate_save');
  if (record.loaded_shortlist?.item_count !== record.expected_unique_saved) failures.push('loaded_count_mismatch');
  if ((record.comparison?.comparison_table?.length ?? 0) !== record.expected_unique_saved) failures.push('comparison_row_count_mismatch');
  if (!record.comparison?.best_pick) failures.push('missing_best_pick');
  if (!Array.isArray(record.comparison?.decision_notes) || record.comparison.decision_notes.length < 2) failures.push('missing_decision_notes');
  const ids = new Set(record.loaded_shortlist?.items?.map(item => String(item.product_id)) ?? []);
  for (const row of record.comparison?.comparison_table ?? []) {
    if (!ids.has(String(row.product_id))) failures.push(`comparison_unknown_product:${row.product_id}`);
    if (!row.product_name || !row.brand || !row.category || !row.url) failures.push(`comparison_missing_core_field:${row.product_id}`);
    if (!Number.isFinite(row.final_price)) failures.push(`comparison_missing_price:${row.product_id}`);
  }
  if (!record.clear_result?.cleared) failures.push('clear_not_acknowledged');
  if (record.after_clear?.item_count !== 0) failures.push('shortlist_not_empty_after_clear');
  return [...new Set(failures)];
}

const startedAt = new Date().toISOString();
const records = [];
let health;
try {
  health = await waitForHealth();
  for (const [index, s] of scenarios.entries()) {
    const sessionId = `shortlist-compare-${Date.now()}-${index}`;
    const latencies = {};
    let error = null;
    let recommendation, saved, savedAgain, loaded, comparison, clearResult, afterClear;
    try {
      const recommendPayload = { query: s.query, category: s.category, budget: s.budget, limit: s.limit, customer_profile: s.profile };
      const r1 = await http('POST', '/shopper/recommend', recommendPayload);
      recommendation = r1.body; latencies.recommend_ms = r1.latencyMs;
      const ids = recommendation.shortlist.slice(0, 3).map(item => item.product_id);
      const savePayload = { session_id: sessionId, items: recommendation.shortlist.slice(0, 3) };
      const r2 = await http('POST', '/shopper/shortlist', savePayload);
      saved = r2.body; latencies.save_ms = r2.latencyMs;
      const duplicatePayload = { session_id: sessionId, product_ids: [ids[0], ids[1], ids[0]] };
      const r3 = await http('POST', '/shopper/shortlist', duplicatePayload);
      savedAgain = r3.body; latencies.dedupe_save_ms = r3.latencyMs;
      const r4 = await http('GET', `/shopper/shortlist/${encodeURIComponent(sessionId)}`);
      loaded = r4.body; latencies.get_ms = r4.latencyMs;
      const compareIds = loaded.items.map(item => item.product_id);
      const r5 = await http('POST', '/shopper/compare', { product_ids: compareIds, criteria: ['price', 'review_count', 'fit_signal', 'risk_count'] });
      comparison = r5.body; latencies.compare_ms = r5.latencyMs;
      const r6 = await http('DELETE', `/shopper/shortlist/${encodeURIComponent(sessionId)}`);
      clearResult = r6.body; latencies.clear_ms = r6.latencyMs;
      const r7 = await http('GET', `/shopper/shortlist/${encodeURIComponent(sessionId)}`);
      afterClear = r7.body; latencies.after_clear_get_ms = r7.latencyMs;
    } catch (err) { error = err.message; }
    const expectedUnique = new Set(saved?.items?.map(item => String(item.product_id)) ?? []).size;
    const record = {
      index: index + 1,
      scenario: s.name,
      session_id: sessionId,
      request: { query: s.query, category: s.category, budget: s.budget, limit: s.limit },
      expected_unique_saved: expectedUnique,
      latencies,
      recommendation: recommendation ? {
        assistant_summary: recommendation.assistant_summary,
        recommendation_confidence: recommendation.recommendation_confidence,
        shortlist: recommendation.shortlist.map(compactItem),
        recommendations: recommendation.recommendations.map(compactItem)
      } : null,
      saved_shortlist: saved ? { session_id: saved.session_id, item_count: saved.item_count, items: saved.items.map(compactItem) } : null,
      saved_after_duplicate: savedAgain ? { session_id: savedAgain.session_id, item_count: savedAgain.item_count, items: savedAgain.items.map(compactItem) } : null,
      loaded_shortlist: loaded ? { session_id: loaded.session_id, item_count: loaded.item_count, items: loaded.items.map(compactItem) } : null,
      comparison: comparison ? {
        comparison_table: comparison.comparison_table,
        best_pick: comparison.best_pick,
        decision_notes: comparison.decision_notes
      } : null,
      clear_result: clearResult,
      after_clear: afterClear,
      error
    };
    record.validation_failures = error ? [error] : validateRecord(record);
    records.push(record);
  }
} finally {
  server.kill('SIGTERM');
}

const failures = records.filter(r => r.validation_failures.length);
const allLatencies = records.flatMap(r => Object.values(r.latencies));
const sortedLatencies = [...allLatencies].sort((a, b) => a - b);
const pct = p => sortedLatencies.length ? sortedLatencies[Math.min(sortedLatencies.length - 1, Math.floor((p / 100) * sortedLatencies.length))] : null;
const report = {
  started_at: startedAt,
  completed_at: new Date().toISOString(),
  base_url: baseUrl,
  health,
  dataset: { products: products.length },
  summary: {
    total_flows: records.length,
    passed: records.length - failures.length,
    failed: failures.length,
    total_endpoint_calls: records.reduce((sum, r) => sum + Object.keys(r.latencies).length, 0),
    p50_endpoint_latency_ms: pct(50),
    p95_endpoint_latency_ms: pct(95),
    max_endpoint_latency_ms: sortedLatencies.at(-1) ?? null
  },
  failure_samples: failures,
  sample_successes: records.filter(r => !r.validation_failures.length).map(r => ({
    scenario: r.scenario,
    saved_count: r.saved_shortlist?.item_count,
    best_pick: r.comparison?.best_pick?.product_name,
    decision_notes: r.comparison?.decision_notes,
    latencies: r.latencies
  })),
  all_records: records
};

await mkdir(dirname(fileURLToPath(reportPath)), { recursive: true });
await writeFile(reportPath, JSON.stringify(report, null, 2));
const md = `# Shortlist / Compare Flow Test — 2026-06-25\n\n` +
`- Base URL: ${baseUrl}\n` +
`- Products loaded: ${health?.products_loaded}\n` +
`- Dataset products: ${products.length}\n\n` +
`## Summary\n\n| Metric | Value |\n|---|---:|\n` +
`| Total flows | ${report.summary.total_flows} |\n` +
`| Passed | ${report.summary.passed} |\n` +
`| Failed | ${report.summary.failed} |\n` +
`| Endpoint calls | ${report.summary.total_endpoint_calls} |\n` +
`| p50 endpoint latency ms | ${report.summary.p50_endpoint_latency_ms} |\n` +
`| p95 endpoint latency ms | ${report.summary.p95_endpoint_latency_ms} |\n` +
`| max endpoint latency ms | ${report.summary.max_endpoint_latency_ms} |\n\n` +
`## Failure samples\n\n` +
(failures.length ? failures.map(f => `- ${f.scenario}: ${f.validation_failures.join(', ')}`).join('\n') : '- None') +
`\n\n## Sample successes\n\n` +
report.sample_successes.map(s => `- ${s.scenario}: saved=${s.saved_count}, best_pick=${s.best_pick}, notes=${s.decision_notes?.join(' / ')}`).join('\n') +
`\n`;
await writeFile(mdReportPath, md);
console.log(JSON.stringify({
  ok: failures.length === 0,
  report: fileURLToPath(reportPath),
  markdown_report: fileURLToPath(mdReportPath),
  summary: report.summary,
  failure_count: failures.length,
  server_output: serverOutput.trim().split('\n').slice(-3)
}, null, 2));
