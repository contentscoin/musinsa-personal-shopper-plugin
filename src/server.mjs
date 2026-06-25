import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { loadProducts, searchProductsWithRetrieval, getProduct, getCatalogLexicon } from './productStore.mjs';
import { compare, recommend, summarizeProduct } from './personalShopper.mjs';
import { clearShortlist, getShortlist, saveShortlist } from './shortlistStore.mjs';
import { ANALYTICS_NOTICE, analyticsDashboard, buildTelemetrySummary, recordTelemetryEvent } from './telemetryStore.mjs';
import { HttpError, corsHeaders, readJsonBody, safeErrorPayload } from './httpUtils.mjs';
import { resolveOpenCrabCandidates } from './opencrabRetrieval.mjs';

const products = await loadProducts().catch(() => []);
const port = Number(process.env.PORT ?? 8787);
const LOGO_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAGXRFWHRTb2Z0d2FyZQBNVVNJTlNBIFBTIGxvZ28t/7d8AAAAK0lEQVR4nO3BAQ0AAADCoPdPbQ43oAAAAAAAAAAAAAAAAAAAAAAA4GkYQAAAAR5p7+0AAAAASUVORK5CYII=', 'base64');

const ROUTES = new Map([
  ['/health', ['GET']],
  ['/openapi.yaml', ['GET']],
  ['/.well-known/ai-plugin.json', ['GET']],
  ['/dashboard', ['GET']],
  ['/dashboard.html', ['GET']],
  ['/logo.png', ['GET']],
  ['/products/search', ['POST']],
  ['/shopper/recommend', ['POST']],
  ['/shopper/shortlist', ['POST']],
  ['/shopper/compare', ['POST']],
  ['/analytics/events', ['POST']],
  ['/analytics/notice', ['GET']],
  ['/analytics/summary', ['GET']],
  ['/analytics/export', ['POST']],
  ['/analytics/funnel', ['GET']],
  ['/analytics/products', ['GET']],
  ['/analytics/queries', ['GET']],
  ['/analytics/intents', ['GET']],
  ['/analytics/insights', ['GET']]
]);

