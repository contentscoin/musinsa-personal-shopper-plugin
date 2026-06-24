# v0.4.0 Release Notes — MUSINSA Personal Shopper Plugin

## Summary

This release packages the MUSINSA Personal Shopper Plugin as a public, submission-ready AI commerce prototype with explainable recommendation scoring, privacy-safe analytics, product ontology enrichment, owner dashboard mock, CI, and exact source/resource links.

## Highlights

- Korean README and submission docs.
- OpenAPI 3.1 spec and ChatGPT-style plugin manifest.
- Product recommendation, shortlist, compare, and review/fit insight APIs.
- Transparent `score_breakdown` per recommendation.
- Privacy-safe analytics with sanitizer and notice endpoint.
- `/analytics/insights` for marketing and ontology-gap insights.
- `low_confidence_recommendation` event loop for weak/no-match queries.
- Product AI tag enrichment: style, occasion, season, fit, risk.
- Owner analytics dashboard mock at `/dashboard`.
- GitHub Actions CI workflow.
- `RESOURCE_LINKS.md` with exact links, including https://opencrab.sh.

## Verification

- `npm test`: 11 passed, 0 failed.
- `npm run enrich:products`: enriched 41 products.
- `npm run analytics:export`: export generated.
- Local server verified:
  - `/health`
  - `/openapi.yaml`
  - `/.well-known/ai-plugin.json`
  - `/dashboard`
  - `/analytics/insights`

## Important source links

- OpenCrab / opencrab.sh: https://opencrab.sh
- GitHub repository: https://github.com/contentscoin/musinsa-personal-shopper-plugin
- MUSINSA robots.txt: https://www.musinsa.com/robots.txt
- MUSINSA sitemap sample: https://www.musinsa.com/static/sitemap/sitemap-goods-1.xml

## Production caveat

The crawler is a conservative public-page prototype. A real MUSINSA deployment should use official APIs, partner feeds, written authorization, or first-party exports.
