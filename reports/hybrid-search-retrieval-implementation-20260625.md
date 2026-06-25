# Hybrid Search Retrieval Implementation Report — 2026-06-25

## Purpose

The user's intended use of OpenCrab ontology packs is bottleneck reduction: OpenCrab should provide semantic candidate product IDs and provenance, while the plugin server keeps a low-latency local index/cache in the serving hot path and reranks candidates locally.

## Implemented architecture

```text
User query
  -> plugin intent/search request
  -> precomputed local catalog index + catalog-derived lexicon
  -> optional OpenCrab ontology candidate product_ids
  -> local rerank with price/gender/brand/category/review signals
  -> final product cards + retrieval metadata + source_url
```

## Changed files

- `src/productStore.mjs`
  - Added precomputed attached search index.
  - Added catalog-derived lexicon from product brands, category paths, colors, ai_tags, and static synonym groups.
  - Added `searchProductsWithRetrieval()` returning `{ results, retrieval }`.
  - Added hybrid reranking support via `candidate_product_ids` / `opencrab_candidate_product_ids`.
  - Kept `searchProducts()` backwards-compatible for existing recommendation code.
- `src/server.mjs`
  - `/products/search` now returns retrieval metadata.
  - `/health` now exposes search index/lexicon counts.
- `scripts/build-search-index.mjs`
  - Exports `data/index/products.search-index.json`.
- `scripts/benchmark-search-index.mjs`
  - Creates latency report for the new local index hot path.
- `openapi.yaml`
  - Added `retrieval_mode`, `candidate_product_ids`, `opencrab_candidate_product_ids`.
  - Added `ProductSearchResponse` schema with retrieval metadata.
- `tests/personalShopper.test.mjs`
  - Added tests for local-index metadata, hybrid OpenCrab candidate rerank hook, and catalog-derived lexicon.
- `README.md`
  - Documented hybrid retrieval usage and scripts.

## Generated artifacts

- `data/index/products.search-index.json`
- `reports/search-index-benchmark-20260625.md`

## Index stats

| Metric | Count |
|---|---:|
| Products | 2,050 |
| Brand tokens | 1,416 |
| Category terms | 436 |
| Lexicon terms | 549 |

## Benchmark

Command:

```bash
npm run benchmark:search
```

| Query | Avg ms | Result count | Candidate count |
|---|---:|---:|---:|
| 남성 차콜 후드집업 5만원 이하 | 7.853 | 10 | 2050 |
| 화이트 스니커즈 | 5.562 | 10 | 2050 |
| 여름 반팔 티셔츠 | 5.177 | 10 | 2050 |
| 오버핏 니트 | 4.718 | 10 | 2050 |
| 블랙 코튼 팬츠 | 7.151 | 10 | 2050 |
| 가디건 출근룩 | 4.529 | 10 | 2050 |

## Runtime verification

Health endpoint:

```json
{
  "ok": true,
  "products_loaded": 2050,
  "search_index": {
    "enabled": true,
    "brands": 1416,
    "categories": 436,
    "terms": 549
  }
}
```

Hybrid search request:

```json
{
  "query": "남성 차콜 후드집업 5만원 이하",
  "retrieval_mode": "hybrid",
  "opencrab_candidate_product_ids": ["3783092", "4567792", "1163169"],
  "price_max": 50000,
  "limit": 3
}
```

Verified response metadata:

```json
{
  "mode": "hybrid",
  "candidate_source": ["opencrab_candidates"],
  "local_index_used": true,
  "opencrab_candidates_used": true,
  "candidate_count": 3,
  "matched_count": 2,
  "cache_hit": true
}
```

## Quality gates

```text
npm test
# tests 19
# pass 19
# fail 0
```

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

```text
cd owner-dashboard && npm run build
✓ built
```

## Remaining work

1. Replace manual `opencrab_candidate_product_ids` with a production OpenCrab retrieval adapter or exported candidate cache.
2. Add cache invalidation/versioning keyed by OpenCrab pack version and product index build time.
3. Add p95/p99 latency tracking once production traffic exists.
4. Expand `parseShoppingIntent()` itself with the generated catalog lexicon, not only the search layer.
