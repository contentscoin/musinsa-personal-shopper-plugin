# Dashboard Live/Fallback Refresh UX — 2026-06-25

## Purpose

Clarify the owner analytics dashboard behavior so reviewers and operators can tell whether the screen is showing real API-backed data or fallback mock/sample data.

The dashboard is intentionally a visual mock shell, but when served by the plugin server it calls live analytics endpoints on initial load, browser refresh, manual refresh, or optional 30-second auto-refresh.

## Behavior after update

```text
GET /dashboard
  -> serves docs/dashboard-mock.html
  -> browser calls GET /analytics/summary and GET /analytics/insights with cache: no-store
  -> success: display Live API data or Live API · no events yet
  -> failure/static-file mode: display Fallback mock data
```

## Files changed

| File | Change |
|---|---|
| `docs/dashboard-mock.html` | Added Live/Fallback status badge, last-updated timestamp, manual refresh button, 30s auto-refresh toggle, cache-busting API fetches, and clearer empty-live-data note. |
| `tests/p0Hardening.test.mjs` | Added dashboard assertion test for live/fallback markers and refresh controls. |
| `scripts/verify-dashboard-live-api.mjs` | Added runtime verifier that starts the plugin, fetches `/dashboard`, `/analytics/summary`, and `/analytics/insights`. |
| `package.json` | Added `verify:dashboard` script. |

## User-facing dashboard states

| State | Badge | Meaning |
|---|---|---|
| Live API data | `Live API data` | `/analytics/summary` and `/analytics/insights` loaded successfully and event count is non-zero. |
| Live API connected but empty | `Live API · no events yet` | API is connected, but telemetry has no events yet. |
| Fallback sample | `Fallback mock data` | API failed or the HTML was opened statically, so bundled sample data is shown. |

## Verification

### Unit tests

Command:

```bash
npm test
```

Result:

```text
# tests 29
# pass 29
# fail 0
```

New test:

- `dashboard marks live API versus fallback mock data and supports manual refresh`

### Runtime dashboard verifier

Command:

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

## Answer to the original question

Yes: the dashboard mock is primarily the visual shell. When served through the plugin server, refresh/manual refresh calls the live analytics endpoints and renders real data. If those calls fail, it falls back to embedded sample data so reviewers still see the intended dashboard layout.

## Next options

- Wire a Convex-backed dashboard mode that reads owner analytics from Convex instead of local JSONL.
- Add charts for CTR/CVR trend, category demand, and low-confidence ontology gaps.
- Add a one-click seed/demo telemetry button for reviewers to populate sample live data in a controlled non-PII way.
