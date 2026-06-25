import { spawn } from 'node:child_process';

const root = '/home/jake/.hermes/profiles/paperclipbase/working/musinsa-personal-shopper-plugin';
const port = '8793';
const server = spawn('node', ['src/server.mjs'], {
  cwd: root,
  env: { ...process.env, PORT: port },
  stdio: ['ignore', 'pipe', 'pipe']
});
let logs = '';
server.stdout.on('data', d => logs += d.toString());
server.stderr.on('data', d => logs += d.toString());

async function waitReady() {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      if (res.ok) return res.json();
    } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error(`server not ready: ${logs}`);
}

try {
  const health = await waitReady();
  const dashboard = await fetch(`http://127.0.0.1:${port}/dashboard`).then(r => r.text());
  const summary = await fetch(`http://127.0.0.1:${port}/analytics/summary`).then(r => r.json());
  const insights = await fetch(`http://127.0.0.1:${port}/analytics/insights`).then(r => r.json());
  const checks = {
    health_products_loaded: health.products_loaded,
    dashboard_has_live_badge: dashboard.includes('Live API data'),
    dashboard_has_fallback_badge: dashboard.includes('Fallback mock data'),
    dashboard_has_refresh_button: dashboard.includes('Refresh live data'),
    dashboard_has_auto_refresh: dashboard.includes('Auto refresh 30s'),
    summary_total_events: summary.total_events,
    insights_count: insights.insights?.length ?? 0
  };
  console.log(JSON.stringify(checks, null, 2));
  if (!checks.dashboard_has_live_badge || !checks.dashboard_has_fallback_badge || !checks.dashboard_has_refresh_button) {
    throw new Error('dashboard live/fallback/refresh UI markers missing');
  }
} finally {
  server.kill('SIGTERM');
}
