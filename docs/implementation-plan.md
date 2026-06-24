# MUSINSA Personal Shopper Plugin Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build a Codex/ChatGPT plugin prototype that lets developers use MUSINSA product data for conversational shopping.

**Architecture:** Crawl public MUSINSA sitemap/product pages within robots.txt boundaries, transform purchase-relevant product metadata into JSON and ontology Markdown, ingest the ontology into OpenCrab, then serve a minimal OpenAPI-compatible HTTP API for search, recommendation, review/fit summary, and comparison.

**Tech Stack:** Node.js 22, native `fetch`, native `node:test`, minimal HTTP server, OpenAPI YAML, OpenCrab MCP ingestion.

---

## Submission-form access note

- Source URL: `https://hack.primer.kr/rounds/10`
- Access result: public request redirects to login shell; `.json` endpoint returns `401 Unauthorized`; exact authenticated form fields and character limits are not visible in this environment.
- Plan consequence: `docs/primer-hack-submission.md` is prepared as a standard Korean hackathon submission draft and must be reconciled with authenticated fields before final submit.

## Submission mapping checklist

| Likely form item | Draft location | Evidence/artifact to keep consistent |
|---|---|---|
| 프로젝트명 | `docs/primer-hack-submission.md` §1 | README title, package name |
| 한 줄 소개 | §2 | README Goal, OpenAPI description |
| 문제 정의 | §3 | Musinsa ontology pack and customer pain research |
| 해결 방법 | §4 | crawler + ontology + API architecture |
| 핵심 사용자 | §5 | developer-facing plugin target |
| 기능/기술 | §6-7 | source files and OpenAPI endpoints |
| 데모 시나리오 | §10 | `/shopper/recommend` curl verification |
| 데이터/법적 경계 | §9 | robots.txt/user-agent limits and production API caveat |

## Task 1: Confirm crawl boundary

**Objective:** Verify MUSINSA public crawling boundary before collecting data.

**Files:**
- Create/Modify: `scripts/crawl-musinsa-products.mjs`

**Steps:**
1. Fetch `https://www.musinsa.com/robots.txt` with `User-Agent: ChatGPT-User`.
2. Assert robots includes `User-agent: ChatGPT-User` and `Allow: /`.
3. Use `https://www.musinsa.com/static/sitemap/sitemap-goods-1.xml` as the seed.
4. Refuse to crawl if explicit allow is absent.

**Verification:**

```bash
npm run crawl:sample
```

Expected: logs `Checking robots`, `Fetching sitemap`, crawls product URLs, writes JSON and ontology Markdown.

## Task 2: Implement product ontology crawler

**Objective:** Extract purchase-relevant product data from public product pages.

**Files:**
- Create: `scripts/crawl-musinsa-products.mjs`
- Output: `data/products.crawled.json`
- Output: `docs/ontology/musinsa-product-ontology-sample.md`

**Extracted fields:**
- product ID, URL, crawled timestamp
- Korean/English product names
- brand and brand nation/exclusive signal
- category path and gender
- sale/normal/final/coupon price and discount rate
- review total count, satisfaction score, has summary
- material/fit labels: fit, touch, stretch, see-through, thickness, season
- product/detail image URLs
- selected logistics/return public fields
- ontology triples

**Verification:**

```bash
npm run crawl:sample
```

Expected: `Wrote 5 products to data/products.crawled.json` and `Wrote ontology markdown...`.

## Task 3: Implement product store and shopper logic

**Objective:** Provide deterministic search, detail, recommendation, summary, and comparison behavior over the crawled JSON.

**Files:**
- Create: `src/productStore.mjs`
- Create: `src/personalShopper.mjs`
- Test: `tests/personalShopper.test.mjs`

**Verification:**

```bash
npm test
```

Expected: `3 passed`.

## Task 4: Implement plugin API server

**Objective:** Serve an OpenAPI-compatible JSON HTTP API that Codex/ChatGPT or external apps can call.

**Files:**
- Create: `src/server.mjs`
- Create: `openapi.yaml`

**Endpoints:**
- `GET /health`
- `POST /products/search`
- `GET /products/{productId}`
- `POST /products/{productId}/reviews/summary`
- `POST /shopper/recommend`
- `POST /shopper/compare`

**Verification:**

```bash
npm start
curl -s http://localhost:8787/health
curl -s -X POST http://localhost:8787/shopper/recommend \
  -H 'content-type: application/json' \
  -d '{"query":"차콜 후드집업 추천","customer_profile":{"usual_size":"L","fit_preference":"오버핏"},"budget":50000}'
```

Expected: health returns loaded product count; recommend returns product candidates and shopper insights.

## Task 5: Ingest product ontology into OpenCrab

**Objective:** Save the crawled product ontology sample as a profile-owned private OpenCrab pack and attach it to `paperclipbase`.

**Files:**
- Input: `docs/ontology/musinsa-product-ontology-sample.md`

**OpenCrab values:**
- Workspace/project: `paperclipbase`
- Owner tag: `hermes-profile:paperclipbase`
- Category: `musinsa-product-db`
- Pack title: `[hermes-profile:paperclipbase] musinsa-product-db-personal-shopper-sample-20260624`

**Verification:**
- Search exact pack title.
- Add package to project.
- Run retrieval query asking for products and ontology fields.

## Task 6: Prepare final hackathon draft

**Objective:** Produce a Korean submission-ready draft that can be pasted into the authenticated Primer Hack form.

**Files:**
- Create: `docs/primer-hack-submission.md`

**Verification:**
- Ensure product name, problem, solution, target user, architecture, data boundary, and demo scenario match README and code.

## Current status

- Tasks 1-4 and 6 are implemented in the scaffold.
- Task 5 is performed via OpenCrab MCP after crawler verification.
- Exact Primer Hack authenticated form fields remain the only blocker; the draft is structured for reconciliation after login.
