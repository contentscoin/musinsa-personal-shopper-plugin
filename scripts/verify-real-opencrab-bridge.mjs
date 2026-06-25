import { spawn } from 'node:child_process';

const root = '/home/jake/.hermes/profiles/paperclipbase/working/musinsa-personal-shopper-plugin';

const bridge = spawn('node', ['scripts/opencrab-retrieval-bridge.mjs'], {
  cwd: root,
  env: { ...process.env, PORT: '8791' },
  stdio: ['ignore', 'pipe', 'pipe']
});
const server = spawn('node', ['src/server.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: '8792',
    OPENCRAB_RETRIEVAL_URL: 'http://127.0.0.1:8791/retrieve',
    OPENCRAB_RETRIEVAL_TIMEOUT_MS: '4000',
    OPENCRAB_RETRIEVAL_CACHE_PATH: ''
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

let logs = '';
for (const child of [bridge, server]) {
  child.stdout.on('data', d => logs += d.toString());
  child.stderr.on('data', d => logs += d.toString());
}

async function waitReady(url) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error(`not ready: ${url}\n${logs}`);
}

async function search(payload) {
  const res = await fetch('http://127.0.0.1:8792/products/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`search HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

try {
  const bridgeHealth = await waitReady('http://127.0.0.1:8791/health');
  const pluginHealth = await waitReady('http://127.0.0.1:8792/health');
  const query = '오버핏 셔츠 175cm 88kg 릴렉스핏';
  const local = await search({ query, retrieval_mode: 'local_index', limit: 5 });
  const hybrid = await search({ query, retrieval_mode: 'hybrid', limit: 5 });
  const adapter = hybrid.retrieval?.opencrab_adapter ?? {};
  const output = {
    bridge_health: bridgeHealth,
    plugin_products_loaded: pluginHealth.products_loaded,
    query,
    local: {
      result_ids: local.results?.map(r => r.product_id),
      candidate_source: local.retrieval?.candidate_source,
      matched_count: local.retrieval?.matched_count
    },
    hybrid: {
      result_ids: hybrid.results?.map(r => r.product_id),
      candidate_source: hybrid.retrieval?.candidate_source,
      matched_count: hybrid.retrieval?.matched_count,
      opencrab_adapter: {
        source: adapter.source,
        product_id_count: adapter.product_id_count,
        evidence_count: adapter.evidence_count,
        source_titles: adapter.source_titles,
        candidate_rows: adapter.candidate_rows
      }
    }
  };
  console.log(JSON.stringify(output, null, 2));
  if (adapter.source !== 'opencrab_http') throw new Error(`expected opencrab_http, got ${adapter.source}`);
  if (!adapter.candidate_rows?.length) throw new Error('expected OpenCrab candidate rows');
  if (!adapter.source_titles?.some(title => title.includes('MUSINSA'))) throw new Error('expected MUSINSA source title');
} finally {
  server.kill('SIGTERM');
  bridge.kill('SIGTERM');
}
