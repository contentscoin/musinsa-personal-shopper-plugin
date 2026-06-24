# MUSINSA Personal Shopper Plugin

> Developer-facing ChatGPT/Codex plugin prototype for conversational MUSINSA shopping, powered by crawled/authorized product ontology data and sanitized non-PII shopper analytics.

## 1. What this plugin does

The plugin lets a ChatGPT/Codex-style agent answer questions such as:

- `5만원 이하 미니멀 후드집업 추천해줘`
- `남성 차콜 후드집업 5만원 이하 추천`
- `이 상품은 정사이즈야? 리뷰/핏 기준으로 알려줘`
- `후보 상품을 가격/리뷰/만족도로 비교해줘`
- `추천 후보를 shortlist에 저장하고 나중에 비교해줘`

It also records **sanitized, non-PII** usage analytics for AI improvement and MUSINSA marketing statistics:

- search/recommendation patterns
- product clicks
- shortlist saves
- product comparisons
- conversion events
- CTR/CVR
- top queries/products/intents

## 2. Current MVP status

- Product DB sample: 41 crawled public MUSINSA products
- Product ontology pack: OpenCrab private pack
- Personal Shopper Data pack: OpenCrab private pack
- Tests: 10 passing
- Plugin contract: OpenAPI 3.1 + `/.well-known/ai-plugin.json`
- Demo: `npm run demo`

## 3. Important crawling boundary

This prototype does **not** assume private or undocumented MUSINSA partner APIs. It uses public pages/sitemap data checked against `robots.txt` for the `ChatGPT-User` user-agent at the time of implementation.

Production use should replace crawling with official MUSINSA APIs, partner feeds, written authorization, or first-party data exports.

Crawler safeguards:

- User-Agent: `ChatGPT-User`
- Reads robots.txt before crawling
- Starts from official sitemap URLs
- Rate-limits requests
- Stores source URL, crawled_at, and image/source metadata
- Skips disallowed/private paths
- Records failed URLs instead of crashing

## 4. Architecture

```text
MUSINSA sitemap/product pages
  -> scripts/crawl-musinsa-products.mjs
  -> data/products.crawled.json
  -> docs/ontology/musinsa-product-ontology-sample.md
  -> OpenCrab product ontology pack
  -> src/server.mjs OpenAPI-compatible plugin server
  -> ChatGPT/Codex or external app

User plugin behavior
  -> POST /analytics/events
  -> PII sanitizer + session hash
  -> data/telemetry/events.jsonl
  -> analytics summary/dashboard APIs
  -> scripts/export-personal-shopper-data-ontology.mjs
  -> OpenCrab personal-shopper-data ontology pack
```

## 5. Quick start

```bash
npm test
npm start
```

In another terminal:

```bash
curl -s http://localhost:8787/health
curl -s http://localhost:8787/openapi.yaml
curl -s http://localhost:8787/.well-known/ai-plugin.json
```

Run the end-to-end demo:

```bash
npm run demo
```

Demo flow:

```text
recommend
  -> analytics recommendation event
  -> shortlist save
  -> analytics shortlist event
  -> compare
  -> click event
  -> conversion event
  -> analytics summary
```

## 6. Plugin files

| File | Purpose |
|---|---|
| `.well-known/ai-plugin.json` | ChatGPT-style plugin manifest |
| `openapi.yaml` | OpenAPI 3.1 API contract |
| `src/server.mjs` | HTTP JSON API server + static plugin files |
| `src/productStore.mjs` | Product DB loader/search |
| `src/personalShopper.mjs` | Intent parser, recommend, compare, product insight |
| `src/shortlistStore.mjs` | In-memory shortlist store |
| `src/telemetryStore.mjs` | Non-PII telemetry sanitizer/summary/dashboard |
| `scripts/demo.mjs` | End-to-end demo script |
| `scripts/crawl-musinsa-products.mjs` | Public product crawler |
| `scripts/export-personal-shopper-data-ontology.mjs` | Analytics ontology export |

## 7. Main API endpoints

### Product/shopping