export async function handleRequest(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === 'OPTIONS') return empty(res, 204);
    enforceKnownRouteMethod(url.pathname, req.method);
    if (req.method === 'GET' && url.pathname === '/health') {
      const lexicon = getCatalogLexicon(products);
      return json(res, { ok: true, products_loaded: products.length, search_index: { enabled: true, brands: lexicon.brands.length, categories: lexicon.categories.length, terms: lexicon.terms.length } });
    }
    if (req.method === 'GET' && url.pathname === '/openapi.yaml') return text(res, withPublicBaseUrl(await readFile(new URL('../openapi.yaml', import.meta.url), 'utf8'), publicBaseUrl(req)), 'application/yaml; charset=utf-8');
    if (req.method === 'GET' && url.pathname === '/.well-known/ai-plugin.json') return text(res, withPublicBaseUrl(await readFile(new URL('../.well-known/ai-plugin.json', import.meta.url), 'utf8'), publicBaseUrl(req)), 'application/json; charset=utf-8');
    if (req.method === 'GET' && (url.pathname === '/dashboard' || url.pathname === '/dashboard.html')) return text(res, await readFile(new URL('../docs/dashboard-mock.html', import.meta.url), 'utf8'), 'text/html; charset=utf-8');
    if (req.method === 'GET' && url.pathname === '/logo.png') return binary(res, LOGO_PNG, 'image/png');
    if (req.method === 'POST' && url.pathname === '/products/search') {
      const payload = await body(req);
      const opencrab = await resolveOpenCrabCandidates(payload);
      const response = searchProductsWithRetrieval(products, {
        ...payload,
        opencrab_candidate_product_ids: payload.opencrab_candidate_product_ids ?? payload.candidate_product_ids ?? opencrab.product_ids
      });
      response.retrieval.opencrab_adapter = {
        source: opencrab.source,
        skipped: opencrab.skipped,
        cache_hit: opencrab.cache_hit,
        product_id_count: opencrab.product_ids.length,
        candidate_rows: opencrab.candidate_rows?.slice(0, 20) ?? [],
        evidence_count: opencrab.evidence_count,
        source_titles: opencrab.source_titles ?? [],
        raw_count: opencrab.raw_count,
        latency_ms: opencrab.latency_ms,
        error: opencrab.error
      };
      response.retrieval.latency_ms.candidate_retrieval = opencrab.latency_ms;
      response.retrieval.latency_ms.total = Number((response.retrieval.latency_ms.total + opencrab.latency_ms).toFixed(3));
      return json(res, response);
    }

    const productMatch = url.pathname.match(/^\/products\/([^/]+)$/);
    if (req.method === 'GET' && productMatch) {
      const product = getProduct(products, productMatch[1]);
      return product ? json(res, product) : json(res, { error: 'Product not found' }, 404);
    }
    const summaryMatch = url.pathname.match(/^\/products\/([^/]+)\/reviews\/summary$/);
    if (req.method === 'POST' && summaryMatch) {
      const product = getProduct(products, summaryMatch[1]);
      if (!product) return json(res, { error: 'Product not found' }, 404);
      const payload = await body(req);
      return json(res, summarizeProduct(product, payload.customer_profile ?? {}));
    }
    if (req.method === 'POST' && url.pathname === '/shopper/recommend') return json(res, recommend(products, await body(req)));
    if (req.method === 'POST' && url.pathname === '/shopper/shortlist') return json(res, saveShortlist(products, await body(req)));
    const shortlistMatch = url.pathname.match(/^\/shopper\/shortlist\/([^/]+)$/);
    if (req.method === 'GET' && shortlistMatch) return json(res, getShortlist(shortlistMatch[1]));
    if (req.method === 'DELETE' && shortlistMatch) return json(res, clearShortlist(shortlistMatch[1]));
    if (req.method === 'POST' && url.pathname === '/shopper/compare') {
      const payload = await body(req);
      return json(res, compare(products, payload.product_ids ?? []));
    }
    if (req.method === 'POST' && url.pathname === '/analytics/events') return json(res, { ok: true, event: await recordTelemetryEvent(await body(req)) });
    if (req.method === 'GET' && url.pathname === '/analytics/notice') return json(res, ANALYTICS_NOTICE);
    if (req.method === 'GET' && url.pathname === '/analytics/summary') return json(res, await buildTelemetrySummary());
    if (req.method === 'POST' && url.pathname === '/analytics/export') return json(res, await buildTelemetrySummary());
    const analyticsMatch = url.pathname.match(/^\/analytics\/(funnel|products|queries|intents|insights)$/);
    if (req.method === 'GET' && analyticsMatch) return json(res, await analyticsDashboard(analyticsMatch[1]));
    return json(res, { error: { code: 'not_found', message: 'Not found' } }, 404);
  } catch (error) {
    const status = Number(error?.status ?? 500);
    return json(res, safeErrorPayload(error), status);
  }
}

if (isDirectRun()) {
  const server = http.createServer(handleRequest);
  server.listen(port, () => console.log(`MUSINSA Personal Shopper Plugin listening on :${port} (${products.length} products loaded)`));
}

export default handleRequest;

async function body(req) {
  return readJsonBody(req);
}

function enforceKnownRouteMethod(pathname, method) {
  const methods = ROUTES.get(pathname);
  if (methods && !methods.includes(method)) {
    throw new HttpError(405, 'method_not_allowed', `Method ${method} is not allowed for ${pathname}`, { allowed_methods: methods });
  }
}

function json(res, payload, status = 200) {
  res.writeHead(status, corsHeaders({ 'content-type': 'application/json; charset=utf-8' }));
  res.end(JSON.stringify(payload, null, 2));
}

function text(res, payload, contentType, status = 200) {
  res.writeHead(status, corsHeaders({ 'content-type': contentType }));
  res.end(payload);
}

function binary(res, payload, contentType, status = 200) {
  res.writeHead(status, corsHeaders({ 'content-type': contentType, 'content-length': String(payload.length) }));
  res.end(payload);
}

function empty(res, status = 204) {
  res.writeHead(status, corsHeaders());
  res.end();
}

function publicBaseUrl(req) {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  const forwardedProto = String(req.headers['x-forwarded-proto'] ?? '').split(',')[0].trim();
  const proto = forwardedProto || (process.env.VERCEL ? 'https' : 'http');
  const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${port}`;
  return `${proto}://${host}`.replace(/\/$/, '');
}

function withPublicBaseUrl(content, baseUrl) {
  return content
    .replaceAll('http://localhost:8787', baseUrl)
    .replaceAll('https://YOUR_PUBLIC_HOST', baseUrl);
}

function isDirectRun() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}
