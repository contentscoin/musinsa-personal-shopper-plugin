# Kilo Workflow Analysis — MUSINSA Personal Shopper Plugin Improvements

Date: 2026-06-25
Repo: https://github.com/contentscoin/musinsa-personal-shopper-plugin
Workflow used: Kilo Public Service Form Workflow
Kilo packs referenced by workflow: dev.meta.core, dev.workflow.requirements-analysis, dev.design.reference-evidence-archive, dev.design.accessibility-baselines, dev.design.tokens-spec, dev.foundation.accessibility, dev.foundation.privacy-secrets, dev.web.forms-validation, dev.web.responsive-layout, dev.capability.audit-history.

## Analysis basis

- Current catalog: 2,050 products, 713 brands, 190 category paths.
- Current code surface: plugin server, product search/recommend/compare/shortlist, telemetry sanitizer, owner dashboard, Convex analytics backend.
- Current quality evidence:
  - Unit tests: 11/11 pass.
  - Product search mass test: 320/320 pass.
  - Category recommendation test: 160/160 pass.
  - Ranking signal test: 85/85 pass.
  - Low-confidence gap test: 6/6 pass.
  - OpenAPI/manifest test: pass, 0 unresolved refs.
- Kilo workflow caveat: the generic workflow did not know the repo state and repeatedly asked for current product/user/performance context. This report bridges Kilo pack criteria with actual local repo evidence.

## Current strengths

1. Working plugin contract: OpenAPI 3.1 and plugin manifest are served and tested.
2. Catalog scale is now meaningful for prototype QA: 2,050 products.
3. Structured search hard constraints exist for category, brand, gender, and budget.
4. Recommendation responses include explainable score_breakdown and shopper_insight.
5. Telemetry sanitizer removes common PII classes and hashes session IDs.
6. Owner dashboard is deployed separately with Convex-backed telemetry snapshots.
7. OpenCrab ontology artifacts exist for product DB and dashboard DB/deployment context.

## Prioritized improvement backlog

| Priority | Severity | Area | Improvement | Why | Concrete next step |
|---:|---|---|---|---|---|
| P0 | High | Consent/auth boundary | Add explicit analytics consent mode and owner-dashboard auth/role gate. | Current analytics notice exists, but plugin endpoint accepts events and owner dashboard is publicly reachable. Kilo privacy/audit packs prioritize data minimization and permission boundaries. | Add `CONSENT_REQUIRED` config, reject/mark events without consent, add dashboard password/OAuth gate or Vercel protection, document retention. |
| P0 | High | Production telemetry pipeline | Connect plugin telemetry directly to Convex instead of only local JSON seed/demo import. | Owner dashboard uses Convex, but plugin runtime still writes local `data/telemetry/events.jsonl`; operational dashboard will not reflect live plugin traffic. | Add Convex HTTP action or server-side client, idempotent event sync, retry queue, and tests proving sanitized payload parity. |
| P0 | High | API robustness | Add request size limits, invalid JSON handling, CORS/options handling, and method-specific errors. | `src/server.mjs` parses body directly and returns raw `error.message`; Kilo validation/error-state pack expects recoverable, user-safe error messages. | Implement `readJsonBody(req,{maxBytes})`, typed 400/413/405 responses, no stack/error leakage, OpenAPI error schema. |
| P1 | Medium-High | Accessibility | Run automated owner-dashboard accessibility gate and fix labels/focus/contrast/table semantics. | Kilo accessibility packs call out keyboard, focus, labels, zoom, contrast, and assistive-tech checks; current dashboard has visual UI but no a11y test artifact. | Add Playwright + axe or pa11y script for deployed dashboard, test 375/768/1440 widths, keyboard tab order, table labels, color contrast. |
| P1 | Medium-High | Audit history | Add audit trail for data imports, OpenCrab pack updates, Convex seed/snapshot, and dashboard actions. | There are reports, but not a first-class audit table/event model. Kilo audit-history pack emphasizes actor, timestamp, state transition, failure mode. | Add `auditEvents` table in Convex with action, actor/source, before/after hash, package_id/deployment_id, result. |
| P1 | Medium | Recommendation quality | Expand intent parsing from static word lists to catalog-derived synonyms and Korean morphology-ish phrase mapping. | `CATEGORY_WORDS` and color/category lexicons are narrow compared to 190 category paths; low-confidence report still shows category/color/budget gaps. | Generate lexicon from `category_path`, brands, colors, ai_tags; add tests for occasion/weather/body-context queries. |
| P1 | Medium | Search performance/scalability | Precompute normalized search index instead of normalizing every product on every request. | 2,050 products pass latency now, but current `searchProducts` maps over all products each call and recomputes haystacks. | Build in-memory index at load time: normalizedHaystack/category/brand/price fields; add p95 regression threshold. |
| P2 | Medium | Data provenance/quality | Add crawl/source quality dashboard: missing price/image/review/category/ai_tags by category/brand. | Product DB is large, but recommendation quality depends on field completeness. Kilo requirements pack asks for measurable acceptance criteria. | Generate `reports/catalog-quality-*.md/json`; expose `/analytics/catalog-quality` or docs-only report. |
| P2 | Medium | OpenAPI/developer UX | Add examples for every endpoint, error responses, auth/consent notes, and Convex/dashboard architecture section. | OpenAPI passes structural checks, but external developers need realistic examples and failure contracts. | Extend `openapi.yaml` examples; add generated API docs or README endpoint examples for analytics/shortlist/errors. |
| P2 | Low-Medium | Owner dashboard product intelligence | Link top product IDs to product names/images/prices inside dashboard. | Convex telemetry stores product IDs only; owner currently sees IDs, less actionable for marketing decisions. | Seed minimal product dimension table or fetch product metadata JSON into dashboard build; show campaign-ready product cards. |

## Suggested next implementation sequence

1. P0 API robustness + safe errors.
2. P0 consent/auth boundary.
3. P0 live Convex telemetry sync.
4. P1 owner-dashboard accessibility test/fixes.
5. P1 auditEvents table + snapshot provenance.
6. P1 catalog-derived intent lexicon.

## Verification gates for the next improvement pass

- `npm test` remains 11/11 or expands with new sanitizer/error tests.
- Product search mass test stays 320/320 pass.
- Category recommendation test stays 160/160 pass.
- Ranking signal test stays 85/85 pass.
- New API robustness tests cover invalid JSON, oversized body, unsupported method, and safe error response.
- New dashboard a11y gate passes for mobile/desktop and keyboard navigation.
- Convex live sync test proves plugin event -> Convex row -> dashboard summary.
