# MUSINSA Owner Dashboard Convex/Vercel Deployment Ontology Pack Source

Owner tag: hermes-profile:paperclipbase
Workspace/project: paperclipbase
Created: 2026-06-25
Source boundary: Local project files, Vercel deployment output, Convex deployment output, sanitized plugin telemetry seed rows only. No raw personal identifiers are stored.

## Core entities

- Entity: MUSINSA Personal Shopper Owner Dashboard
  - Type: owner analytics dashboard
  - Frontend framework: Vite + React + TypeScript
  - Hosting: Vercel production
  - URL: https://owner-dashboard-snowy.vercel.app
  - Inspect URL: https://vercel.com/jakes-projects-0ab50f91/owner-dashboard/DKwzdiNQnmGj58tQnxfLMVikkjU7
  - Project path: /home/jake/.hermes/profiles/paperclipbase/working/musinsa-personal-shopper-plugin/owner-dashboard

- Entity: Convex database/backend
  - Type: Convex production deployment
  - Team/project: sin-taesu / musinsa-owner-dashboard
  - Deployment: production / veracious-albatross-267
  - Dashboard: https://dashboard.convex.dev/t/sin-taesu/musinsa-owner-dashboard/veracious-albatross-267
  - Client URL: https://veracious-albatross-267.convex.cloud

## DB schema ontology

- Table: telemetryEvents
  - Purpose: stores sanitized non-PII commerce behavior events for owner analytics.
  - Indexed by: eventId, eventType, occurredAt.
  - Fields:
    - eventId: stable event identifier used for idempotent imports.
    - eventType: search, recommendation, product_click, shortlist_save, compare, purchase_intent, conversion, low_confidence_recommendation.
    - occurredAt: event timestamp.
    - sessionHash: hashed session identifier only; raw session/user ID is not stored.
    - userAgentFamily: sanitized client family string.
    - query: sanitized query string with PII placeholders such as [phone], [email], [address], [card_or_long_number], [order_id].
    - parsedIntent: budget, colors, categories, seasons, gender, brand.
    - productIds: product IDs shown or involved.
    - clickedProductId: clicked product ID if event type is product_click.
    - convertedProductId: converted product ID if event type is conversion.
    - rank: clicked/recommended rank.
    - confidence: recommendation confidence for low-confidence events.
    - missingOntologyFields: fields needed to improve product ontology.
    - source: plugin, demo-script, api-verify, owner-dashboard, etc.
    - metadata: sanitized metadata such as surface, locale, result_count.

- Table: dashboardSnapshots
  - Purpose: stores point-in-time owner dashboard summary snapshots.
  - Indexed by: snapshotId, generatedAt.
  - Fields: snapshotId, generatedAt, totalEvents, summary, ownerTag.

## Deployed Convex functions

- Query: analytics.summary
  - Inputs: range = all | 7d | 24h.
  - Output: eventCounts, funnel, top queries, top products, clicked/converted products, intent demand, low-confidence gaps, generated owner insights.

- Query: analytics.recentEvents
  - Inputs: limit.
  - Output: most recent sanitized telemetry rows.

- Mutation: analytics.recordEvent
  - Purpose: insert one sanitized event with idempotency by eventId.

- Mutation: analytics.seedEvents
  - Purpose: bulk-import sanitized event rows from local telemetry export.

- Mutation: analytics.createSnapshot
  - Purpose: save a generated summary snapshot into dashboardSnapshots with owner tag hermes-profile:paperclipbase.

## Current seeded DB facts

- Seeded sanitized telemetry rows: 16.
- Convex production seed result: inserted 16, skipped 0.
- Snapshot ID: musinsa-owner-dashboard-1782353363699.
- Snapshot document ID in Convex: j57380wbwd6fv9r7m4vrdcj4j589aha1.
- Funnel summary:
  - searches_or_recommendations: 5
  - product_clicks: 3
  - conversions: 3
  - click_through_rate: 0.6
  - conversion_rate: 0.6
- Event counts:
  - recommendation: 3
  - product_click: 3
  - conversion: 3
  - shortlist_save: 3
  - search: 2
  - compare: 1
  - low_confidence_recommendation: 1
- Top query pattern: 남성 차콜 후드집업 5만원 이하 추천, count 5.
- Top product interest: product ID 3783092, count 13.
- High conversion product: product ID 3783092 appears in both top clicked and top converted products.
- Top color demand: 차콜, count 3.
- Top category demand: 후드집업, count 4.
- Ontology gap fields: occasion_tags, style_tags, weather_tags.

## Owner value ontology

- Owner can inspect conversion funnel health from sanitized search/recommendation events.
- Owner can identify high-interest products and candidate campaign products.
- Owner can identify top demand signals by color, category, budget, and gender.
- Owner can convert low-confidence recommendation events into product ontology enrichment tasks.
- Owner can seed or append non-PII analytics without storing raw user IDs, emails, phones, addresses, order IDs, card numbers, tracking numbers, or IP addresses.

## Verification evidence

- Local build: npm run build succeeded.
- Convex deploy: schema/functions deployed to https://veracious-albatross-267.convex.cloud.
- Convex summary query returned 16 total events, CTR 0.6, CVR 0.6.
- Vercel production deployment succeeded and aliased https://owner-dashboard-snowy.vercel.app.
- HTTP verification: GET https://owner-dashboard-snowy.vercel.app returned HTTP 200 and served title MUSINSA Personal Shopper Owner Dashboard.

## Example ontology triples

- MUSINSA Owner Dashboard -> is hosted on -> Vercel production.
- MUSINSA Owner Dashboard -> uses database -> Convex production deployment veracious-albatross-267.
- telemetryEvents -> stores -> sanitized commerce behavior events.
- telemetryEvents.query -> redacts -> email, phone, address, order ID, card/long number.
- dashboardSnapshots -> stores -> point-in-time owner analytics summaries.
- low_confidence_recommendation -> produces -> ontology gap fields.
- product ID 3783092 -> is top product interest in current seed -> count 13.
- 차콜 -> is top color demand in current seed -> count 3.
- 후드집업 -> is top category demand in current seed -> count 4.

## Caveats

- Current telemetry rows are seed/demo/plugin verification rows, not production user traffic.
- The dashboard is intentionally owner-facing and should remain scoped to sanitized analytics.
- Future production ingestion should keep raw identifiers out of Convex and OpenCrab; only sanitized aggregates and redacted row samples should be packed.
