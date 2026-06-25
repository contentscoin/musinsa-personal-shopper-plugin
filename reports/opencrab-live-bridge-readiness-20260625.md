# OpenCrab Live Bridge Readiness — 2026-06-25

## Purpose

Move the MUSINSA Personal Shopper OpenCrab retrieval bridge beyond fixture-only replay by adding two live-capable bridge modes:

1. `upstream` mode — forward retrieval requests to an HTTP OpenCrab service.
2. `command` mode — invoke a local command/CLI that reads the retrieval request JSON from stdin and returns OpenCrab-like JSON on stdout.

The existing fixture mode remains available for deterministic CI/reviewer demos.

## Bridge modes

| Mode | Trigger | Use case |
|---|---|---|
| `fixture` | no `OPENCRAB_BRIDGE_UPSTREAM_URL`, no `OPENCRAB_BRIDGE_COMMAND` | Deterministic demo/CI using captured real OpenCrab project_run fixture. |
| `upstream` | `OPENCRAB_BRIDGE_UPSTREAM_URL=https://...` | Production-style HTTP service that calls OpenCrab live. |
| `command` | `OPENCRAB_BRIDGE_COMMAND='...'` | Local/agent runner integration where a CLI or script calls OpenCrab and prints JSON. |

## New environment variables

| Variable | Description |
|---|---|
| `OPENCRAB_BRIDGE_COMMAND` | Shell command to execute for live command mode. Receives request JSON on stdin and must print OpenCrab-like JSON on stdout. |
| `OPENCRAB_BRIDGE_COMMAND_CWD` | Optional command working directory. Defaults to process cwd. |
| `OPENCRAB_BRIDGE_UPSTREAM_API_KEY` | Optional bearer token forwarded to `OPENCRAB_BRIDGE_UPSTREAM_URL`. |
| `OPENCRAB_BRIDGE_FALLBACK_ON_ERROR` | Defaults to true. If live upstream/command fails, bridge serves fixture payload with `bridge.mode=*_fallback_fixture`. Set `false` to fail hard. |

Existing variables still work:

- `OPENCRAB_BRIDGE_UPSTREAM_URL`
- `OPENCRAB_BRIDGE_TIMEOUT_MS`
- `OPENCRAB_BRIDGE_FIXTURE_PATH`
- `OPENCRAB_BRIDGE_PORT` / `PORT`

## Request/response contract

Command/upstream receives:

```json
{
  "query": "175cm 88kg 릴렉스핏",
  "top_k": 80,
  "project_name": "paperclipbase",
  "owner_tag": "hermes-profile:paperclipbase",
  "purpose": "musinsa_product_candidate_retrieval",
  "require_product_ids": true
}
```

It returns an OpenCrab-like object containing `evidence[]`. The bridge filters by `owner_tag`, scores evidence against the query, and returns the same `/retrieve` shape used by the plugin adapter.

## Files changed

| File | Change |
|---|---|
| `scripts/opencrab-retrieval-bridge.mjs` | Added command mode, upstream API key forwarding, health metadata, and fallback-on-error behavior. |
| `scripts/mock-opencrab-live-command.mjs` | Test command that mimics live OpenCrab by reading request JSON from stdin and returning the verified fixture payload. |
| `scripts/verify-opencrab-live-command-bridge.mjs` | Runtime verifier for command mode. |
| `package.json` | Added `verify:opencrab-live-bridge`. |

## Verification

### Command-mode live bridge verifier

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
  "evidence_count": 3,
  "first_source": "2026-06-25 MUSINSA relaxed fit 175 88 retrieval seed rows",
  "has_owner_tag": true
}
```

### Fixture bridge + plugin hybrid verifier

```bash
npm run verify:opencrab-bridge
```

Result highlights:

- bridge mode: `fixture`
- plugin products loaded: 2,050
- hybrid adapter source: `opencrab_http`
- product_id_count: 17
- evidence_count: 3
- candidate_rows include `product_id`, MUSINSA `source_url`, package_id, and evidence_source_url

### Hybrid quality gate

```bash
npm run test:hybrid-opencrab
```

Result:

```json
{
  "passed": 60,
  "failed": 0,
  "local_nonempty": 59,
  "hybrid_nonempty": 60,
  "opencrab_provenance_coverage": 60
}
```

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

### Dashboard guardrail

```bash
npm run verify:dashboard
```

Result:

```json
{
  "health_products_loaded": 2050,
  "dashboard_has_live_badge": true,
  "dashboard_has_fallback_badge": true,
  "dashboard_has_refresh_button": true,
  "dashboard_has_auto_refresh": true,
  "summary_total_events": 16,
  "insights_count": 7
}
```

## Current limitation

This commit makes the bridge live-capable and verifies command-mode behavior with a mock command. It does not ship credentials or a direct OpenCrab SaaS endpoint. To switch to actual live OpenCrab, deploy/provide one of:

1. An HTTP upstream that calls OpenCrab and set `OPENCRAB_BRIDGE_UPSTREAM_URL`.
2. A local command that can call OpenCrab and set `OPENCRAB_BRIDGE_COMMAND`.

## Recommended next step

Implement the real command/upstream adapter for the user's OpenCrab MCP runtime, then rerun:

```bash
npm run verify:opencrab-live-bridge
npm run verify:opencrab-bridge
npm run test:hybrid-opencrab
```
