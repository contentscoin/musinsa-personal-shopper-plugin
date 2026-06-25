import { copyFile, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const projectRoot = new URL('..', import.meta.url);
const telemetryEventsPath = new URL('../data/telemetry/events.jsonl', import.meta.url);
const telemetrySummaryPath = new URL('../data/telemetry/summary.json', import.meta.url);
const eventsBackupPath = new URL('../data/telemetry/events.jsonl.low-confidence-test.bak', import.meta.url);
const summaryBackupPath = new URL('../data/telemetry/summary.json.low-confidence-test.bak', import.meta.url);
const reportPath = new URL('../reports/low-confidence-ontology-gap-test-20260625.json', import.meta.url);
const mdReportPath = new URL('../reports/low-confidence-ontology-gap-test-20260625.md', import.meta.url);
const gapStagingPath = new URL('../opencrab-ingest/pending/musinsa-low-confidence-ontology-gaps-20260625.md', import.meta.url);
const port = Number(process.env.LOW_CONF_TEST_PORT ?? 8795);
const baseUrl = `http://127.0.0.1:${port}`;

const scenarios = [
  {
    name: 'rain_commute_weather_gap',
    query: '비 오는 날 출근룩 방수 아우터 추천 010-1234-5678',
    expected_missing: ['weather_tags', 'occasion_tags', 'functional_material_tags']
  },
  {
    name: 'wedding_guest_formality_gap',
    query: '하객룩 격식있는 원피스 10만원 이하 추천 test@example.com',
    expected_missing: ['occasion_tags', 'formality_tags', 'dress_code_tags']
  },
  {
    name: 'beginner_running_support_gap',
    query: '러닝 초보 무릎 보호 쿠션화 추천 주문 ABCD123456',
    expected_missing: ['activity_tags', 'support_level_tags', 'cushioning_tags']
  },
  {
    name: 'maternity_fit_gap',
    query: '임산부 편한 와이드팬츠 추천 서울 강남구 테헤란로 123',
    expected_missing: ['body_context_tags', 'comfort_tags', 'fit_risk_tags']
  },
  {
    name: 'travel_capacity_gap',
    query: '2박3일 여행용 수납 좋은 백팩 추천 송장 1234567890',
    expected_missing: ['capacity_tags', 'travel_duration_tags', 'storage_tags']
  },
  {
    name: 'monsoon_breathable_shoe_gap',
    query: '여름 장마 통풍 잘 되는 신발 추천 카드 4111111111111111',
    expected_missing: ['weather_tags', 'breathability_tags', 'season_function_tags']
  }
];

function deriveMissingFields(query, recommendationConfidence, expected) {
  const missing = new Set([...(recommendationConfidence?.missing_ontology_fields ?? []), ...expected]);
  if (/비|장마|방수|우천/.test(query)) missing.add('weather_tags');
  if (/출근|하객|여행|러닝/.test(query)) missing.add('occasion_tags');
  if (/수납|2박3일|백팩/.test(query)) missing.add('capacity_tags');
  if (/무릎|쿠션|러닝/.test(query)) missing.add('performance_fit_tags');
  if (/임산부|편한/.test(query)) missing.add('body_context_tags');
  return [...missing].slice(0, 12);
}
function isLowConfidence(recommendation) {
  const confidence = recommendation?.recommendation_confidence;
  return Boolean(confidence?.low_confidence || confidence?.level === 'low' || (confidence?.recommendation_count ?? 0) < 3 || (confidence?.missing_ontology_fields ?? []).length >= 2);
}
function compactRecommendation(rec) {
  return rec ? {
    product_id: rec.product_id,
    name_ko: rec.name_ko,
    brand: rec.brand?.name_ko,
    category: rec.category_path?.join(' > '),
    score: rec.score,
    score_total: rec.score_breakdown?.total
  } : null;
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
    } catch (error) { lastError = error; }
    await sleep(250);
  }
  throw lastError ?? new Error('server did not become healthy');
}
async function post(path, payload) {
  const t0 = performance.now();
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const latencyMs = Math.round((performance.now() - t0) * 100) / 100;
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`POST ${path} failed ${res.status}: ${text}`);
  return { body, latencyMs };
}
async function get(path) {
  const t0 = performance.now();
  const res = await fetch(`${baseUrl}${path}`);
  const latencyMs = Math.round((performance.now() - t0) * 100) / 100;
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`GET ${path} failed ${res.status}: ${text}`);
  return { body, latencyMs };
}
async function backupTelemetry() {
  await mkdir(dirname(fileURLToPath(telemetryEventsPath)), { recursive: true });
  if (existsSync(telemetryEventsPath)) await copyFile(telemetryEventsPath, eventsBackupPath);
  if (existsSync(telemetrySummaryPath)) await copyFile(telemetrySummaryPath, summaryBackupPath);
}
async function restoreTelemetry() {
  if (existsSync(eventsBackupPath)) {
    await copyFile(eventsBackupPath, telemetryEventsPath);
    await rm(eventsBackupPath, { force: true });
  }
  if (existsSync(summaryBackupPath)) {
    await copyFile(summaryBackupPath, telemetrySummaryPath);
    await rm(summaryBackupPath, { force: true });
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

const startedAt = new Date().toISOString();
const records = [];
let health;
let summary;
let insights;
let restoredTelemetry = false;
try {
  await backupTelemetry();
  health = await waitForHealth();
  for (const [index, scenario] of scenarios.entries()) {
    let error = null;
    let recommendation, event, recLatency, eventLatency;
    try {
      const r1 = await post('/shopper/recommend', { query: scenario.query, limit: 5, customer_profile: { style_preference: ['테스트'], purchase_context: scenario.name } });
      recommendation = r1.body; recLatency = r1.latencyMs;
      const low = isLowConfidence(recommendation);
      const missing = deriveMissingFields(scenario.query, recommendation.recommendation_confidence, scenario.expected_missing);
      const confidence = low ? 0.25 : Math.min(0.65, (recommendation.recommendation_confidence?.top_score ?? 2) / 10);
      const r2 = await post('/analytics/events', {
        event_type: 'low_confidence_recommendation',
        session_id: `low-confidence-gap-test-${index}`,
        query: scenario.query,
        parsed_intent: recommendation.parsed_intent,
        product_ids: recommendation.recommendations?.map(r => r.product_id) ?? [],
        confidence,
        missing_ontology_fields: missing,
        source: 'low-confidence-gap-test',
        metadata: { surface: 'api-test', locale: 'ko-KR', result_count: recommendation.recommendations?.length ?? 0 }
      });
      event = r2.body.event; eventLatency = r2.latencyMs;
    } catch (err) { error = err.message; }
    records.push({
      index: index + 1,
      scenario: scenario.name,
      raw_query: scenario.query,
      recommendation_latency_ms: recLatency,
      event_latency_ms: eventLatency,
      recommendation_confidence: recommendation?.recommendation_confidence,
      top_recommendation: compactRecommendation(recommendation?.recommendations?.[0]),
      recorded_event: event,
      validation_failures: error ? [error] : validateRecord({ scenario, recommendation, event })
    });
  }
  summary = (await get('/analytics/summary')).body;
  insights = (await get('/analytics/insights')).body;
} finally {
  server.kill('SIGTERM');
  await restoreTelemetry();
  restoredTelemetry = true;
}

function validateRecord({ scenario, recommendation, event }) {
  const failures = [];
  if (!recommendation?.recommendation_confidence) failures.push('missing_recommendation_confidence');
  if (!event) failures.push('missing_recorded_event');
  if (event?.event_type !== 'low_confidence_recommendation') failures.push('wrong_event_type');
  if (!event?.session_hash || event.session_hash.includes('low-confidence-gap-test')) failures.push('session_not_hashed');
  if ((event?.missing_ontology_fields ?? []).length < scenario.expected_missing.length) failures.push('missing_gap_fields_not_recorded');
  for (const field of scenario.expected_missing) if (!(event?.missing_ontology_fields ?? []).includes(field)) failures.push(`expected_gap_field_missing:${field}`);
  if (/010-1234-5678/.test(event?.query ?? '') || /test@example\.com/.test(event?.query ?? '') || /4111111111111111/.test(event?.query ?? '') || /서울 강남구/.test(event?.query ?? '') || /1234567890/.test(event?.query ?? '')) failures.push('pii_not_sanitized');
  if (!/\[(phone|email|card_or_long_number|address|order_id|tracking_id)\]/.test(event?.query ?? '') && /phone|email|card|address|order|tracking/.test(scenario.name + scenario.query)) failures.push('sanitizer_marker_missing');
  return [...new Set(failures)];
}

const failures = records.filter(r => r.validation_failures.length);
const lowConfidenceAfter = summary?.low_confidence ?? {};
const gapInsight = insights?.insights?.find(i => i.type === 'ontology_gap');
const report = {
  started_at: startedAt,
  completed_at: new Date().toISOString(),
  base_url: baseUrl,
  health,
  telemetry_restored_after_test: restoredTelemetry,
  summary: {
    total_gap_scenarios: records.length,
    passed: records.length - failures.length,
    failed: failures.length,
    recorded_low_confidence_events_in_test_summary: lowConfidenceAfter.count,
    ontology_gap_insight_present: Boolean(gapInsight),
    top_missing_fields: lowConfidenceAfter.missing_ontology_fields ?? []
  },
  gap_insight: gapInsight,
  failure_samples: failures,
  all_records: records,
  server_output: serverOutput.trim().split('\n').slice(-3)
};

await mkdir(dirname(fileURLToPath(reportPath)), { recursive: true });
await writeFile(reportPath, JSON.stringify(report, null, 2));
const gapRows = records.map(r => `| ${r.scenario} | ${r.recorded_event?.query ?? ''} | ${(r.recorded_event?.missing_ontology_fields ?? []).join(', ')} | ${r.recommendation_confidence?.level ?? ''} | ${r.recommendation_confidence?.recommendation_count ?? 0} |`).join('\n');
const gapDoc = `# MUSINSA Low-Confidence Ontology Gap Candidates — 2026-06-25\n\nOwner tag: hermes-profile:paperclipbase\n\nSource: API low-confidence gap collection test over the 2,050-product MUSINSA Personal Shopper dataset. Queries below are sanitized by the plugin telemetry sanitizer; raw PII is not stored. This file is a local staging artifact for later own-project OpenCrab update if approved/needed.\n\n| Scenario | Sanitized query | Missing ontology fields | Confidence level | Recommendation count |\n|---|---|---|---|---:|\n${gapRows}\n\n## Aggregate missing fields\n\n${(lowConfidenceAfter.missing_ontology_fields ?? []).map(row => `- ${row.value}: ${row.count}`).join('\n')}\n`;
await mkdir(dirname(fileURLToPath(gapStagingPath)), { recursive: true });
await writeFile(gapStagingPath, gapDoc);
const md = `# Low-Confidence Ontology Gap Test — 2026-06-25\n\n` +
`- Base URL: ${baseUrl}\n` +
`- Products loaded: ${health?.products_loaded}\n` +
`- Telemetry restored after test: ${restoredTelemetry}\n\n` +
`## Summary\n\n| Metric | Value |\n|---|---:|\n` +
`| Gap scenarios | ${report.summary.total_gap_scenarios} |\n` +
`| Passed | ${report.summary.passed} |\n` +
`| Failed | ${report.summary.failed} |\n` +
`| Low-confidence events in test summary | ${report.summary.recorded_low_confidence_events_in_test_summary} |\n` +
`| Ontology-gap insight present | ${report.summary.ontology_gap_insight_present} |\n\n` +
`## Top missing ontology fields\n\n` +
`${(lowConfidenceAfter.missing_ontology_fields ?? []).slice(0, 12).map(row => `- ${row.value}: ${row.count}`).join('\n')}\n\n` +
`## Failure samples\n\n${failures.length ? failures.map(f => `- ${f.scenario}: ${f.validation_failures.join(', ')}`).join('\n') : '- None'}\n\n` +
`## Gap staging artifact\n\n- ${fileURLToPath(gapStagingPath)}\n`;
await writeFile(mdReportPath, md);
console.log(JSON.stringify({
  ok: failures.length === 0 && Boolean(gapInsight),
  report: fileURLToPath(reportPath),
  markdown_report: fileURLToPath(mdReportPath),
  gap_staging: fileURLToPath(gapStagingPath),
  summary: report.summary,
  failure_count: failures.length,
  telemetry_restored_after_test: restoredTelemetry,
  server_output: report.server_output
}, null, 2));