| Endpoint | Purpose |
|---|---|
| `GET /health` | Health check |
| `GET /openapi.yaml` | Serve OpenAPI spec |
| `GET /.well-known/ai-plugin.json` | Serve plugin manifest |
| `POST /products/search` | Search products by natural language/filters |
| `GET /products/:productId` | Product detail |
| `POST /products/:productId/reviews/summary` | Fit/review/material insight |
| `POST /shopper/recommend` | Intent-based recommendations |
| `POST /shopper/compare` | Compare products and choose best pick |
| `POST /shopper/shortlist` | Save product candidates to session shortlist |
| `GET /shopper/shortlist/:sessionId` | Load shortlist |
| `DELETE /shopper/shortlist/:sessionId` | Clear shortlist |

### Analytics

| Endpoint | Purpose |
|---|---|
| `GET /analytics/notice` | Consent/notice text for non-PII analytics |
| `POST /analytics/events` | Record sanitized analytics event |
| `GET /analytics/summary` | Full analytics summary |
| `GET /analytics/funnel` | CTR/CVR funnel metrics |
| `GET /analytics/products` | Top products/clicked/converted products |
| `GET /analytics/queries` | Top sanitized queries |
| `GET /analytics/intents` | Top colors/categories/genders/budgets |
| `POST /analytics/export` | Regenerate export-ready summary |

## 8. Example recommendation request

```bash
curl -s -X POST http://localhost:8787/shopper/recommend \
  -H 'content-type: application/json' \
  -d '{
    "query":"남성 차콜 후드집업 5만원 이하 추천",
    "customer_profile":{"usual_size":"L","fit_preference":"오버핏"},
    "limit":2
  }'
```

Response includes:

- `parsed_intent`
- `assistant_summary`
- `recommendations`
- `shortlist`
- `next_questions`

## 9. Analytics privacy boundary

The analytics pipeline is designed to collect useful marketing and model-improvement statistics without storing direct personal data.

Not stored:

- names
- emails
- phone numbers
- addresses
- order IDs
- tracking IDs
- card numbers / long number sequences
- IP addresses
- raw user IDs
- raw session IDs

Sanitization examples:

```text
010-1234-5678 -> [phone]
test@example.com -> [email]
서울시 강남구 ... -> [address]
주문 ABC123456 -> 주문 [order_id]
송장 123456789012 -> 송장 [tracking_id]
4111-1111-1111-1111 -> [card_or_long_number]
127.0.0.1 -> [ip]
```

Raw session IDs are stored only as SHA-256 hash prefixes.

## 10. OpenCrab packs

| Pack | Purpose | Package ID |
|---|---|---|
| Product DB ontology | MUSINSA product data, links, image URLs, price/review/material fields | `0b3c79f7-1861-4466-ba20-2cbaa736de66` |
| Personal Shopper Data | Sanitized user behavior, query, click, conversion, CTR/CVR, marketing stats | `5b77afa5-2646-4674-88e7-584cddd8f37c` |

A scheduled sync job updates the Personal Shopper Data pack hourly.

## 11. Local analytics export

```bash
npm run analytics:export
```

Output:

```text
docs/ontology/personal-shopper-data-ontology.md
```

## 12. Tests

```bash
npm test
```

Current expected result:

```text
# tests 10
# pass 10
# fail 0
```

## 13. Hackathon narrative

**Problem:** MUSINSA has rich product/review/ranking data, but users and developers cannot easily use it in AI conversation flows. Shopping increasingly starts in AI agents, not only in app search bars.

**Solution:** MUSINSA Personal Shopper Plugin turns MUSINSA product data into an ontology-backed conversational commerce API. It supports natural-language recommendation, fit/review interpretation, shortlist management, comparison, and sanitized analytics feedback loops.

**Why it matters:** The same plugin improves consumer discovery and creates a privacy-aware marketing/statistics layer for MUSINSA.

## 14. Limitations

- Current shortlist store is in-memory; production should use Redis/Postgres.
- Current crawler is a public-source prototype; production should use official MUSINSA feeds/APIs.
- No real cart/payment/order operations are implemented.
- Review text is not scraped; MVP uses review aggregates and material/fit signals.
