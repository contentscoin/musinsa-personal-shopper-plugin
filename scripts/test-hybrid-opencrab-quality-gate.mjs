import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('..', import.meta.url);
const rootPath = fileURLToPath(root);
const bridgePort = Number(process.env.HYBRID_GATE_BRIDGE_PORT ?? 8794);
const pluginPort = Number(process.env.HYBRID_GATE_PLUGIN_PORT ?? 8795);
const bridgeUrl = `http://127.0.0.1:${bridgePort}`;
const pluginUrl = `http://127.0.0.1:${pluginPort}`;
const reportJson = new URL('../reports/hybrid-opencrab-quality-gate-20260625.json', import.meta.url);
const reportMd = new URL('../reports/hybrid-opencrab-quality-gate-20260625.md', import.meta.url);

const queryGroups = [
  {
    family: 'relaxed_fit_175_88',
    expectedSource: 'relaxed fit 175 88',
    queries: [
      '175cm 88kg 릴렉스핏', '175 88 여유핏 남자 코디', '부드럽고 안 끼는 남성 여유핏', 'relaxed fit men soft outfit',
      '175cm 88kg 오버핏 티셔츠', '남성 여유핏 코디 10만원 이하', '편한 와이드 팬츠 오버핏 상의', '175 88 루즈핏 후드집업',
      '175cm 88kg 원턱 와이드 팬츠', 'soft non-tight outfit men', '릴렉스핏 남성 와이드 팬츠', '오버핏 스트라이프 롱슬리브'
    ]
  },
  {
    family: 'office_shirt',
    expectedSource: 'office shirt',
    queries: [
      '셔츠 출근룩', '남성 셔츠 출근룩', 'office shirt relaxed', 'work shirt men',
      '오버핏 셔츠 블랙', '체크 셔츠 출근룩', '반팔 셔츠 차콜', '옥스포드 반소매 셔츠',
      '빈티지 오버핏 긴팔 체크 셔츠', '남성 포플린 셔츠', '여름 체크 남방', '시어서커 체크 반팔 셔츠'
    ]
  },
  {
    family: 'summer_tee',
    expectedSource: 'summer tee',
    queries: [
      '여름 반팔', '남성 반소매 티셔츠', 'summer tee affordable', '저렴한 반팔 티셔츠',
      '헤비코튼 반팔티', '레이어드 크루 넥 티셔츠', '피그먼트 반팔 티셔츠', '반소매 티셔츠 2만원 이하',
      '화이트 반팔티', '블랙 반소매티', '세미 크롭 반팔티', '남자 여름 티셔츠 추천'
    ]
  },
  {
    family: 'mixed_personal_shopper',
    expectedSource: 'MUSINSA',
    queries: [
      '오버핏 셔츠 175cm 88kg 릴렉스핏', '175 88 셔츠 출근룩', '여름 반팔 175cm 88kg', '남성 오버핏 셔츠 여름',
      '릴렉스핏 셔츠 코디', '남자 여름 출근룩 셔츠', '부드러운 반팔 티셔츠 여유핏', '10만원 이하 남자 셔츠 팬츠 코디',
      '여유핏 블랙 셔츠', '와이드 팬츠랑 입을 셔츠', '출근룩 반팔 셔츠', '편한 여름 남자 코디'
    ]
  },
  {
    family: 'provenance_stress',
    expectedSource: 'MUSINSA',
    queries: [
      'product_id source_url 셔츠', '무신사 원본 링크 셔츠 추천', 'MUSINSA office shirt source_url', 'MUSINSA relaxed fit product_id',
      '원본 링크 있는 반팔 추천', '상품 링크 포함 여름 티셔츠', '출처 있는 남성 셔츠', 'OpenCrab 셔츠 후보',
      '온톨로지팩 릴렉스핏 후보', 'source_url relaxed fit men', 'product_id summer tee', 'OpenCrab 여름 반팔 후보'
    ]
  }
];
const cases = queryGroups.flatMap(group => group.queries.map(query => ({ family: group.family, query, expectedSource: group.expectedSource })));

const bridge = spawn(process.execPath, ['scripts/opencrab-retrieval-bridge.mjs'], {
  cwd: rootPath,
  env: { ...process.env, PORT: String(bridgePort) },
  stdio: ['ignore', 'pipe', 'pipe']
});
const plugin = spawn(process.execPath, ['src/server.mjs'], {
  cwd: rootPath,
  env: {
    ...process.env,
    PORT: String(pluginPort),
    OPENCRAB_RETRIEVAL_URL: `${bridgeUrl}/retrieve`,
    OPENCRAB_RETRIEVAL_TIMEOUT_MS: '4000',
    OPENCRAB_RETRIEVAL_CACHE_PATH: ''
  },
  stdio: ['ignore', 'pipe', 'pipe']
});
let logs = '';
for (const child of [bridge, plugin]) {
  child.stdout.on('data', d => logs += d.toString());
  child.stderr.on('data', d => logs += d.toString());
}

