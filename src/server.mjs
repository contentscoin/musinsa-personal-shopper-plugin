import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { loadProducts, searchProducts, getProduct } from './productStore.mjs';
import { compare, recommend, summarizeProduct } from './personalShopper.mjs';
import { clearShortlist, getShortlist, saveShortlist } from './shortlistStore.mjs';
import { ANALYTICS_NOTICE, analyticsDashboard, buildTelemetrySummary, recordTelemetryEvent } from './telemetryStore.mjs';

const products = await loadProducts().catch(() => []);
const port = Number(process.env.PORT ?? 8787);

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === 'GET' && url.pathname === '/health') return json(res, { ok: true, products_loaded: products.length });
    if (req.method === 'GET' && url.pathname === '/openapi.yaml') return text(res, await readFile(new URL('../openapi.yaml', import.meta.url), 'utf8'), 'application/yaml; charset=utf-8');
    if (req.method === 'GET' && url.pathname === '/.well-known/ai-plugin.json') return text(res, await readFile(new URL('../.well-known/ai-plugin.json', import.meta.url), 'utf8'), 'application/json; charset=utf-8');
    if (req.method === 'GET' && url.pathname === '/logo.png') return text(res, '', 'image/png');
    if (req.method === 'POST' && url.pathname === '/products/search') return json(res, { results: searchProducts(products, await body(req)) });

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
    return json(res, { error: 'Not found' }, 404);
  } catch (error) {
    return json(res, { error: error.message }, 500);
  }
});

server.listen(port, () => console.log(`MUSINSA Personal Shopper Plugin listening on :${port} (${products.length} products loaded)`));

async function body(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8') || '{}';
  return JSON.parse(text);
}

function json(res, payload, status = 200) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload, null, 2));
}

function text(res, payload, contentType, status = 200) {
  res.writeHead(status, { 'content-type': contentType });
  res.end(payload);
}
