# Real OpenCrab Retrieval Bridge Verification — 2026-06-25

## Purpose

Connect the MUSINSA Personal Shopper Plugin's existing `OPENCRAB_RETRIEVAL_URL` adapter seam to a real OpenCrab evidence payload shape and verify that hybrid search can use OpenCrab candidate/provenance rows while the plugin still performs local reranking.

This follows the previous parser work:

- OpenCrab returns evidence chunks from the MUSINSA product ontology pack.
- The bridge exposes those chunks through an HTTP `/retrieve` endpoint.
- The plugin parses `product_id + source_url + provenance` from `evidence[].text`.
- `/products/search` reranks the candidate IDs against the local 2,050-product catalog.

## Important implementation boundary

The local Node runtime cannot call Hermes MCP tools directly. Therefore this repo-level bridge supports two modes:

1. `fixture` mode — uses a verified real OpenCrab MCP `project_run` payload captured from the `paperclipbase` project.
2. `upstream` mode — forwards the same adapter request to a future live OpenCrab HTTP endpoint via `OPENCRAB_BRIDGE_UPSTREAM_URL`.

The verification below used fixture mode, but the fixture is not synthetic: it was generated from a real `mcp_opencrab_opencrab_project_run` call against project `paperclipbase` and product pack `0b3c79f7-1861-4466-ba20-2cbaa736de66`.

## Files added/changed

| File | Purpose |
|---|---|
| `scripts/opencrab-retrieval-bridge.mjs` | HTTP bridge exposing `POST /retrieve`; fixture mode now, upstream forwarding when configured. |
| `scripts/verify-real-opencrab-bridge.mjs` | Starts bridge + plugin server, compares local-only vs hybrid result path. |
| `data/index/opencrab-real-project-run-sample.json` | Verified real OpenCrab MCP project_run evidence sample. |
| `package.json` | Added `bridge:opencrab` and `verify:opencrab-bridge` scripts. |

## OpenCrab evidence source

- Project: `paperclipbase`
- Product pack: `[hermes-profile:paperclipbase] musinsa-product-db-personal-shopper-sample-20260624`
- Package ID: `0b3c79f7-1861-4466-ba20-2cbaa736de66`
- Product pack version at verification: `3.8.0`
- Owner tag: `hermes-profile:paperclipbase`

Verified evidence source titles included:

- `2026-06-25 MUSINSA relaxed fit 175 88 retrieval seed rows`
- `2026-06-25 MUSINSA office shirt retrieval seed rows`
- `2026-06-25 MUSINSA summer tee retrieval seed rows`

## Usage

Start the bridge in fixture mode:

```bash
npm run bridge:opencrab
```

Start the plugin with the bridge:

```bash
PORT=8792 \
OPENCRAB_RETRIEVAL_URL=http://127.0.0.1:8791/retrieve \
OPENCRAB_RETRIEVAL_CACHE_PATH='' \
OPENCRAB_RETRIEVAL_TIMEOUT_MS=4000 \
node src/server.mjs
```

Run the automated verification:

```bash
npm run verify:opencrab-bridge
```

To use a future live OpenCrab HTTP endpoint instead of the captured real fixture:

```bash
OPENCRAB_BRIDGE_UPSTREAM_URL=https://example-opencrab-retrieval/retrieve \
npm run bridge:opencrab
```

## Verification result

Command:

```bash
npm run verify:opencrab-bridge
```

Result summary:

```json
{
  "bridge_health": {
    "ok": true,
    "mode": "fixture",
    "port": 8791
  },
  "plugin_products_loaded": 2050,
  "query": "오버핏 셔츠 175cm 88kg 릴렉스핏",
  "local": {
    "result_ids": ["2034137", "2035287", "1388775", "3417714", "996177"],
    "candidate_source": ["local_index"],
    "matched_count": 5
  },
  "hybrid": {
    "result_ids": ["4227437", "2312232", "4336536", "4695924", "2112061"],
    "candidate_source": ["opencrab_candidates"],
    "matched_count": 5,
    "opencrab_adapter": {
      "source": "opencrab_http",
      "product_id_count": 17,
      "evidence_count": 3,
      "source_titles": [
        "2026-06-25 MUSINSA relaxed fit 175 88 retrieval seed rows",
        "2026-06-25 MUSINSA office shirt retrieval seed rows",
        "2026-06-25 MUSINSA summer tee retrieval seed rows"
      ]
    }
  }
}
```

## Interpretation

- Local-only search used the plugin's local index and returned local lexical matches.
- Hybrid search called the OpenCrab bridge through `OPENCRAB_RETRIEVAL_URL`.
- The plugin parsed 17 product IDs from 3 real OpenCrab evidence chunks.
- The plugin then reranked those candidates locally and returned 5 matched products.
- The response preserved candidate provenance through `candidate_rows` and `source_titles`.

This confirms the intended bottleneck architecture:

```text
OpenCrab ontology pack/search evidence
  -> HTTP retrieval bridge
  -> plugin OpenCrab adapter
  -> product_id/source_url/provenance parser
  -> local 2,050-product reranker
  -> /products/search response
```

## Test suite

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

Syntax checks also passed for:

- `scripts/opencrab-retrieval-bridge.mjs`
- `scripts/verify-real-opencrab-bridge.mjs`
- `scripts/verify-opencrab-evidence-parser.mjs`

## Limitations

- The bridge is live at the HTTP adapter level but uses a captured real OpenCrab MCP fixture unless `OPENCRAB_BRIDGE_UPSTREAM_URL` is configured.
- A fully live production bridge still needs a stable OpenCrab HTTP retrieval endpoint or a separate service that can call OpenCrab MCP tools server-side.
- The current fixture contains representative seed evidence, not the full 2,050-product catalog.

## Next recommended step

Add a real upstream service for `OPENCRAB_BRIDGE_UPSTREAM_URL` that calls OpenCrab `project_run` or `search_documents` for each request, then run the existing mass search/category quality gates with `retrieval_mode: "hybrid"` and compare:

- coverage rate
- latency p50/p95
- candidate count
- result overlap vs local-only
- source title/provenance coverage