async function waitReady(url) {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error(`not ready: ${url}\n${logs}`);
}
async function search(query, mode) {
  const started = performance.now();
  const res = await fetch(`${pluginUrl}/products/search`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, retrieval_mode: mode, limit: 5 })
  });
  const latency = Math.round((performance.now() - started) * 100) / 100;
  const body = await res.json();
  return { status: res.status, latency_ms: latency, body };
}
function ids(response) {
  return response.body.results?.map(r => String(r.product_id)) ?? [];
}
function overlap(a, b) {
  const bset = new Set(b);
  return a.filter(x => bset.has(x));
}
function passHybrid(hybrid) {
  const adapter = hybrid.body.retrieval?.opencrab_adapter ?? {};
  const rows = adapter.candidate_rows ?? [];
  const failures = [];
  if (hybrid.status !== 200) failures.push('hybrid_http_failure');
  if (adapter.source !== 'opencrab_http') failures.push(`adapter_source_${adapter.source}`);
  if (!adapter.product_id_count) failures.push('no_opencrab_product_ids');
  if (!adapter.evidence_count) failures.push('no_evidence_count');
  if (!rows.length) failures.push('no_candidate_rows');
  if (rows.some(row => !row.product_id || !row.source_url || !row.source)) failures.push('candidate_row_missing_provenance');
  if (!hybrid.body.results?.length) failures.push('no_hybrid_results_after_rerank');
  return failures;
}

const startedAt = new Date().toISOString();
let bridgeHealth, pluginHealth;
const records = [];
try {
  bridgeHealth = await waitReady(`${bridgeUrl}/health`);
  pluginHealth = await waitReady(`${pluginUrl}/health`);
  for (const [index, testCase] of cases.entries()) {
    const local = await search(testCase.query, 'local_index');
    const hybrid = await search(testCase.query, 'hybrid');
    const localIds = ids(local);
    const hybridIds = ids(hybrid);
    const adapter = hybrid.body.retrieval?.opencrab_adapter ?? {};
    const failures = [];
    if (local.status !== 200) failures.push('local_http_failure');
    failures.push(...passHybrid(hybrid));
    records.push({
      index: index + 1,
      family: testCase.family,
      query: testCase.query,
      local: {
        status: local.status,
        latency_ms: local.latency_ms,
        result_ids: localIds,
        result_count: localIds.length,
        candidate_source: local.body.retrieval?.candidate_source
      },
      hybrid: {
        status: hybrid.status,
        latency_ms: hybrid.latency_ms,
        result_ids: hybridIds,
        result_count: hybridIds.length,
        candidate_source: hybrid.body.retrieval?.candidate_source,
        adapter_source: adapter.source,
        product_id_count: adapter.product_id_count,
        evidence_count: adapter.evidence_count,
        source_titles: adapter.source_titles,
        candidate_rows_count: adapter.candidate_rows?.length ?? 0,
        sample_candidate_rows: adapter.candidate_rows?.slice(0, 3) ?? []
      },
      overlap: {
        ids: overlap(localIds, hybridIds),
        count: overlap(localIds, hybridIds).length
      },
      validation_failures: [...new Set(failures)]
    });
  }
} finally {
  plugin.kill('SIGTERM');
  bridge.kill('SIGTERM');
}

