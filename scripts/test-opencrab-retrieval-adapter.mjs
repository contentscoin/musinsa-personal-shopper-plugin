import { spawn } from 'node:child_process';
import http from 'node:http';
import { writeFile, mkdir } from 'node:fs/promises';

const pluginPort = Number(process.env.MUSINSA_ADAPTER_TEST_PORT ?? 8796);
const mockServer = http.createServer(async (req, res) => {
  let body = '';
  for await (const chunk of req) body += chunk;
  const payload = JSON.parse(body || '{}');
  const ok = payload.query?.includes('후드집업') || payload.query?.includes('후드');
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({
    ok,
    results: [
      { product_id: '3783092', source_url: 'https://www.musinsa.com/products/3783092' },
      { product_id: '4567792', source_url: 'https://www.musinsa.com/products/4567792' },
      { product_id: '1163169', source_url: 'https://www.musinsa.com/products/1163169' }
    ]
  }));
});
await new Promise(resolve => mockServer.listen(0, resolve));
const mockPort = mockServer.address().port;

const plugin = spawn(process.execPath, ['src/server.mjs'], {
  cwd: new URL('..', import.meta.url),
  env: {
    ...process.env,
    PORT: String(pluginPort),
    OPENCRAB_RETRIEVAL_URL: `http://127.0.0.1:${mockPort}/retrieve`,
    OPENCRAB_RETRIEVAL_TIMEOUT_MS: '1000'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

const serverOutput = [];
plugin.stdout.on('data', chunk => serverOutput.push(chunk.toString('utf8').trim()));
plugin.stderr.on('data', chunk => serverOutput.push(chunk.toString('utf8').trim()));

try {
  await waitForHealth(pluginPort);
  const response = await postJson(`http://127.0.0.1:${pluginPort}/products/search`, {
    query: '남성 차콜 후드집업 5만원 이하',
    retrieval_mode: 'hybrid',
    price_max: 50000,
    limit: 3
  });
  const summary = {
    passed: response.retrieval?.opencrab_adapter?.source === 'opencrab_http'
      && response.retrieval?.opencrab_candidates_used === true
      && response.retrieval?.candidate_count === 3
      && response.results?.length >= 1,
    results: response.results?.map(item => ({ product_id: item.product_id, name_ko: item.name_ko, score: item.score, source_url: item.source_url })),
    retrieval: response.retrieval,
    server_output: serverOutput.filter(Boolean).slice(-5)
  };
  await mkdir('reports', { recursive: true });
  await writeFile('reports/opencrab-retrieval-adapter-test-20260625.json', JSON.stringify(summary, null, 2));
  await writeFile('reports/opencrab-retrieval-adapter-test-20260625.md', toMarkdown(summary));
  console.log(JSON.stringify({ ok: summary.passed, report: 'reports/opencrab-retrieval-adapter-test-20260625.json', markdown_report: 'reports/opencrab-retrieval-adapter-test-20260625.md', summary }, null, 2));
  if (!summary.passed) process.exitCode = 1;
} finally {
  plugin.kill('SIGTERM');
  await new Promise(resolve => mockServer.close(resolve));
}

async function waitForHealth(port) {
  const started = Date.now();
  while (Date.now() - started < 10000) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      if (res.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error('plugin did not become healthy');
}

async function postJson(url, payload) {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text}`);
  return JSON.parse(text);
}

function toMarkdown(summary) {
  return `# OpenCrab Retrieval Adapter Test — 2026-06-25\n\n| Metric | Value |\n|---|---:|\n| Passed | ${summary.passed} |\n| Candidate source | ${summary.retrieval?.candidate_source?.join(', ') ?? ''} |\n| Adapter source | ${summary.retrieval?.opencrab_adapter?.source ?? ''} |\n| Candidate count | ${summary.retrieval?.candidate_count ?? 0} |\n| Result count | ${summary.results?.length ?? 0} |\n| Candidate retrieval ms | ${summary.retrieval?.latency_ms?.candidate_retrieval ?? 0} |\n\n## Results\n\n${(summary.results ?? []).map(item => `- ${item.product_id} — ${item.name_ko} — score ${item.score} — ${item.source_url}`).join('\n')}\n`;
}
