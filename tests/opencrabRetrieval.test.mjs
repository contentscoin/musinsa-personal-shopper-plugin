import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { resolveOpenCrabCandidates, extractProductIds, extractOpenCrabCandidates, buildRetrievalPayload } from '../src/opencrabRetrieval.mjs';

const originalEnv = { ...process.env };

test.afterEach(() => {
  process.env.OPENCRAB_RETRIEVAL_URL = originalEnv.OPENCRAB_RETRIEVAL_URL;
  process.env.OPENCRAB_RETRIEVAL_TIMEOUT_MS = originalEnv.OPENCRAB_RETRIEVAL_TIMEOUT_MS;
  process.env.OPENCRAB_RETRIEVAL_API_KEY = originalEnv.OPENCRAB_RETRIEVAL_API_KEY;
});

test('extractProductIds finds IDs in structured ontology search payloads and source URLs', () => {
  const ids = extractProductIds({
    results: [
      { product_id: '3783092', source_url: 'https://www.musinsa.com/products/3783092' },
      { text: 'candidate product_id: 4567792 from source' },
      { metadata: { productId: 1163169 } }
    ]
  });
  assert.deepEqual(ids, ['3783092', '4567792', '1163169']);
});

test('resolveOpenCrabCandidates skips remote retrieval outside hybrid/opencrab_first mode', async () => {
  delete process.env.OPENCRAB_RETRIEVAL_URL;
  const result = await resolveOpenCrabCandidates({ query: '후드집업', retrieval_mode: 'local_index' });
  assert.equal(result.skipped, true);
  assert.equal(result.source, 'disabled');
  assert.deepEqual(result.product_ids, []);
});

test('resolveOpenCrabCandidates uses the default generated candidate cache in hybrid mode', async () => {
  delete process.env.OPENCRAB_RETRIEVAL_URL;
  delete process.env.OPENCRAB_RETRIEVAL_CACHE_PATH;
  const result = await resolveOpenCrabCandidates({ query: '남성 차콜 후드집업 5만원 이하', retrieval_mode: 'hybrid' });
  assert.equal(result.source, 'opencrab_cache');
  assert.equal(result.cache_hit, true);
  assert.ok(result.product_ids.length >= 3);
});

test('resolveOpenCrabCandidates calls configured adapter and extracts product ids', async () => {
  const server = http.createServer(async (req, res) => {
    assert.equal(req.method, 'POST');
    let body = '';
    for await (const chunk of req) body += chunk;
    const payload = JSON.parse(body);
    assert.match(payload.query, /후드집업/);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ results: [{ product_id: '3783092' }, { source_url: 'https://www.musinsa.com/products/4567792' }] }));
  });
  await new Promise(resolve => server.listen(0, resolve));
  const { port } = server.address();
  process.env.OPENCRAB_RETRIEVAL_URL = `http://127.0.0.1:${port}/retrieve`;
  process.env.OPENCRAB_RETRIEVAL_TIMEOUT_MS = '1000';
  try {
    const result = await resolveOpenCrabCandidates({ query: '남성 차콜 후드집업', retrieval_mode: 'hybrid' }, { cachePath: '' });
    assert.equal(result.source, 'opencrab_http');
    assert.deepEqual(result.product_ids, ['3783092', '4567792']);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('extractOpenCrabCandidates parses evidence rows from OpenCrab project_run payloads', () => {
  const parsed = extractOpenCrabCandidates({
    status: 'ok',
    answer: 'The generated answer may be missing.',
    evidence: [{
      text: `Owner tag: hermes-profile:paperclipbase\nReturn these candidates as product_id/source_url for relaxed-fit queries:\n- 3467738 https://www.musinsa.com/products/3467738 원턱 카고 스웨트 팬츠 그레이 18600\n- 4024189 https://www.musinsa.com/products/4024189 원턱 와이드 밴딩 슬랙스 크림 18600`,
      source: '2026-06-25 MUSINSA relaxed fit 175 88 retrieval seed rows',
      metadata: { package_id: '0b3c79f7-1861-4466-ba20-2cbaa736de66', source_url: 'mcp-pack-update:example' }
    }]
  });
  assert.deepEqual(parsed.product_ids, ['3467738', '4024189']);
  assert.equal(parsed.evidence_count, 1);
  assert.equal(parsed.rows[0].source_url, 'https://www.musinsa.com/products/3467738');
  assert.equal(parsed.rows[0].source, '2026-06-25 MUSINSA relaxed fit 175 88 retrieval seed rows');
  assert.equal(parsed.rows[0].package_id, '0b3c79f7-1861-4466-ba20-2cbaa736de66');
});

test('extractOpenCrabCandidates parses JSON encoded result strings returned by MCP bridges', () => {
  const parsed = extractOpenCrabCandidates({
    result: JSON.stringify({
      evidence: [{
        text: '- 1955217 https://www.musinsa.com/products/1955217 5IN OG HI 독일군 스니커즈 키높이 버전 59900',
        source: '2026-06-25 MUSINSA height shoes retrieval seed rows'
      }]
    })
  });
  assert.deepEqual(parsed.product_ids, ['1955217']);
  assert.equal(parsed.rows[0].extraction, 'evidence_row');
  assert.deepEqual(parsed.source_titles, ['2026-06-25 MUSINSA height shoes retrieval seed rows']);
});

test('resolveOpenCrabCandidates exposes evidence candidate rows and source titles from adapter responses', async () => {
  const server = http.createServer(async (_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      evidence: [{
        source: '2026-06-25 MUSINSA office shirt retrieval seed rows',
        metadata: { package_id: '0b3c79f7-1861-4466-ba20-2cbaa736de66' },
        text: '- 4227437 https://www.musinsa.com/products/4227437 87-STAN081 원포켓 빈티지 오버핏 긴팔 체크 셔츠 19900'
      }]
    }));
  });
  await new Promise(resolve => server.listen(0, resolve));
  const { port } = server.address();
  process.env.OPENCRAB_RETRIEVAL_URL = `http://127.0.0.1:${port}/retrieve`;
  process.env.OPENCRAB_RETRIEVAL_TIMEOUT_MS = '1000';
  try {
    const result = await resolveOpenCrabCandidates({ query: '셔츠 출근룩', retrieval_mode: 'hybrid' }, { cachePath: '' });
    assert.equal(result.source, 'opencrab_http');
    assert.deepEqual(result.product_ids, ['4227437']);
    assert.equal(result.evidence_count, 1);
    assert.equal(result.candidate_rows[0].source, '2026-06-25 MUSINSA office shirt retrieval seed rows');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('buildRetrievalPayload includes owner tag and project scope for OpenCrab queries', () => {
  const payload = buildRetrievalPayload({ query: '화이트 스니커즈', brand: '테스트', opencrab_top_k: 12 });
  assert.equal(payload.project_name, 'paperclipbase');
  assert.equal(payload.owner_tag, 'hermes-profile:paperclipbase');
  assert.equal(payload.top_k, 12);
  assert.match(payload.query, /화이트 스니커즈/);
});