const failures = records.filter(r => r.validation_failures.length);
const localLatencies = records.map(r => r.local.latency_ms).sort((a, b) => a - b);
const hybridLatencies = records.map(r => r.hybrid.latency_ms).sort((a, b) => a - b);
const pct = (arr, p) => arr.length ? arr[Math.min(arr.length - 1, Math.floor((p / 100) * arr.length))] : null;
const byFamily = {};
for (const r of records) {
  const f = byFamily[r.family] ??= { count: 0, pass: 0, local_nonempty: 0, hybrid_nonempty: 0, avg_overlap: 0, avg_hybrid_candidates: 0 };
  f.count += 1;
  if (!r.validation_failures.length) f.pass += 1;
  if (r.local.result_count) f.local_nonempty += 1;
  if (r.hybrid.result_count) f.hybrid_nonempty += 1;
  f.avg_overlap += r.overlap.count;
  f.avg_hybrid_candidates += r.hybrid.product_id_count ?? 0;
}
for (const f of Object.values(byFamily)) {
  f.avg_overlap = Number((f.avg_overlap / f.count).toFixed(2));
  f.avg_hybrid_candidates = Number((f.avg_hybrid_candidates / f.count).toFixed(2));
}
const report = {
  started_at: startedAt,
  completed_at: new Date().toISOString(),
  bridge_health: bridgeHealth,
  plugin_health: pluginHealth,
  query_count: records.length,
  summary: {
    passed: records.length - failures.length,
    failed: failures.length,
    local_nonempty: records.filter(r => r.local.result_count > 0).length,
    hybrid_nonempty: records.filter(r => r.hybrid.result_count > 0).length,
    opencrab_provenance_coverage: records.filter(r => r.hybrid.candidate_rows_count > 0).length,
    avg_overlap: Number((records.reduce((sum, r) => sum + r.overlap.count, 0) / records.length).toFixed(2)),
    local_latency_ms: { p50: pct(localLatencies, 50), p95: pct(localLatencies, 95), max: localLatencies.at(-1) },
    hybrid_latency_ms: { p50: pct(hybridLatencies, 50), p95: pct(hybridLatencies, 95), max: hybridLatencies.at(-1) }
  },
  by_family: byFamily,
  failure_samples: failures.slice(0, 20),
  sample_records: records.slice(0, 10),
  records
};

await mkdir(dirname(fileURLToPath(reportJson)), { recursive: true });
await writeFile(reportJson, JSON.stringify(report, null, 2));
const md = `# Hybrid OpenCrab Quality Gate — 2026-06-25\n\n` +
`## Summary\n\n` +
`| Metric | Value |\n|---|---:|\n` +
`| Queries | ${report.query_count} |\n` +
`| Passed | ${report.summary.passed} |\n` +
`| Failed | ${report.summary.failed} |\n` +
`| Local non-empty | ${report.summary.local_nonempty} |\n` +
`| Hybrid non-empty | ${report.summary.hybrid_nonempty} |\n` +
`| OpenCrab provenance coverage | ${report.summary.opencrab_provenance_coverage} |\n` +
`| Avg overlap | ${report.summary.avg_overlap} |\n` +
`| Local p50/p95/max ms | ${report.summary.local_latency_ms.p50} / ${report.summary.local_latency_ms.p95} / ${report.summary.local_latency_ms.max} |\n` +
`| Hybrid p50/p95/max ms | ${report.summary.hybrid_latency_ms.p50} / ${report.summary.hybrid_latency_ms.p95} / ${report.summary.hybrid_latency_ms.max} |\n\n` +
`## By family\n\n| Family | Count | Pass | Local non-empty | Hybrid non-empty | Avg overlap | Avg hybrid candidates |\n|---|---:|---:|---:|---:|---:|---:|\n` +
Object.entries(byFamily).map(([family, s]) => `| ${family} | ${s.count} | ${s.pass} | ${s.local_nonempty} | ${s.hybrid_nonempty} | ${s.avg_overlap} | ${s.avg_hybrid_candidates} |`).join('\n') +
`\n\n## Sample local vs hybrid records\n\n` +
records.slice(0, 12).map(r => `- #${r.index} **${r.family}** \`${r.query}\`\n  - local: ${r.local.result_ids.join(', ') || '-'}\n  - hybrid: ${r.hybrid.result_ids.join(', ') || '-'}\n  - sources: ${(r.hybrid.source_titles ?? []).join(' / ') || '-'}\n  - provenance rows: ${r.hybrid.candidate_rows_count}, overlap: ${r.overlap.count}, failures: ${r.validation_failures.join(', ') || 'none'}`).join('\n') +
`\n\n## Failure samples\n\n` +
(failures.length ? failures.slice(0, 10).map(r => `- #${r.index} ${r.family} ${r.query}: ${r.validation_failures.join(', ')}`).join('\n') : '- None') +
`\n\n## Notes\n\nThis gate uses the repo-level OpenCrab retrieval bridge in verified fixture mode. The fixture was captured from a real OpenCrab MCP project_run payload for the paperclipbase MUSINSA product ontology pack. A future live upstream can be supplied via OPENCRAB_BRIDGE_UPSTREAM_URL.\n`;
await writeFile(reportMd, md);
console.log(JSON.stringify({
  ok: failures.length === 0,
  json_report: fileURLToPath(reportJson),
  markdown_report: fileURLToPath(reportMd),
  summary: report.summary,
  by_family: byFamily,
  failure_count: failures.length
}, null, 2));
