# Resource Links and Source Attribution

This document lists the exact public/resource links used or referenced by the MUSINSA Personal Shopper Plugin prototype.

## Core project links

| Resource | Exact link | Role in this project | Verification note |
|---|---|---|---|
| Public GitHub repository | https://github.com/contentscoin/musinsa-personal-shopper-plugin | Source code, README, OpenAPI, plugin manifest, demo scripts, tests, ontology docs | Verified reachable with HTTP 200 during packaging. |
| Raw README | https://raw.githubusercontent.com/contentscoin/musinsa-personal-shopper-plugin/main/README.md | Public Korean README source | GitHub raw file for reviewers. |
| Raw OpenAPI spec | https://raw.githubusercontent.com/contentscoin/musinsa-personal-shopper-plugin/main/openapi.yaml | Plugin/API contract source | Mirrors local `openapi.yaml`. |
| Raw plugin manifest | https://raw.githubusercontent.com/contentscoin/musinsa-personal-shopper-plugin/main/.well-known/ai-plugin.json | ChatGPT-style manifest source | Mirrors local `.well-known/ai-plugin.json`. |

## OpenCrab / ontology links

| Resource | Exact link | Role in this project | Verification note |
|---|---|---|---|
| **OpenCrab official site** | **https://opencrab.sh** | Ontology pack platform referenced for product ontology and Personal Shopper Data packs | Verified reachable with HTTP 200. This is the requested `opencrab.sh` source link. |
| Product DB ontology pack ID | `0b3c79f7-1861-4466-ba20-2cbaa736de66` | Private/profile-owned OpenCrab pack for MUSINSA product ontology and plugin milestone updates | Pack is referenced by ID because private pack URLs are workspace/account scoped. |
| Personal Shopper Data pack ID | `5b77afa5-2646-4674-88e7-584cddd8f37c` | Private/profile-owned OpenCrab pack for sanitized user behavior analytics, CTR/CVR, insights, ontology gaps | Pack is referenced by ID because private pack URLs are workspace/account scoped. |
| Local product ontology artifact | `docs/ontology/musinsa-product-ontology-sample.md` | OpenCrab-ready product ontology Markdown | Included in repo. |
| Local product enrichment artifact | `docs/ontology/musinsa-product-enrichment.md` | OpenCrab-ready AI tag enrichment ontology | Included in repo. |
| Local behavior analytics artifact | `docs/ontology/personal-shopper-data-ontology.md` | OpenCrab-ready sanitized behavior analytics ontology | Included in repo. |

## MUSINSA public data boundary links

| Resource | Exact link | Role in this project | Verification note |
|---|---|---|---|
| MUSINSA robots.txt | https://www.musinsa.com/robots.txt | Crawling boundary reference for public prototype collection | Verified reachable with HTTP 200. Production should use official feeds/API/authorization. |
| MUSINSA sitemap sample | https://www.musinsa.com/static/sitemap/sitemap-goods-1.xml | Public product URL seed used by the conservative crawler prototype | Verified reachable with HTTP 200. |
| Example product URL pattern | https://www.musinsa.com/products/3783092 | Product URL format used in sample records | Public product page URL pattern; individual pages may rate-limit or change. |

## Standards / platform references

| Resource | Exact link | Role in this project |
|---|---|---|
| OpenAPI Specification | https://spec.openapis.org/oas/latest.html | API contract format used by `openapi.yaml`. |
| GitHub Actions documentation | https://docs.github.com/actions | CI workflow reference for `.github/workflows/ci.yml`. |
| GitHub Releases documentation | https://docs.github.com/repositories/releasing-projects-on-github/about-releases | Release packaging reference. |
| Node.js test runner documentation | https://nodejs.org/api/test.html | Native `node:test` runner used by `npm test`. |

## Local runtime endpoints

When running locally with `npm start`, these endpoints are available at `http://localhost:8787`:

| Local endpoint | Purpose |
|---|---|
| http://localhost:8787/health | Health check and product count. |
| http://localhost:8787/openapi.yaml | Local OpenAPI spec. |
| http://localhost:8787/.well-known/ai-plugin.json | Local plugin manifest. |
| http://localhost:8787/dashboard | Owner analytics dashboard mock. |
| http://localhost:8787/analytics/notice | Non-PII analytics notice. |
| http://localhost:8787/analytics/insights | Generated marketing/ontology-gap insights. |

## Attribution and limitations

- MUSINSA public pages/sitemap are used only for a conservative prototype boundary. Real production integration should use official MUSINSA APIs, partner feeds, written authorization, or first-party exports.
- OpenCrab private pack IDs are included for traceability. Direct SaaS URLs are not included because private pack access is workspace/account scoped.
- The dashboard is a mock/owner view over local sanitized analytics. It does not expose private OpenCrab pack data directly.
