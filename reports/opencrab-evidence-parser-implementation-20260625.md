# OpenCrab Evidence Parser Implementation — 2026-06-25

## Purpose

Improve the MUSINSA Personal Shopper hybrid retrieval path so the plugin can consume OpenCrab evidence chunks directly, rather than relying only on generated prose or simple top-level `product_id` fields.

This closes the next runtime gap after adding retrieval seed rows to OpenCrab: OpenCrab can now return evidence text containing canonical MUSINSA product links, and the plugin adapter parses those rows into stable candidate IDs and provenance metadata.

## Files changed

| File | Change |
|---|---|
| `src/opencrabRetrieval.mjs` | Added `extractOpenCrabCandidates` parser for OpenCrab evidence/results payloads, JSON-string MCP bridge payloads, MUSINSA product URLs, and retrieval seed rows. |
| `src/server.mjs` | Exposes parsed adapter metadata in `/products/search` response under `retrieval.opencrab_adapter`. |
| `openapi.yaml` | Documents `candidate_rows`, `evidence_count`, and `source_titles` in `opencrab_adapter`. |
| `tests/opencrabRetrieval.test.mjs` | Added coverage for evidence rows, JSON-encoded MCP bridge payloads, and adapter response metadata. |
| `scripts/verify-opencrab-evidence-parser.mjs` | Added local E2E verifier with a mock OpenCrab adapter and live plugin server. |

## Parser behavior

`extractOpenCrabCandidates` now supports:

- structured rows such as `{ product_id: "4227437" }`
- structured source URLs such as `https://www.musinsa.com/products/4227437`
- OpenCrab `evidence[].text` rows such as:
  - `- 4227437 https://www.musinsa.com/products/4227437 ...`
- OpenCrab/MCP bridge responses where the actual payload is JSON encoded inside a string field such as `result`
- fallback ID extraction from product URLs or `product_id` mentions

The parser returns:

```json
{
  "product_ids": ["3467738", "4024189", "4227437"],
  "rows": [
    {
      "product_id": "3467738",
      "source_url": "https://www.musinsa.com/products/3467738",
      "source": "2026-06-25 MUSINSA relaxed fit 175 88 retrieval seed rows",
      "package_id": "0b3c79f7-1861-4466-ba20-2cbaa736de66",
      "evidence_source_url": "mcp-pack-update:test",
      "extraction": "evidence_row"
    }
  ],
  "evidence_count": 1,
  "source_titles": ["2026-06-25 MUSINSA relaxed fit 175 88 retrieval seed rows"]
}
```

## API response impact

`POST /products/search` now includes adapter provenance:

```json
{
  "retrieval": {
    "opencrab_adapter": {
      "source": "opencrab_http",
      "product_id_count": 3,
      "candidate_rows": [
        {
          "product_id": "3467738",
          "source_url": "https://www.musinsa.com/products/3467738",
          "source": "2026-06-25 MUSINSA relaxed fit 175 88 retrieval seed rows",
          "package_id": "0b3c79f7-1861-4466-ba20-2cbaa736de66",
          "evidence_source_url": "mcp-pack-update:test",
          "extraction": "evidence_row"
        }
      ],
      "evidence_count": 1,
      "source_titles": ["2026-06-25 MUSINSA relaxed fit 175 88 retrieval seed rows"]
    }
  }
}
```

The runtime still uses local reranking after candidate extraction. This keeps the hot path deterministic and low-latency while using OpenCrab as the semantic candidate/provenance layer.

## Verification

### Unit tests

Command:

```bash
npm test
```

Result:

```text
# tests 28
# pass 28
# fail 0
```

New tests include:

- `extractOpenCrabCandidates parses evidence rows from OpenCrab project_run payloads`
- `extractOpenCrabCandidates parses JSON encoded result strings returned by MCP bridges`
- `resolveOpenCrabCandidates exposes evidence candidate rows and source titles from adapter responses`

### Local E2E verifier

Command:

```bash
node scripts/verify-opencrab-evidence-parser.mjs
```

Result summary:

```json
{
  "health_products_loaded": 2050,
  "status": 200,
  "result_ids": ["4227437", "3467738", "4024189"],
  "adapter_source": "opencrab_http",
  "adapter_product_id_count": 3,
  "adapter_evidence_count": 1,
  "adapter_source_titles": [
    "2026-06-25 MUSINSA relaxed fit 175 88 retrieval seed rows"
  ],
  "adapter_candidate_rows": [
    {
      "product_id": "3467738",
      "source_url": "https://www.musinsa.com/products/3467738",
      "source": "2026-06-25 MUSINSA relaxed fit 175 88 retrieval seed rows",
      "package_id": "0b3c79f7-1861-4466-ba20-2cbaa736de66",
      "evidence_source_url": "mcp-pack-update:test",
      "extraction": "evidence_row"
    }
  ]
}
```

## Notes

- The E2E verifier disables the default local OpenCrab candidate cache with `OPENCRAB_RETRIEVAL_CACHE_PATH=''` so the HTTP adapter path is exercised.
- `candidate_rows` are capped to 20 rows in the API response to avoid large provenance payloads.
- Product result ordering can differ from evidence order because local reranking still applies after candidate extraction.

## Next recommended step

Use the same parser against the real OpenCrab MCP/HTTP retrieval bridge once its endpoint is wired to return `project_run` or `search_documents` evidence payloads. Then run the existing mass search/category quality gates with `retrieval_mode: "hybrid"` and compare candidate-source coverage against local-index-only results.
