import { spawn } from 'node:child_process';

const root = '/home/jake/.hermes/profiles/paperclipbase/working/musinsa-personal-shopper-plugin';
const port = Number(process.env.OPENCRAB_LIVE_BRIDGE_TEST_PORT ?? 8796);
const baseUrl = `http://127.0.0.1:${port}`;
const bridge = spawn('node', ['scripts/opencrab-retrieval-bridge.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    OPENCRAB_BRIDGE_COMMAND: 'node scripts/opencrab-live-command.mjs',
    OPENCRAB_LIVE_RESPONSE_PATH: 'data/index/opencrab-live-project-run-verification-20260625.json',
    OPENCRAB_BRIDGE_TIMEOUT_MS: '6000'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});
let logs = '';
bridge.stdout.on('data', d => logs += d.toString());
bridge.stderr.on('data', d => logs += d.toString());

async function waitReady() {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) return res.json();
    } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error(`bridge not ready: ${logs}`);
}

try {
  const health = await waitReady();
  const res = await fetch(`${baseUrl}/retrieve`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query: '175cm 88kg 릴렉스핏',
      top_k: 10,
      project_name: 'paperclipbase',
      owner_tag: 'hermes-profile:paperclipbase',
      purpose: 'musinsa_product_candidate_retrieval',
      require_product_ids: true
    })
  });
  const payload = await res.json();
  const output = {
    health,
    http_status: res.status,
    bridge: payload.bridge,
    evidence_count: payload.evidence?.length ?? 0,
    first_source: payload.evidence?.[0]?.source,
    has_owner_tag: JSON.stringify(payload).includes('hermes-profile:paperclipbase'),
    logs: logs.trim().split('\n').slice(-4)
  };
  console.log(JSON.stringify(output, null, 2));
  if (health.mode !== 'command') throw new Error(`expected command health mode, got ${health.mode}`);
  if (payload.bridge?.mode !== 'command') throw new Error(`expected command bridge mode, got ${payload.bridge?.mode}`);
  if (!payload.evidence?.length) throw new Error('expected evidence rows');
  if (!output.has_owner_tag) throw new Error('expected owner tag in live command payload');
} finally {
  bridge.kill('SIGTERM');
}
