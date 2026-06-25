# OpenCrab Pack Retrieval Verification — 2026-06-25

## Purpose

Verify that the MUSINSA product ontology pack can now return multiple product candidates with original MUSINSA source URLs for the Personal Shopper query family.

## OpenCrab target

- Project: `paperclipbase`
- Owner tag: `hermes-profile:paperclipbase`
- Product pack: `[hermes-profile:paperclipbase] musinsa-product-db-personal-shopper-sample-20260624`
- Package ID: `0b3c79f7-1861-4466-ba20-2cbaa736de66`
- Verified pack version: `2.4.0`

## Query

```text
남성 차콜 후드집업 5만원 이하
```

## Verified OpenCrab response

OpenCrab `project_run` now returned multiple product candidates with source URLs from the v2.4.0 product pack update.

| product_id | source_url |
|---|---|
| 3783092 | https://www.musinsa.com/products/3783092 |
| 4567792 | https://www.musinsa.com/products/4567792 |
| 2712417 | https://www.musinsa.com/products/2712417 |
| 4671560 | https://www.musinsa.com/products/4671560 |
| 5276035 | https://www.musinsa.com/products/5276035 |

## Evidence retrieved

The relevant evidence document returned by OpenCrab was:

- Document ID: `23586c56-962c-45d8-a9ec-fe019dcc0b0d`
- Source: `2026-06-25 OpenCrab candidate cache fallback and retrieval rows`
- Package ID: `0b3c79f7-1861-4466-ba20-2cbaa736de66`
- Package title: `[hermes-profile:paperclipbase] musinsa-product-db-personal-shopper-sample-20260624`

## Interpretation

Before the v2.4.0 update, the same OpenCrab retrieval path returned only one concrete candidate (`3783092`). After adding retrieval-candidate rows and representative candidates to the product pack, OpenCrab now returns at least five product IDs and original links for the target query family.

## Status

- OpenCrab retrieval bottleneck improved for the target hoodie query.
- Plugin runtime already has local candidate-cache fallback for low-latency serving.
- Remaining optional improvement: ingest the full 260/800 row retrieval table in smaller topic/category chunks if broader category coverage is required at OpenCrab retrieval time.
