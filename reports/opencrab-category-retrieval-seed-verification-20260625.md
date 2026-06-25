# OpenCrab Category Retrieval Seed Verification — 2026-06-25

## Purpose

Continue the OpenCrab retrieval work by broadening product_id/source_url retrieval beyond the initial hoodie query.

## OpenCrab product pack

- Project: `paperclipbase`
- Owner tag: `hermes-profile:paperclipbase`
- Package ID: `0b3c79f7-1861-4466-ba20-2cbaa736de66`
- Package title: `[hermes-profile:paperclipbase] musinsa-product-db-personal-shopper-sample-20260624`
- Previous verified version: `2.4.0`
- New verified version: `2.7.0`

## Updates performed

### v2.5.0 — category table seed

- Event ID: `1a3388f8-61ae-4df5-a372-41357253f7fd`
- Added document ID: `4784311b-1d69-460a-b090-ee34ff78f234`
- Added broader category candidate table covering:
  - 스니커즈
  - 반소매 티셔츠
  - 후드집업

Observation: the table chunk was partially useful, but project-run answers sometimes saw only the first evidence slice and did not reliably enumerate all category product IDs.

### v2.6.0 — compact sneaker seed

- Event ID: `b3bdb748-2c50-40d2-ac46-93cd10645acd`
- Added document ID: `d334fe2d-8733-4ad5-890e-37f02a18d2f7`
- Added one compact single-chunk seed for `화이트 스니커즈`, `white sneakers`, `신발 스니커즈`.

Verified candidates returned:

| product_id | source_url |
|---|---|
| 4240660 | https://www.musinsa.com/products/4240660 |
| 4904194 | https://www.musinsa.com/products/4904194 |
| 1955217 | https://www.musinsa.com/products/1955217 |
| 3976350 | https://www.musinsa.com/products/3976350 |
| 102622 | https://www.musinsa.com/products/102622 |
| 810034 | https://www.musinsa.com/products/810034 |

### v2.7.0 — compact tee seed

- Event ID: `23efdddc-aa8e-4db8-906e-fd3bb5bdda28`
- Added document ID: `a6804a35-7633-49dc-9728-ad337838e568`
- Added one compact single-chunk seed for `여름 반팔 티셔츠`, `반소매 티셔츠`, `short sleeve tee`, `summer t-shirt`.

Verified candidates returned:

| product_id | source_url |
|---|---|
| 2086653 | https://www.musinsa.com/products/2086653 |
| 2034137 | https://www.musinsa.com/products/2034137 |
| 996177 | https://www.musinsa.com/products/996177 |
| 1420730 | https://www.musinsa.com/products/1420730 |
| 1944612 | https://www.musinsa.com/products/1944612 |
| 4055771 | https://www.musinsa.com/products/4055771 |

## Retrieval lesson

For OpenCrab product candidate retrieval, compact single-topic seed chunks work better than large Markdown tables. Large tables can be chunked mid-row or summarized incompletely by project-run answers. For production-like reliability, maintain separate compact seed documents/events per high-demand category/query family.

## Status

- Hoodie query retrieval verified in v2.4.0.
- Sneaker query retrieval verified in v2.6.0.
- Tee query retrieval verified in v2.7.0.
- Plugin runtime still uses local cache/index for low-latency reranking and can consume these candidate IDs/source URLs through the existing OpenCrab adapter seam.
