# OpenCrab Candidate Cache Verification — 2026-06-25

## Purpose

Verify the runtime fallback path requested for bottleneck reduction: when the OpenCrab remote adapter is not configured, `/products/search` in `hybrid` mode should use the generated candidate cache and still rerank locally.

## Generated artifacts

- `data/index/opencrab-candidate-cache.json`
- `opencrab-ingest/pending/musinsa-product-retrieval-candidates-compact-20260625.md`
- `opencrab-ingest/pending/musinsa-product-retrieval-candidates-20260625.md`
- `scripts/build-opencrab-candidate-cache.mjs`

## Build output

```text
npm run cache:opencrab
ok: true
out: data/index/opencrab-candidate-cache.json
query_count: 7
default_count: 10
```

## Runtime verification

Request:

```json
{
  "query": "남성 차콜 후드집업 5만원 이하",
  "retrieval_mode": "hybrid",
  "price_max": 50000,
  "limit": 3
}
```

Observed retrieval metadata:

```json
{
  "adapter": {
    "source": "opencrab_cache",
    "skipped": false,
    "cache_hit": true,
    "product_id_count": 20,
    "latency_ms": 1.679
  },
  "candidate_source": ["opencrab_candidates"],
  "candidate_count": 20,
  "matched_count": 3
}
```

Observed top reranked results:

| product_id | name | score |
|---|---|---:|
| 2712417 | 투웨이 에센셜 후드 집업-그레이 | 21.86 |
| 4671560 | VLAD 스트라이프 로고 후드 집업_블랙&그레이 | 21.86 |
| 5276035 | 빈티지 워싱 데님 워크 후드 집업_라이트 그레이 | 21.86 |

## OpenCrab project-run limitation observed

A direct OpenCrab `project_run` against the current product pack returned only one concrete candidate for this query (`3783092`). The evidence showed that the pack has high-level dataset facts and a few representative product rows, but not enough retrieval-friendly product rows exposed for `top_k=10`. To address that, the compact retrieval-candidate rows were generated for ingestion/update and a local fallback candidate cache was added for runtime resilience.

## Status

- Cache fallback path verified.
- Remote adapter path already verified by mock HTTP adapter test.
- Next production step: ingest/update the retrieval-candidate rows into the product ontology pack and/or point `OPENCRAB_RETRIEVAL_URL` to a real OpenCrab-backed retrieval HTTP service.
