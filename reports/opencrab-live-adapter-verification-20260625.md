# OpenCrab Live Adapter Verification — 2026-06-25

## Purpose

Implement and verify a command adapter that can connect the MUSINSA Personal Shopper plugin bridge to live OpenCrab `project_run`-style retrieval instead of relying only on static fixture replay.

## What changed

| File | Change |
|---|---|
| `scripts/opencrab-live-command.mjs` | New command adapter. Reads bridge request JSON from stdin, builds a MUSINSA candidate retrieval `project_run` task, calls `OPENCRAB_PROJECT_RUN_URL` when configured, or reads `OPENCRAB_LIVE_RESPONSE_PATH` for verified captured payload tests. Outputs OpenCrab-like JSON with `evidence[]`. |
| `data/index/opencrab-live-project-run-verification-20260625.json` | Compact captured verification payload from actual Hermes OpenCrab MCP `project_run` against project `paperclipbase`, `reverse_ingest=false`. |
| `scripts/verify-opencrab-live-command-bridge.mjs` | Updated to exercise `scripts/opencrab-live-command.mjs` through bridge command mode. |
| `README.md` | Documented `OPENCRAB_PROJECT_RUN_URL`, `OPENCRAB_PROJECT_RUN_API_KEY`, `OPENCRAB_LIVE_RESPONSE_PATH`, and live command usage. |

## Important environment variables

```bash
OPENCRAB_BRIDGE_COMMAND='node scripts/opencrab-live-command.mjs'
OPENCRAB_PROJECT_RUN_URL='https://your-opencrab-project-run-service.example/run'
OPENCRAB_PROJECT_RUN_API_KEY='optional-bearer-token'
OPENCRAB_LIVE_RESPONSE_PATH='data/index/opencrab-live-project-run-verification-20260625.json'
OPENCRAB_BRIDGE_FALLBACK_ON_ERROR=false # optional strict mode
```

Runtime path:

```text
plugin /products/search retrieval_mode=hybrid
  -> OPENCRAB_RETRIEVAL_URL=http://127.0.0.1:8791/retrieve
  -> opencrab-retrieval-bridge command mode
  -> opencrab-live-command.mjs
  -> OpenCrab project_run HTTP service or captured live verification payload
  -> evidence[] with product_id/source_url rows
  -> plugin candidate_rows + local rerank
```

## Actual OpenCrab MCP live check

A live Hermes OpenCrab MCP call was executed with:

```text
project_name: paperclipbase
reverse_ingest: false
top_k: 10
task: return compact MUSINSA product_id/source_url evidence rows for 175cm 88kg 릴렉스핏 남성 여유핏; include only packs tagged hermes-profile:paperclipbase
```

Result highlights:

| Field | Value |
|---|---:|
| status | ok |
| project | paperclipbase |
| package_count | 23 |
| target product DB pack | `0b3c79f7-1861-4466-ba20-2cbaa736de66` v3.8.0 |
| returned evidence chunks | 10 |
| direct relaxed-fit candidates in answer | 6 |
| reverse_ingest | false |

Representative candidate rows from live MCP result:

```text
3467738 https://www.musinsa.com/products/3467738
4024189 https://www.musinsa.com/products/4024189
4336536 https://www.musinsa.com/products/4336536
4227437 https://www.musinsa.com/products/4227437
2385283 https://www.musinsa.com/products/2385283
2112061 https://www.musinsa.com/products/2112061
```

## Verification commands and outputs

### Live command bridge verifier

```bash
npm run verify:opencrab-live-bridge
```

Result:

```json
{
  "health": {
    "ok": true,
    "mode": "command",
    "port": 8796,
    "upstream_configured": false,
    "command_configured": true,
    "fallback_on_error": true
  },
  "http_status": 200,
  "bridge": {
    "mode": "command",
    "configured_mode": "command",
    "project_name": "paperclipbase",
    "owner_tag": "hermes-profile:paperclipbase",
    "query": "175cm 88kg 릴렉스핏",
    "top_k": 10
  },
  "evidence_count": 2,
  "first_source": "2026-06-25 MUSINSA relaxed fit 175 88 retrieval seed rows",
  "has_owner_tag": true
}
```

### Hybrid quality gate through command adapter

```bash
OPENCRAB_BRIDGE_COMMAND='node scripts/opencrab-live-command.mjs' \
OPENCRAB_LIVE_RESPONSE_PATH='data/index/opencrab-live-project-run-verification-20260625.json' \
npm run test:hybrid-opencrab
```

Result:

```json
{
  "passed": 60,
  "failed": 0,
  "local_nonempty": 59,
  "hybrid_nonempty": 60,
  "opencrab_provenance_coverage": 60,
  "avg_overlap": 0.22,
  "local_latency_ms": { "p50": 6.53, "p95": 9.99, "max": 12.57 },
  "hybrid_latency_ms": { "p50": 37.64, "p95": 43.3, "max": 61.43 }
}
```

### Existing fixture bridge verifier

```bash
npm run verify:opencrab-bridge
```

Result highlights:

- bridge mode: `fixture`
- plugin products loaded: 2,050
- hybrid adapter source: `opencrab_http`
- product_id_count: 17
- evidence_count: 3
- candidate_rows preserve product_id, MUSINSA source_url, package_id, evidence_source_url

### Unit tests

```bash
npm test
```

Result:

```text
# tests 30
# pass 30
# fail 0
```

## Current limitation

The repo now has a real command adapter contract and a verified captured live OpenCrab payload. To perform true production live calls on every request, an HTTP endpoint must be provided via `OPENCRAB_PROJECT_RUN_URL` that exposes the existing OpenCrab `project_run` capability. Without that endpoint, `OPENCRAB_LIVE_RESPONSE_PATH` is a deterministic verification mode, not fresh per-request retrieval.

The local `uv run opencrab query` CLI was tested but points at unrelated local OpenCrab storage, not the profile-owned SaaS/project packs, so it is intentionally not used as the MUSINSA live adapter backend.

## Next step

Expose or deploy a small authenticated OpenCrab project_run HTTP service, set:

```bash
OPENCRAB_PROJECT_RUN_URL=...
OPENCRAB_PROJECT_RUN_API_KEY=...
OPENCRAB_BRIDGE_COMMAND='node scripts/opencrab-live-command.mjs'
```

Then rerun:

```bash
npm run verify:opencrab-live-bridge
OPENCRAB_BRIDGE_COMMAND='node scripts/opencrab-live-command.mjs' npm run test:hybrid-opencrab
npm test
```
