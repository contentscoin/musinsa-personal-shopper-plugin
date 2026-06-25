import { readFile } from 'node:fs/promises';

const DEFAULT_TIMEOUT_MS = 1200;
const DEFAULT_CACHE_URL = new URL('../data/index/opencrab-candidate-cache.json', import.meta.url);
const PRODUCT_ID_RE = /(?:products\/|product[_-]?id["'\s:=]+)(\d{4,})/gi;
const MUSINSA_PRODUCT_URL_RE = /https?:\/\/www\.musinsa\.com\/products\/(\d{4,})/gi;
const EVIDENCE_ROW_RE = /(?:^|\n)\s*(?:[-*]|\d+[.)]|\|)?\s*(\d{4,})\s*(?:[-|—: ]+)\s*(https?:\/\/www\.musinsa\.com\/products\/(\d{4,}))/gi;

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
    const candidates = extractOpenCrabCandidates(json ?? text);
    return result({
      source: 'opencrab_http',
      product_ids: candidates.product_ids,
      candidate_rows: candidates.rows,
      evidence_count: candidates.evidence_count,
      source_titles: candidates.source_titles,
      started,
      raw_count: candidates.raw_count ?? (Array.isArray(json?.results) ? json.results.length : undefined)
    });
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

export function extractOpenCrabCandidates(value) {
  const rows = [];
  const sourceTitles = new Set();
  let evidenceCount = 0;
  let rawCount;

  visit(value, {});
  const product_ids = normalizeIds(rows.map(row => row.product_id));
  const fallbackIds = normalizeIds(extractProductIds(value));
  for (const id of fallbackIds) {
    if (!product_ids.includes(id)) {
      rows.push({ product_id: id, source_url: `https://www.musinsa.com/products/${id}`, extraction: 'fallback_id' });
      product_ids.push(id);
    }
  }
  return {
    product_ids,
    rows: dedupeRows(rows),
    evidence_count: evidenceCount || undefined,
    source_titles: [...sourceTitles].slice(0, 8),
    raw_count: rawCount
  };

  function visit(node, context) {
    if (node == null) return;
    if (typeof node === 'string') {
      const parsed = tryJson(node);
      if (parsed && parsed !== node) {
        visit(parsed, context);
        return;
      }
      parseCandidateText(node, context);
      return;
    }
    if (typeof node === 'number') return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item, context);
      return;
    }
    if (typeof node === 'object') {
      if (Array.isArray(node.evidence)) {
        rawCount ??= node.evidence.length;
        for (const item of node.evidence) visit(item, { ...context, evidence: true });
      }
      if (Array.isArray(node.results)) {
        rawCount ??= node.results.length;
        for (const item of node.results) visit(item, context);
      }
      const directProductId = node.product_id ?? node.productId;
      const directSourceUrl = node.source_url ?? node.sourceUrl;
      if (directProductId || directSourceUrl) {
        const sourceUrlText = typeof directSourceUrl === 'string' ? directSourceUrl : undefined;
        const urlId = sourceUrlText ? [...sourceUrlText.matchAll(MUSINSA_PRODUCT_URL_RE)][0]?.[1] : undefined;
        const productId = directProductId ?? urlId;
        if (productId) addRow(productId, sourceUrlText ?? `https://www.musinsa.com/products/${productId}`, context, 'structured');
      }
      const source = node.source ?? node.metadata?.source;
      const packageId = node.package_id ?? node.metadata?.package_id;
      const sourceUrl = node.source_url ?? node.metadata?.source_url;
      const evidenceContext = {
        ...context,
        source: typeof source === 'string' ? source : context.source,
        package_id: typeof packageId === 'string' ? packageId : context.package_id,
        source_url: typeof sourceUrl === 'string' ? sourceUrl : context.source_url,
        evidence: context.evidence || Boolean(node.text && (source || node.metadata))
      };
      if (evidenceContext.source) sourceTitles.add(evidenceContext.source);
      if (evidenceContext.evidence && typeof node.text === 'string') evidenceCount += 1;
      for (const [key, item] of Object.entries(node)) {
        if (['metadata', 'evidence', 'results'].includes(key)) continue;
        visit(item, evidenceContext);
      }
    }
  }

  function parseCandidateText(text, context) {
    for (const match of text.matchAll(EVIDENCE_ROW_RE)) {
      const productId = match[1] === match[3] ? match[1] : match[3];
      addRow(productId, match[2], context, 'evidence_row');
    }
    for (const match of text.matchAll(MUSINSA_PRODUCT_URL_RE)) {
      addRow(match[1], match[0], context, context.evidence ? 'evidence_url' : 'url');
    }
    for (const match of text.matchAll(PRODUCT_ID_RE)) {
      addRow(match[1], `https://www.musinsa.com/products/${match[1]}`, context, context.evidence ? 'evidence_product_id' : 'product_id');
    }
  }

  function addRow(productId, sourceUrl, context, extraction) {
    if (!/^\d{4,}$/.test(String(productId))) return;
    rows.push({
      product_id: String(productId),
      source_url: sourceUrl,
      source: context.source,
      package_id: context.package_id,
      evidence_source_url: context.source_url,
      extraction
    });
  }
}

function dedupeRows(rows) {
  const seen = new Set();
  const output = [];
  for (const row of rows) {
    const key = row.product_id;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(row);
  }
  return output;
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

function result({ source, product_ids, started, skipped = false, cache_hit = false, error, raw_count, candidate_rows = [], evidence_count, source_titles = [] }) {
  return {
    source,
    product_ids: normalizeIds(product_ids),
    candidate_rows: dedupeRows(candidate_rows),
    evidence_count,
    source_titles,
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
