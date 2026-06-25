import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = new URL('..', import.meta.url);
const port = Number(process.env.MANIFEST_OPENAPI_TEST_PORT ?? 8787);
const baseUrl = `http://127.0.0.1:${port}`;
const publicBaseUrl = `http://localhost:${port}`;
const reportPath = new URL('../reports/openapi-manifest-connection-test-20260625.json', import.meta.url);
const mdReportPath = new URL('../reports/openapi-manifest-connection-test-20260625.md', import.meta.url);

const expectedPaths = [
  '/health',
  '/products/search',
  '/products/{productId}',
  '/products/{productId}/reviews/summary',
  '/shopper/recommend',
  '/shopper/compare',
  '/shopper/shortlist',
  '/shopper/shortlist/{sessionId}',
  '/analytics/events',
  '/analytics/summary',
  '/analytics/notice',
  '/analytics/funnel',
  '/analytics/products',
  '/analytics/queries',
  '/analytics/intents',
  '/analytics/insights',
  '/analytics/export'
];
const expectedSchemas = [
  'ProductSearchRequest',
  'CustomerProfile',
  'RecommendRequest',
  'ParsedIntent',
  'ProductCard',
  'ScoreBreakdown',
  'RecommendResponse',
  'CompareResponse',
  'SaveShortlistRequest',
  'Shortlist',
  'AnalyticsEventRequest'
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
async function request(method, path, payload) {
  const t0 = performance.now();
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: payload ? { 'content-type': 'application/json' } : undefined,
    body: payload ? JSON.stringify(payload) : undefined
  });
  const latencyMs = Math.round((performance.now() - t0) * 100) / 100;
  const text = await res.text();
  const contentType = res.headers.get('content-type') ?? '';
  let body = text;
  if (contentType.includes('json') && text) body = JSON.parse(text);
  return { status: res.status, ok: res.ok, content_type: contentType, body, text, latency_ms: latencyMs };
}
async function waitForHealth() {
  const started = Date.now();
  let last;
  while (Date.now() - started < 15000) {
    try {
      const res = await request('GET', '/health');
      if (res.ok) return res;
      last = new Error(`health ${res.status}`);
    } catch (error) { last = error; }
    await sleep(250);
  }
  throw last ?? new Error('server did not become healthy');
}
function extractPathBlocks(openapiText) {
  const paths = [];
  const lines = openapiText.split('\n');
  let inPaths = false;
  for (const line of lines) {
    if (line.startsWith('paths:')) { inPaths = true; continue; }
    if (line.startsWith('components:')) break;
    if (inPaths) {
      const match = line.match(/^  (\/[^{\s][^:]*|\/[^:]+):\s*$/);
      if (match) paths.push(match[1]);
    }
  }
  return paths;
}
function extractSchemas(openapiText) {
  const schemas = [];
  const lines = openapiText.split('\n');
  let inSchemas = false;
  for (const line of lines) {
    if (line.match(/^  schemas:\s*$/)) { inSchemas = true; continue; }
    if (inSchemas) {
      const match = line.match(/^    ([A-Za-z0-9_]+):\s*$/);
      if (match) schemas.push(match[1]);
    }
  }
  return schemas;
}
function extractOperationIds(openapiText) {
  return [...openapiText.matchAll(/operationId:\s*([A-Za-z0-9_]+)/g)].map(m => m[1]);
}
function extractRefs(openapiText) {
  return [...openapiText.matchAll(/\$ref:\s*['"]?#\/components\/schemas\/([A-Za-z0-9_]+)['"]?/g)].map(m => m[1]);
}
function validateManifest(manifest, openapiText, legalNotice) {
  const failures = [];
  for (const key of ['schema_version', 'name_for_human', 'name_for_model', 'description_for_human', 'description_for_model', 'auth', 'api', 'logo_url', 'contact_email', 'legal_info_url']) {
    if (manifest[key] === undefined) failures.push(`manifest_missing_${key}`);
  }
  if (manifest.schema_version !== 'v1') failures.push('manifest_schema_version_not_v1');
  if (manifest.auth?.type !== 'none') failures.push('manifest_auth_not_none');
  if (manifest.api?.type !== 'openapi') failures.push('manifest_api_type_not_openapi');
  if (manifest.api?.url !== `${publicBaseUrl}/openapi.yaml`) failures.push(`manifest_openapi_url_mismatch:${manifest.api?.url}`);
  if (manifest.legal_info_url !== `${publicBaseUrl}/analytics/notice`) failures.push(`manifest_legal_url_mismatch:${manifest.legal_info_url}`);
  if (manifest.logo_url !== `${publicBaseUrl}/logo.png`) failures.push(`manifest_logo_url_mismatch:${manifest.logo_url}`);
  if (!manifest.description_for_model?.includes('Do not send names')) failures.push('manifest_missing_privacy_instruction');
  if (!openapiText.includes('openapi: 3.1.0')) failures.push('openapi_version_missing');
  if (!legalNotice?.not_collected?.includes('raw_user_id')) failures.push('legal_notice_privacy_boundary_missing');
  return failures;
}
function validateOpenApi(openapiText) {
  const failures = [];
  const paths = extractPathBlocks(openapiText);
  const schemas = extractSchemas(openapiText);
  const operationIds = extractOperationIds(openapiText);
  const refs = extractRefs(openapiText);
  for (const p of expectedPaths) if (!paths.includes(p)) failures.push(`openapi_missing_path:${p}`);
  for (const s of expectedSchemas) if (!schemas.includes(s)) failures.push(`openapi_missing_schema:${s}`);
  const duplicateOps = operationIds.filter((op, i) => operationIds.indexOf(op) !== i);
  for (const op of new Set(duplicateOps)) failures.push(`openapi_duplicate_operationId:${op}`);
  for (const ref of refs) if (!schemas.includes(ref)) failures.push(`openapi_unresolved_ref:${ref}`);
  if (!openapiText.includes('category:') || !openapiText.includes('Optional exact category path constraint')) failures.push('recommend_request_category_constraint_missing');
  if (!openapiText.includes('low_confidence_recommendation')) failures.push('analytics_low_confidence_event_missing');
  if (!openapiText.includes('ScoreBreakdown')) failures.push('score_breakdown_schema_missing');
  return { failures, paths, schemas, operationIds, refs };
}
function validateRuntime({ health, manifestRes, openapiRes, legalRes, logoRes, recommendRes, searchRes }) {
  const failures = [];
  if (health.body?.products_loaded !== 2050) failures.push(`health_products_loaded_mismatch:${health.body?.products_loaded}`);
  if (!manifestRes.content_type.includes('application/json')) failures.push(`manifest_content_type:${manifestRes.content_type}`);
  if (!openapiRes.content_type.includes('yaml')) failures.push(`openapi_content_type:${openapiRes.content_type}`);
  if (!legalRes.content_type.includes('application/json')) failures.push(`legal_content_type:${legalRes.content_type}`);
  if (!logoRes.content_type.includes('image/png')) failures.push(`logo_content_type:${logoRes.content_type}`);
  if (!recommendRes.body?.recommendations?.length) failures.push('recommend_runtime_empty');
  if (!recommendRes.body?.recommendations?.[0]?.score_breakdown) failures.push('recommend_runtime_missing_score_breakdown');
  if (!searchRes.body?.results?.length) failures.push('search_runtime_empty');
  return failures;
}

const startedAt = new Date().toISOString();
let health, manifestRes, openapiRes, legalRes, logoRes, recommendRes, searchRes;
let error = null;
try {
  health = await waitForHealth();
  manifestRes = await request('GET', '/.well-known/ai-plugin.json');
  openapiRes = await request('GET', '/openapi.yaml');
  legalRes = await request('GET', '/analytics/notice');
  logoRes = await request('GET', '/logo.png');
  recommendRes = await request('POST', '/shopper/recommend', { query: '차콜 후드집업 5만원 이하 추천', category: '아우터 > 후드 집업', budget: 50000, limit: 3 });
  searchRes = await request('POST', '/products/search', { query: '스니커즈', category: '신발 > 스니커즈 > 패션스니커즈화', limit: 3 });
} catch (err) {
  error = err.message;
} finally {
  server.kill('SIGTERM');
}

const openapiValidation = openapiRes?.text ? validateOpenApi(openapiRes.text) : { failures: ['openapi_not_loaded'], paths: [], schemas: [], operationIds: [], refs: [] };
const manifestValidation = manifestRes?.body && openapiRes?.text && legalRes?.body ? validateManifest(manifestRes.body, openapiRes.text, legalRes.body) : ['manifest_or_dependencies_not_loaded'];
const runtimeValidation = health && manifestRes && openapiRes && legalRes && logoRes && recommendRes && searchRes ? validateRuntime({ health, manifestRes, openapiRes, legalRes, logoRes, recommendRes, searchRes }) : ['runtime_requests_incomplete'];
const failures = [...(error ? [error] : []), ...manifestValidation, ...openapiValidation.failures, ...runtimeValidation];

const report = {
  started_at: startedAt,
  completed_at: new Date().toISOString(),
  base_url: baseUrl,
  public_base_url: publicBaseUrl,
  summary: {
    passed: failures.length === 0,
    failure_count: failures.length,
    products_loaded: health?.body?.products_loaded,
    openapi_paths: openapiValidation.paths.length,
    schemas: openapiValidation.schemas.length,
    operation_ids: openapiValidation.operationIds.length,
    unresolved_refs: openapiValidation.refs.filter(ref => !openapiValidation.schemas.includes(ref)).length
  },
  checks: {
    health: health ? { status: health.status, content_type: health.content_type, body: health.body, latency_ms: health.latency_ms } : null,
    manifest: manifestRes ? { status: manifestRes.status, content_type: manifestRes.content_type, body: manifestRes.body, latency_ms: manifestRes.latency_ms } : null,
    openapi: openapiRes ? { status: openapiRes.status, content_type: openapiRes.content_type, paths: openapiValidation.paths, schemas: openapiValidation.schemas, operation_ids: openapiValidation.operationIds, latency_ms: openapiRes.latency_ms } : null,
    legal_notice: legalRes ? { status: legalRes.status, content_type: legalRes.content_type, body: legalRes.body, latency_ms: legalRes.latency_ms } : null,
    logo: logoRes ? { status: logoRes.status, content_type: logoRes.content_type, body_bytes: Buffer.byteLength(logoRes.text ?? ''), latency_ms: logoRes.latency_ms } : null,
    recommend_runtime: recommendRes ? { status: recommendRes.status, result_count: recommendRes.body?.recommendations?.length, top_product: recommendRes.body?.recommendations?.[0]?.product_id, has_score_breakdown: Boolean(recommendRes.body?.recommendations?.[0]?.score_breakdown), latency_ms: recommendRes.latency_ms } : null,
    search_runtime: searchRes ? { status: searchRes.status, result_count: searchRes.body?.results?.length, top_product: searchRes.body?.results?.[0]?.product_id, latency_ms: searchRes.latency_ms } : null
  },
  failures,
  server_output: serverOutput.trim().split('\n').slice(-5)
};
await mkdir(dirname(fileURLToPath(reportPath)), { recursive: true });
await writeFile(reportPath, JSON.stringify(report, null, 2));
const md = `# OpenAPI / Manifest Connection Test — 2026-06-25\n\n` +
`- Base URL: ${baseUrl}\n` +
`- Public manifest URL target: ${publicBaseUrl}\n` +
`- Products loaded: ${report.summary.products_loaded}\n\n` +
`## Summary\n\n| Metric | Value |\n|---|---:|\n` +
`| Passed | ${report.summary.passed} |\n` +
`| Failure count | ${report.summary.failure_count} |\n` +
`| OpenAPI paths | ${report.summary.openapi_paths} |\n` +
`| Schemas | ${report.summary.schemas} |\n` +
`| Operation IDs | ${report.summary.operation_ids} |\n` +
`| Unresolved refs | ${report.summary.unresolved_refs} |\n\n` +
`## Endpoint checks\n\n| Endpoint | Status | Content-Type | Latency ms |\n|---|---:|---|---:|\n` +
`| /health | ${report.checks.health?.status} | ${report.checks.health?.content_type} | ${report.checks.health?.latency_ms} |\n` +
`| /.well-known/ai-plugin.json | ${report.checks.manifest?.status} | ${report.checks.manifest?.content_type} | ${report.checks.manifest?.latency_ms} |\n` +
`| /openapi.yaml | ${report.checks.openapi?.status} | ${report.checks.openapi?.content_type} | ${report.checks.openapi?.latency_ms} |\n` +
`| /analytics/notice | ${report.checks.legal_notice?.status} | ${report.checks.legal_notice?.content_type} | ${report.checks.legal_notice?.latency_ms} |\n` +
`| /logo.png | ${report.checks.logo?.status} | ${report.checks.logo?.content_type} | ${report.checks.logo?.latency_ms} |\n` +
`| /shopper/recommend runtime | ${report.checks.recommend_runtime?.status} | application/json | ${report.checks.recommend_runtime?.latency_ms} |\n` +
`| /products/search runtime | ${report.checks.search_runtime?.status} | application/json | ${report.checks.search_runtime?.latency_ms} |\n\n` +
`## Failures\n\n${failures.length ? failures.map(f => `- ${f}`).join('\n') : '- None'}\n`;
await writeFile(mdReportPath, md);
console.log(JSON.stringify({
  ok: failures.length === 0,
  report: fileURLToPath(reportPath),
  markdown_report: fileURLToPath(mdReportPath),
  summary: report.summary,
  failures,
  server_output: report.server_output
}, null, 2));
