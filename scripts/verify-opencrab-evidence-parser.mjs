import http from 'node:http';
import { spawn } from 'node:child_process';

const root = '/home/jake/.hermes/profiles/paperclipbase/working/musinsa-personal-shopper-plugin';

const mock = http.createServer((req, res) => {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      evidence: [{
        source: '2026-06-25 MUSINSA relaxed fit 175 88 retrieval seed rows',
        metadata: { package_id: '0b3c79f7-1861-4466-ba20-2cbaa736de66', source_url: 'mcp-pack-update:test' },
        text: 'Owner tag: hermes-profile:paperclipbase\n- 3467738 https://www.musinsa.com/products/3467738 원턱 카고 스웨트 팬츠 그레이 18600\n- 4024189 https://www.musinsa.com/products/4024189 원턱 와이드 밴딩 슬랙스 크림 18600\n- 4227437 https://www.musinsa.com/products/4227437 원포켓 빈티지 오버핏 긴팔 체크 셔츠 19900'
      }]
    }));
  });
});
await new Promise(resolve => mock.listen(8791, '127.0.0.1', resolve));

const server = spawn('node', ['src/server.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: '8792',
    OPENCRAB_RETRIEVAL_URL: 'http://127.0.0.1:8791/retrieve',
    OPENCRAB_RETRIEVAL_TIMEOUT_MS: '1000',
    OPENCRAB_RETRIEVAL_CACHE_PATH: ''
  },
  stdio: ['ignore', 'pipe', 'pipe']
});
let logs = '';
server.stdout.on('data', d => logs += d.toString());
server.stderr.on('data', d => logs += d.toString());

async function waitReady() {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch('http://127.0.0.1:8792/health');
      if (res.ok) return await res.json();
    } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error(`server not ready; logs=${logs}`);
}

try {
  const health = await waitReady();
  const res = await fetch('http://127.0.0.1:8792/products/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: '오버핏 셔츠', retrieval_mode: 'hybrid', limit: 3 })
  });
  const body = await res.json();
  const adapter = body.retrieval?.opencrab_adapter;
  console.log(JSON.stringify({
    health_products_loaded: health.products_loaded,
    status: res.status,
    result_ids: body.results?.map(r => r.product_id),
    adapter_source: adapter?.source,
    adapter_product_id_count: adapter?.product_id_count,
    adapter_evidence_count: adapter?.evidence_count,
    adapter_source_titles: adapter?.source_titles,
    adapter_candidate_rows: adapter?.candidate_rows
  }, null, 2));
} finally {
  server.kill('SIGTERM');
  mock.close();
}
