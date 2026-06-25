#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const port = Number(process.env.MUSINSA_PLUGIN_PORT ?? 8787);
const baseUrl = process.env.MUSINSA_PLUGIN_BASE_URL ?? `http://127.0.0.1:${port}`;
let apiProcess = null;
let buffer = Buffer.alloc(0);
let transportMode = 'line';

const tools = [
  {
    name: 'musinsa_health',
    description: 'Check the local MUSINSA Personal Shopper plugin health and loaded product count.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'musinsa_search_products',
    description: 'Search MUSINSA products by natural language and structured filters such as category, brand, price, and gender.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        category: { type: 'string', description: "Exact or partial category path, e.g. '상의 > 후드 티셔츠'." },
        brand: { type: 'string' },
        price_min: { type: 'number' },
        price_max: { type: 'number' },
        gender: { type: 'string' },
        limit: { type: 'integer', default: 10 }
      }
    }
  },
  {
    name: 'musinsa_recommend',
    description: 'Recommend products from a Korean natural-language shopping request with optional category, brand, budget, profile, and ranking explanations.',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string' },
        category: { type: 'string', description: "Optional exact category path constraint, e.g. '아우터 > 후드 집업'." },
        budget: { type: 'number' },
        brand: { type: 'string' },
        customer_profile: { type: 'object' },
        limit: { type: 'integer', default: 5 }
      }
    }
  },
  {
    name: 'musinsa_compare',
    description: 'Compare multiple MUSINSA product IDs and return a comparison table, best pick, and decision notes.',
    inputSchema: {
      type: 'object',
      required: ['product_ids'],
      properties: {
        product_ids: { type: 'array', items: { type: 'string' } },
        criteria: { type: 'array', items: { type: 'string' } }
      }
    }
  },
  {
    name: 'musinsa_get_product',
    description: 'Fetch a single MUSINSA product detail by product_id from the local ontology-backed product store.',
    inputSchema: {
      type: 'object',
      required: ['product_id'],
      properties: { product_id: { type: 'string' } }
    }
  },
  {
    name: 'musinsa_analytics_notice',
    description: 'Return the privacy/analytics notice for the MUSINSA Personal Shopper plugin.',
    inputSchema: { type: 'object', properties: {} }
  }
];

process.stdin.on('data', chunk => {
  buffer = Buffer.concat([buffer, chunk]);
  processBuffer().catch(error => logError(error));
});

process.on('exit', () => {
  if (apiProcess && !apiProcess.killed) apiProcess.kill('SIGTERM');
});

async function processBuffer() {
  while (buffer.length) {
    const headerEnd = buffer.indexOf('\r\n\r\n');
    const newlineEnd = buffer.indexOf('\n');
    let bodyText;

    if (headerEnd !== -1 && (newlineEnd === -1 || headerEnd < newlineEnd)) {
      transportMode = 'header';
      const headerText = buffer.slice(0, headerEnd).toString('utf8');
      const lengthMatch = headerText.match(/Content-Length:\s*(\d+)/i);
      if (!lengthMatch) {
        buffer = buffer.slice(headerEnd + 4);
        continue;
      }
      const length = Number(lengthMatch[1]);
      const bodyStart = headerEnd + 4;
      const bodyEnd = bodyStart + length;
      if (buffer.length < bodyEnd) return;
      bodyText = buffer.slice(bodyStart, bodyEnd).toString('utf8');
      buffer = buffer.slice(bodyEnd);
    } else {
      transportMode = 'line';
      if (newlineEnd === -1) return;
      bodyText = buffer.slice(0, newlineEnd).toString('utf8').trim();
      buffer = buffer.slice(newlineEnd + 1);
      if (!bodyText) continue;
    }

    let message;
    try {
      message = JSON.parse(bodyText);
    } catch (error) {
      logError(error);
      continue;
    }
    handleMessage(message).catch(error => {
      logError(error);
      if (message.id !== undefined) send({ jsonrpc: '2.0', id: message.id, error: { code: -32603, message: error.message } });
    });
  }
}

async function handleMessage(message) {
  if (message.id === undefined) return;
  if (message.method === 'initialize') {
    send({
      jsonrpc: '2.0',
      id: message.id,
      result: {
        protocolVersion: message.params?.protocolVersion ?? '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'musinsa-personal-shopper', version: '1.0.0' }
      }
    });
    return;
  }
  if (message.method === 'tools/list') {
    send({ jsonrpc: '2.0', id: message.id, result: { tools } });
    return;
  }
  if (message.method === 'tools/call') {
    const { name, arguments: args = {} } = message.params ?? {};
    const result = await callTool(name, args);
    send({
      jsonrpc: '2.0',
      id: message.id,
      result: {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      }
    });
    return;
  }
  send({ jsonrpc: '2.0', id: message.id, error: { code: -32601, message: `Unknown method: ${message.method}` } });
}

async function callTool(name, args) {
  await ensureApiServer();
  if (name === 'musinsa_health') return getJson('/health');
  if (name === 'musinsa_search_products') return postJson('/products/search', args);
  if (name === 'musinsa_recommend') return postJson('/shopper/recommend', args);
  if (name === 'musinsa_compare') return postJson('/shopper/compare', args);
  if (name === 'musinsa_get_product') return getJson(`/products/${encodeURIComponent(args.product_id)}`);
  if (name === 'musinsa_analytics_notice') return getJson('/analytics/notice');
  throw new Error(`Unknown tool: ${name}`);
}

async function ensureApiServer() {
  if (await isHealthy()) return;
  if (!apiProcess || apiProcess.killed) {
    apiProcess = spawn(process.execPath, ['src/server.mjs'], {
      cwd: projectRoot,
      env: { ...process.env, PORT: String(port) },
      stdio: ['ignore', 'ignore', 'ignore'],
      detached: false
    });
  }
  const started = Date.now();
  while (Date.now() - started < 15000) {
    if (await isHealthy()) return;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`MUSINSA plugin API did not become healthy at ${baseUrl}`);
}

async function isHealthy() {
  try {
    const res = await fetch(`${baseUrl}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

async function getJson(path) {
  const res = await fetch(`${baseUrl}${path}`);
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} failed: ${res.status} ${text}`);
  return text ? JSON.parse(text) : {};
}

async function postJson(path, payload) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload ?? {})
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} failed: ${res.status} ${text}`);
  return text ? JSON.parse(text) : {};
}

function send(message) {
  const json = JSON.stringify(message);
  if (transportMode === 'header') {
    process.stdout.write(`Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n${json}`);
  } else {
    process.stdout.write(`${json}\n`);
  }
}

function logError(error) {
  process.stderr.write(`[musinsa-mcp] ${error.stack ?? error.message ?? String(error)}\n`);
}
