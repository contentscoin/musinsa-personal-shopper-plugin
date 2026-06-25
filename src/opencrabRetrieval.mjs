import { readFile } from 'node:fs/promises';

const DEFAULT_TIMEOUT_MS = 1200;
const DEFAULT_CACHE_URL = new URL('../data/index/opencrab-candidate-cache.json', import.meta.url);
const PRODUCT_ID_RE = /(?:products\/|product[_-]?id["'\s:=]+)(\d{4,})/gi;

export async function resolveOpenCrabCandidates(request = {}, options = {}) {
  const started = now();
  const mode = normalizeMode(request.retrieval_mode);
  const directIds = normalizeIds(request.opencrab_candidate_product_ids ?? request.candidate_product_ids);
  if (directIds.length) return result({ source: 'request_candidate_ids', product_ids: directIds, started });
  if (!['hybrid', 'opencrab_first'].includes(mode)) return result({ source: 'disabled', product_ids: [], started, skipped: true });

  const cachePath = options.cachePath ?? process.env.OPENCRAB_RETRIEVAL_CACHE_PATH ?? DEFAULT_CACHE_URL;
  if (cachePath) {
    const cached = await readCacheCandidates(cachePath, request);
    if (cached.length) return result({ source: 'opencrab_cache', product_ids: cached, started, cache_hit: true });
  }

  const url = options.url ?? process.env.OPENCRAB_RETRIEVAL_URL;
  if (!url) return result({ source: 'unconfigured', product_ids: [], started, skipped: true });

  try {
    const timeoutMs = Number(options.timeoutMs ?? process.env.OPENCRAB_RETRIEVAL_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
    const payload = buildRetrievalPayload(request, options);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(options.apiKey || process.env.OPENCRAB_RETRIEVAL_API_KEY ? { authorization: `Bearer ${options.apiKey ?? process.env.OPENCRAB_RETRIEVAL_API_KEY}` } : {})
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs)
    });
    const text = await res.text();
    if (!res.ok) return result({ source: 'opencrab_http', product_ids: [], started, error: `HTTP ${res.status}` });
    const json = tryJson(text);
    const ids = normalizeIds(extractProductIds(json ?? text));
    return result({ source: 'opencrab_http', product_ids: ids, started, raw_count: Array.isArray(json?.results) ? json.results.length : undefined });
  } catch (error) {
    return result({ source: 'opencrab_http', product_ids: [], started, error: String(error?.message ?? error) });
  }
}

export function buildRetrievalPayload(request = {}, options = {}) {
  const query = [request.query, request.category, request.brand, request.gender].filter(Boolean).join(' ');
  return {
    query,
    top_k: Number(request.opencrab_top_k ?? request.candidate_limit ?? options.topK ?? 80),
    project_name: options.projectName ?? process.env.OPENCRAB_PROJECT_NAME ?? 'paperclipbase',
    owner_tag: options.ownerTag ?? process.env.OPENCRAB_OWNER_TAG ?? 'hermes-profile:paperclipbase',
    purpose: 'musinsa_product_candidate_retrieval',
    require_product_ids: true
  };
}

export function extractProductIds(value) {
  const ids = [];
  visit(value);
  return [...new Set(ids.map(String))];

  function visit(node) {
    if (node == null) return;
    if (typeof node === 'string' || typeof node === 'number') {
      const text = String(node);
      if (/^\d{4,}$/.test(text)) ids.push(text);
      for (const match of text.matchAll(PRODUCT_ID_RE)) ids.push(match[1]);
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (typeof node === 'object') {
      for (const [key, item] of Object.entries(node)) {
        if (/product_?id|productId|id/i.test(key) && (typeof item === 'string' || typeof item === 'number')) visit(item);
        else visit(item);
      }
    }
  }
}

async function readCacheCandidates(cachePath, request) {
  try {
    const parsed = JSON.parse(await readFile(cachePath, 'utf8'));
    const queryKeys = [request.query, [request.query, request.category, request.brand, request.gender].filter(Boolean).join(' ')].filter(Boolean);
    for (const key of queryKeys) {
      const value = parsed[key] ?? parsed.queries?.[key];
      const ids = normalizeIds(extractProductIds(value));
      if (ids.length) return ids;
    }
    return normalizeIds(extractProductIds(parsed.default ?? parsed.candidates ?? []));
  } catch {
    return [];
  }
}

function normalizeIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(v => String(v)).filter(Boolean))];
}

function normalizeMode(value) {
  const mode = String(value ?? 'local_index').toLowerCase();
  return ['local_index', 'hybrid', 'opencrab_first'].includes(mode) ? mode : 'local_index';
}

function tryJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}

function result({ source, product_ids, started, skipped = false, cache_hit = false, error, raw_count }) {
  return {
    source,
    product_ids: normalizeIds(product_ids),
    skipped,
    cache_hit,
    error,
    raw_count,
    latency_ms: round(now() - started)
  };
}

function now() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function round(value) {
  return Number(value.toFixed(3));
}
