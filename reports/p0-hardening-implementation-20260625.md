# P0 Hardening Implementation Report — 2026-06-25

## Scope

Implemented the first Kilo-prioritized P0 pass for the MUSINSA Personal Shopper Plugin:

1. API robustness and safe error handling.
2. Analytics consent metadata.
3. Plugin telemetry -> Convex live sync path.
4. Convex audit events for telemetry inserts/seeds.

## Changed files

- `src/httpUtils.mjs`
- `src/server.mjs`
- `src/telemetryStore.mjs`
- `tests/p0Hardening.test.mjs`
- `openapi.yaml`
- `owner-dashboard/convex/schema.ts`
- `owner-dashboard/convex/analytics.ts`
- `owner-dashboard/convex/http.ts`
- `owner-dashboard/package.json`
- `owner-dashboard/package-lock.json`
- `owner-dashboard/tsconfig.json`
- `README.md`

## Implemented details

### API robustness

- Added `readJsonBody()` with configurable max JSON body size via `MAX_JSON_BODY_BYTES`.
- Invalid JSON returns safe structured 400 errors.
- Oversized JSON returns 413 `payload_too_large`.
- Internal errors are masked as `Internal server error` instead of returning raw exception messages.
- Added CORS headers and `OPTIONS` handling.
- Added 405 `method_not_allowed` for known static routes with wrong methods.

### Consent metadata

- Added analytics notice version: `2026-06-25.p0-consent-convex-sync`.
- Added consent fields to sanitized telemetry events:
  - `consent.granted`
  - `consent.notice_version`
  - `consent.mode`
- Added optional `ANALYTICS_CONSENT_REQUIRED=true`; when enabled, `/analytics/events` rejects events without consent with 403 `analytics_consent_required`.
- Updated OpenAPI schema with consent fields and error response schema.

### Convex live sync

- Added optional plugin server env vars:
  - `CONVEX_TELEMETRY_URL=https://veracious-albatross-267.convex.site/telemetry/ingest`
  - `CONVEX_TELEMETRY_SECRET` when Convex `TELEMETRY_INGEST_SECRET` is configured.
- `recordTelemetryEvent()` still writes local JSONL, then optionally POSTs sanitized camelCase event to Convex.
- Added Convex HTTP action:
  - `POST /telemetry/ingest`
  - `OPTIONS /telemetry/ingest`
- The Convex action calls `analytics.recordEvent` for idempotent insert.

### Convex audit events

- Added `auditEvents` table with indexes:
  - `by_action`
  - `by_occurred_at`
- `recordEvent` and `seedEvents` insert audit rows containing action, actor, target event ID, result, event type, and consent metadata.

## Verification

### Unit tests

```text
npm test
# tests 16
# pass 16
# fail 0
```

New test coverage:

- Invalid JSON -> 400 safe error.
- Oversized JSON -> 413.
- Internal errors are masked.
- Consent metadata is attached to sanitized telemetry.
- Plugin telemetry sync posts sanitized event to configured Convex ingest URL.

### Owner dashboard build

```text
cd owner-dashboard
npm run build
✓ built
```

### Convex deploy

```text
✔ Added table indexes:
  [+] auditEvents.by_action   action, _creationTime
  [+] auditEvents.by_occurred_at   occurredAt, _creationTime
✔ Deployed Convex functions to https://veracious-albatross-267.convex.cloud
```

### Convex HTTP ingest verification

```text
POST https://veracious-albatross-267.convex.site/telemetry/ingest
=> {"ok":true,"id":"j9704ww63m2ypfjmd93ddxepqx89avx2","inserted":true}
```

### Vercel verification

```text
https://owner-dashboard-snowy.vercel.app
HTTP/2 200
```

Deployment inspect URL:

```text
https://vercel.com/jakes-projects-0ab50f91/owner-dashboard/Fo6Yn2KSEwpZLvEaVkvfV1ecuCkn
```

## Remaining work

- True owner dashboard access control should use Vercel Deployment Protection/OAuth/SSO or a server-side auth layer. A client-side key would not be secure, so it was not added as a fake protection mechanism.
- Set `TELEMETRY_INGEST_SECRET` in Convex and `CONVEX_TELEMETRY_SECRET` in the plugin runtime before production use.
- Add dashboard accessibility automation with axe/pa11y.
- Add catalog-derived intent lexicon and search-index precomputation in the next pass.
