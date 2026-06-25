# OpenCrab Retrieval Adapter + Lexicon Intent Update — 2026-06-25

## Purpose

Continue the bottleneck-oriented hybrid retrieval work by adding a production-facing adapter seam: OpenCrab or an OpenCrab-backed service can now return semantic candidate product IDs, while the plugin server keeps local-index reranking in the hot path. Also expanded shopping intent parsing to use the catalog-derived lexicon.

## Implemented

### OpenCrab retrieval adapter

Added `src/opencrabRetrieval.mjs`:

- `resolveOpenCrabCandidates(request, options)`
  - Uses direct `candidate_product_ids` / `opencrab_candidate_product_ids` first.
  - Skips remote calls unless `retrieval_mode` is `hybrid` or `opencrab_first`.
  - Supports `OPENCRAB_RETRIEVAL_CACHE_PATH` for local candidate cache.
  - Supports `OPENCRAB_RETRIEVAL_URL` HTTP POST adapter with timeout.
  - Extracts product IDs from structured JSON fields (`product_id`, `productId`) and MUSINSA source URLs.
  - Returns non-fatal adapter status so server can fall back to local index on timeout/error.

Environment variables:

```bash
OPENCRAB_RETRIEVAL_URL=https://your-adapter.example/retrieve
OPENCRAB_RETRIEVAL_TIMEOUT_MS=1200
OPENCRAB_PROJECT_NAME=paperclipbase
OPENCRAB_OWNER_TAG=hermes-profile:paperclipbase
OPENCRAB_RETRIEVAL_API_KEY=optional
OPENCRAB_RETRIEVAL_CACHE_PATH=optional/local-candidate-cache.json
```

Adapter request contract:

```json
{
  "query": "남성 차콜 후드집업",
  "top_k": 80,
  "project_name": "paperclipbase",
  "owner_tag": "hermes-profile:paperclipbase",
  "purpose": "musinsa_product_candidate_retrieval",
  "require_product_ids": true
}
```

### Server integration

Updated `src/server.mjs`:

- `/products/search` now calls the adapter when appropriate.
- Adapter candidates flow into `searchProductsWithRetrieval()` as `opencrab_candidate_product_ids`.
- Response includes `retrieval.opencrab_adapter` status:
  - `source`
  - `skipped`
  - `cache_hit`
  - `product_id_count`
  - `raw_count`
  - `latency_ms`
  - `error`

### Catalog lexicon intent parsing

Updated `src/personalShopper.mjs`:

- `parseShoppingIntent(request, catalogLexicon)` can now use the generated product lexicon.
- `recommend(products, request)` passes `getCatalogLexicon(products)` into intent parsing.
- Brand detection can now use catalog brand names instead of only explicit `request.brand`.
- Category discovery can now use catalog categories/terms beyond the old static list.

### MCP/OpenAPI/docs

- Updated `openapi.yaml` with adapter-related request/response fields.
- Updated `scripts/musinsa-mcp-server.mjs` input schema for retrieval mode and OpenCrab candidate fields.
- Added `scripts/test-opencrab-retrieval-adapter.mjs`.
- Updated README with adapter env vars and contract.

## Verification

### Unit tests

```text
npm test
# tests 24
# pass 24
# fail 0
```

New coverage:

- Product ID extraction from ontology payloads and source URLs.
- Adapter skip behavior outside hybrid/opencrab_first modes.
- Mock HTTP adapter call and candidate extraction.
- OpenCrab payload contains project name and owner tag.
- Catalog lexicon intent parsing detects brand/category.

### Adapter integration test

```text
npm run test:opencrab-adapter
ok: true
adapter source: opencrab_http
candidate_count: 3
matched_count: 2
candidate_retrieval_ms: 16.422
rerank_ms: 1.495
```

Generated:

- `reports/opencrab-retrieval-adapter-test-20260625.json`
- `reports/opencrab-retrieval-adapter-test-20260625.md`

### OpenAPI / manifest

```text
node scripts/test-openapi-manifest-connection.mjs
passed: true
failure_count: 0
products_loaded: 2050
openapi_paths: 17
schemas: 13
operation_ids: 18
unresolved_refs: 0
```

### Search/recommendation gates

```text
product search API: 320/320 pass, p95 12.1ms
category recommendation: 160/160 pass, p95 14.41ms
ranking signal: 85/85 pass, p95 14.28ms
```

### Search benchmark

```text
local-index benchmark over 2,050 products:
min avg query: 4.281ms
max avg query: 7.879ms
```

## Remaining work

1. Connect `OPENCRAB_RETRIEVAL_URL` to a real OpenCrab project-run/search service instead of the mock adapter.
2. Add cache invalidation keyed by OpenCrab pack version and `data/index/products.search-index.json` build time.
3. Add p95/p99 runtime telemetry for adapter latency and fallback rates.
4. Consider precomputing sorted lexicon match lists to reduce category recommendation p95 latency after lexicon expansion.
