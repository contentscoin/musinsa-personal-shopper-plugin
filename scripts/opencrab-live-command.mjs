#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

let raw = '';
for await (const chunk of process.stdin) raw += chunk;
const request = raw ? JSON.parse(raw) : {};

const projectName = request.project_name || process.env.OPENCRAB_PROJECT_NAME || 'paperclipbase';
const ownerTag = request.owner_tag || process.env.OPENCRAB_OWNER_TAG || 'hermes-profile:paperclipbase';
const topK = Number(request.top_k ?? 10);
const liveUrl = process.env.OPENCRAB_PROJECT_RUN_URL || process.env.OPENCRAB_LIVE_PROJECT_RUN_URL;
const liveApiKey = process.env.OPENCRAB_PROJECT_RUN_API_KEY || process.env.OPENCRAB_LIVE_API_KEY;
const liveResponsePath = process.env.OPENCRAB_LIVE_RESPONSE_PATH;
const timeoutMs = Number(process.env.OPENCRAB_LIVE_TIMEOUT_MS ?? 15000);

const task = buildTask(request, ownerTag);

try {
  const payload = liveUrl ? await callProjectRunHttp({ liveUrl, liveApiKey, projectName, task, topK, timeoutMs })
    : liveResponsePath ? JSON.parse(await readFile(liveResponsePath, 'utf8'))
    : failNoBackend();
  const normalized = normalizeProjectRunPayload(payload, { projectName, task, ownerTag, topK });
  process.stdout.write(JSON.stringify(normalized, null, 2));
} catch (error) {
  console.error(String(error?.message ?? error));
  process.exit(1);
}

function buildTask(request, ownerTag) {
  const query = [request.query, request.category, request.brand, request.gender].filter(Boolean).join(' ').trim();
  return [
    'For MUSINSA Personal Shopper product candidate retrieval, return compact evidence rows with product_id and original MUSINSA source_url.',
    `Query: ${query || 'MUSINSA product candidates'}`,
    `Include only private packs tagged ${ownerTag} and MUSINSA product ontology evidence.`,
    'Prefer retrieval seed rows that explicitly contain product_id and https://www.musinsa.com/products/{id}.'
  ].join('\n');
}

async function callProjectRunHttp({ liveUrl, liveApiKey, projectName, task, topK, timeoutMs }) {
  const headers = { 'content-type': 'application/json' };
  if (liveApiKey) headers.authorization = `Bearer ${liveApiKey}`;
  const res = await fetch(liveUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ project_name: projectName, task, query: task, top_k: topK, reverse_ingest: false }),
    signal: AbortSignal.timeout(timeoutMs)
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`OpenCrab project_run HTTP ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

function normalizeProjectRunPayload(payload, { projectName, task, ownerTag, topK }) {
  const parsed = typeof payload?.result === 'string' ? tryJson(payload.result) ?? payload : payload;
  const body = parsed?.structuredContent ?? parsed;
  const evidence = Array.isArray(body?.evidence) ? body.evidence : [];
  return {
    status: body?.status ?? 'ok',
    project: body?.project ?? { name: projectName },
    package_count: body?.package_count,
    packages: body?.packages,
    task: body?.task ?? task,
    answer: body?.answer,
    evidence: evidence.slice(0, Math.max(1, topK)).map(item => ({
      id: item.id,
      document_id: item.document_id,
      workspace_id: item.workspace_id,
      text: item.text,
      score: item.score,
      source: item.source ?? item.metadata?.source,
      metadata: {
        ...(item.metadata ?? {}),
        owner_tag: item.metadata?.owner_tag ?? ownerTag
      }
    }))
  };
}

function failNoBackend() {
  throw new Error('No live OpenCrab backend configured. Set OPENCRAB_PROJECT_RUN_URL for HTTP project_run or OPENCRAB_LIVE_RESPONSE_PATH for a captured verification payload.');
}

function tryJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}
