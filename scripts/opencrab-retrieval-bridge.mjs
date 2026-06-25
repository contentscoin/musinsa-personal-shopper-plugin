#!/usr/bin/env node
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const DEFAULT_FIXTURE_URL = new URL('../data/index/opencrab-real-project-run-sample.json', import.meta.url);
const port = Number(process.env.PORT ?? process.env.OPENCRAB_BRIDGE_PORT ?? 8791);
const fixturePath = process.env.OPENCRAB_BRIDGE_FIXTURE_PATH || DEFAULT_FIXTURE_URL;
const upstreamUrl = process.env.OPENCRAB_BRIDGE_UPSTREAM_URL;
const bridgeCommand = process.env.OPENCRAB_BRIDGE_COMMAND;
const bridgeCommandCwd = process.env.OPENCRAB_BRIDGE_COMMAND_CWD || process.cwd();
const upstreamTimeoutMs = Number(process.env.OPENCRAB_BRIDGE_TIMEOUT_MS ?? 8000);
const fallbackOnError = process.env.OPENCRAB_BRIDGE_FALLBACK_ON_ERROR !== 'false';
const mode = bridgeCommand ? 'command' : upstreamUrl ? 'upstream' : 'fixture';

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === 'GET' && url.pathname === '/health') {
      return json(res, {
        ok: true,
        mode,
        port,
        upstream_configured: Boolean(upstreamUrl),
        command_configured: Boolean(bridgeCommand),
        fixture_path: String(fixturePath),
        fallback_on_error: fallbackOnError
      });
    }
    if (req.method !== 'POST') return json(res, { error: { code: 'method_not_allowed', message: 'Use POST /retrieve' } }, 405);
    if (url.pathname !== '/retrieve') return json(res, { error: { code: 'not_found', message: 'Not found' } }, 404);

    const request = await readJson(req);
    const { payload, sourceMode, fallbackError } = await getPayload(request);
    const filtered = filterEvidencePayload(payload, request);
    return json(res, {
      ...filtered,
      bridge: {
        mode: sourceMode,
        configured_mode: mode,
        fallback_error: fallbackError,
        project_name: request.project_name,
        owner_tag: request.owner_tag,
        query: request.query,
        top_k: request.top_k
      }
    });
  } catch (error) {
    return json(res, { error: { code: 'bridge_error', message: String(error?.message ?? error) } }, 500);
  }
});

server.listen(port, () => console.log(`OpenCrab retrieval bridge listening on :${port} (${mode} mode)`));

async function getPayload(request) {
  if (mode === 'fixture') return { payload: await readFixture(), sourceMode: 'fixture' };
  try {
    const payload = mode === 'command' ? await fetchCommand(request) : await fetchUpstream(request);
    return { payload, sourceMode: mode };
  } catch (error) {
    if (!fallbackOnError) throw error;
    return { payload: await readFixture(), sourceMode: `${mode}_fallback_fixture`, fallbackError: String(error?.message ?? error).slice(0, 500) };
  }
}

async function fetchUpstream(request) {
  const headers = { 'content-type': 'application/json' };
  if (process.env.OPENCRAB_BRIDGE_UPSTREAM_API_KEY) headers.authorization = `Bearer ${process.env.OPENCRAB_BRIDGE_UPSTREAM_API_KEY}`;
  const res = await fetch(upstreamUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(upstreamTimeoutMs)
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`upstream HTTP ${res.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

async function fetchCommand(request) {
  const child = spawn(bridgeCommand, {
    cwd: bridgeCommandCwd,
    env: { ...process.env },
    shell: true,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  const timeout = setTimeout(() => child.kill('SIGTERM'), upstreamTimeoutMs);
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', d => { stdout += d.toString(); });
  child.stderr.on('data', d => { stderr += d.toString(); });
  child.stdin.end(JSON.stringify(request));
  const code = await new Promise(resolve => child.on('close', resolve));
  clearTimeout(timeout);
  if (code !== 0) throw new Error(`command exited ${code}: ${stderr.slice(0, 300)}`);
  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`command returned invalid JSON: ${String(error?.message ?? error)}; stdout=${stdout.slice(0, 200)}`);
  }
}

async function readFixture() {
  return JSON.parse(await readFile(fixturePath, 'utf8'));
}

function filterEvidencePayload(payload, request) {
  const ownerTag = request.owner_tag || 'hermes-profile:paperclipbase';
  const query = normalize(request.query || '');
  const topK = Number(request.top_k ?? 80);
  const evidence = Array.isArray(payload.evidence) ? payload.evidence : [];
  const scored = evidence
    .filter(item => !ownerTag || JSON.stringify(item).includes(ownerTag))
    .map(item => ({ item, score: evidenceScore(item, query) }))
    .filter(row => row.score > 0 || !query)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(topK, evidence.length || topK)))
    .map(row => row.item);
  return {
    status: payload.status ?? 'ok',
    project: payload.project,
    package_id: payload.package_id,
    package_title: payload.package_title,
    task: payload.task,
    answer: payload.answer,
    evidence: scored.length ? scored : evidence.slice(0, Math.max(1, Math.min(topK, evidence.length || topK)))
  };
}

function evidenceScore(item, query) {
  const text = normalize([item.source, item.text, item.metadata?.source, item.metadata?.package_title].filter(Boolean).join(' '));
  const terms = query.split(/\s+/).filter(Boolean);
  let score = 0;
  for (const term of terms) {
    if (text.includes(term)) score += term.length >= 3 ? 2 : 1;
  }
  if (text.includes('musinsa') || text.includes('무신사')) score += 1;
  return score;
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

function json(res, body, status = 200) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body, null, 2));
}

function normalize(value) {
  return String(value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}
