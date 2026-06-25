# OpenCrab Additional Retrieval Seed Verification — 2026-06-25

## Purpose

Add and verify more compact single-topic retrieval seed chunks for the MUSINSA Personal Shopper product ontology pack. The goal is to improve exact `product_id` + canonical MUSINSA `source_url` candidate retrieval for high-demand shopper query families beyond the earlier hoodie/sneaker/T-shirt seeds.

## Scope and boundary

- Project: `paperclipbase`
- Owner tag: `hermes-profile:paperclipbase`
- Primary product pack: `[hermes-profile:paperclipbase] musinsa-product-db-personal-shopper-sample-20260624`
- Package ID: `0b3c79f7-1861-4466-ba20-2cbaa736de66`
- Previous product pack version before this batch: `2.7.0`
- Latest product pack version after this batch: `3.2.0`
- Storage mode: OpenCrab pack update events with ontology storage
- Source boundary: public MUSINSA product URLs already present in the local/plugin candidate catalog. These are retrieval seeds, not a licensed production feed.

## Updates applied

| Version | Event title | Query family | Seed rows | Verification document ID |
|---|---|---|---:|---|
| `2.8.0` | `2026-06-25 MUSINSA black pants retrieval seed rows` | 블랙 코튼 팬츠 / black pants | 6 | `88faca41-9b69-429d-80f4-ac35cdd13b79` |
| `2.9.0` | `2026-06-25 MUSINSA oversized knit retrieval seed rows` | 오버핏 니트 / oversized knit | 6 | `c5a868f5-496e-4b3e-9629-b273755ee187` |
| `3.0.0` | `2026-06-25 MUSINSA cardigan office retrieval seed rows` | 가디건 출근룩 / office cardigan | 6 | `b7672f0c-ffa3-4b2f-8114-0f7c97de00d8` |
| `3.1.0` | `2026-06-25 MUSINSA comfortable sneakers retrieval seed rows` | 편한 운동화 / comfortable sneakers | 6 | `ce219f2a-f1d5-40b8-bd1c-f3dbe4ecacd8` |
| `3.2.0` | `2026-06-25 MUSINSA mens under 100k outfit retrieval seed rows` | 10만원 이하 남자 코디 세트 | 6 | `e3756413-c125-4388-9445-5ca66cc935c2` |

Latest snapshot returned by OpenCrab for version `3.2.0`:

- Documents: 23
- Chunks: 65
- Nodes: 299
- Edges: 276
- Added document ID for `3.2.0`: `e3756413-c125-4388-9445-5ca66cc935c2`

## Seed rows

### Black pants

- `2112061` — https://www.musinsa.com/products/2112061 — 원턱 와이드 스웨트팬츠 블랙 — 31,200 KRW
- `3663072` — https://www.musinsa.com/products/3663072 — 모어 와이드 데님 팬츠 WASHED RAW BLACK — 39,200 KRW
- `1666444` — https://www.musinsa.com/products/1666444 — 와이드 데님 팬츠 워시드 블랙 — 49,900 KRW
- `3037465` — https://www.musinsa.com/products/3037465 — VLAD 워터프루프 와이드 카고 팬츠 블랙 — 36,900 KRW
- `3674341` — https://www.musinsa.com/products/3674341 — 투턱 와이드 롱 스웨트 팬츠 블랙 — 43,860 KRW
- `3404705` — https://www.musinsa.com/products/3404705 — CN 와이드 벨티드 파라슈트 팬츠 블랙 — 62,890 KRW

### Oversized knit

- `2702397` — https://www.musinsa.com/products/2702397 — 워셔블 하찌 벌키 크루넥 니트 — 56,050 KRW
- `3494992` — https://www.musinsa.com/products/3494992 — 워셔블 케이블 라운드 니트 — 22,500 KRW
- `4285909` — https://www.musinsa.com/products/4285909 — 오버핏 케이블 라운드 니트 — 39,970 KRW
- `3025211` — https://www.musinsa.com/products/3025211 — 에센셜 라운드 니트 가디건 — 39,900 KRW
- `3056018` — https://www.musinsa.com/products/3056018 — 코튼 투웨이 벌룬 니트 집업 네이비 — 71,200 KRW
- `4403731` — https://www.musinsa.com/products/4403731 — 코스에그 자수 투웨이 니트집업 가디건 — 39,800 KRW

### Cardigan office

- `3025211` — https://www.musinsa.com/products/3025211 — 에센셜 라운드 니트 가디건 — 39,900 KRW
- `3056018` — https://www.musinsa.com/products/3056018 — 코튼 투웨이 벌룬 니트 집업 네이비 — 71,200 KRW
- `3434621` — https://www.musinsa.com/products/3434621 — GNRL 에센셜 가디건 — 49,000 KRW
- `4403731` — https://www.musinsa.com/products/4403731 — 코스에그 자수 투웨이 니트집업 가디건 — 39,800 KRW
- `4336624` — https://www.musinsa.com/products/4336624 — 미니멀 버튼 라운드넥 크롭 가디건 — 51,900 KRW
- `3881570` — https://www.musinsa.com/products/3881570 — 크롭 무브 가디건 레드 — 86,400 KRW

### Comfortable sneakers

- `810034` — https://www.musinsa.com/products/810034 — 척 70 클래식 블랙 — 95,000 KRW
- `1163169` — https://www.musinsa.com/products/1163169 — 삼바 OG 화이트블랙 — 149,000 KRW
- `102622` — https://www.musinsa.com/products/102622 — 어센틱 블랙 — 69,000 KRW
- `957758` — https://www.musinsa.com/products/957758 — 컴피쿠시 올드스쿨 블랙트루화이트 — 89,000 KRW
- `2440110` — https://www.musinsa.com/products/2440110 — 유니 레더 독일군 — 53,910 KRW
- `3976350` — https://www.musinsa.com/products/3976350 — 에어 포스 1 07 M 화이트 — 149,000 KRW

### Men's under-100k outfit set

- `996177` — https://www.musinsa.com/products/996177 — 릴렉스 핏 크루 넥 티셔츠 화이트 — 15,090 KRW
- `1778404` — https://www.musinsa.com/products/1778404 — 2WAY 스웻 후드 집업 멜란지 그레이 — 39,150 KRW
- `1551840` — https://www.musinsa.com/products/1551840 — Deep One Tuck Sweat Pants Grey — 31,200 KRW
- `1149329` — https://www.musinsa.com/products/1149329 — 세미 와이드 히든 밴딩 슬랙스 블랙 — 37,890 KRW
- `750908` — https://www.musinsa.com/products/750908 — 세미 와이드 밴딩 슬랙스 블랙 — 29,700 KRW
- `2112061` — https://www.musinsa.com/products/2112061 — 원턱 와이드 스웨트팬츠 블랙 — 31,200 KRW

## Verification results

### OpenCrab project run checks

`opencrab_project_run` was executed against project `paperclipbase` for all five event titles. All five runs retrieved the intended single-topic seed chunk in evidence. Three runs had weak generated answers despite correct evidence, so evidence/package IDs were treated as the authoritative verification signal per the OpenCrab skill pitfall.

| Query family | Project-run evidence hit | Generated answer quality | Notes |
|---|---:|---|---|
| Black pants | PASS | Weak | Answer said missing, but top evidence was the exact black-pants event with all 6 rows. |
| Oversized knit | PASS | Weak | Answer said missing, but top evidence was the exact oversized-knit event with all 6 rows. |
| Cardigan office | PASS | Good | Answer returned all 6 `product_id/source_url` rows. |
| Comfortable sneakers | PASS | Weak | Answer said missing, but top evidence was the exact comfortable-sneakers event with all 6 rows. |
| Men's under-100k outfit | PASS | Good | Answer returned all 6 `product_id/source_url` rows. |

### OpenCrab document search checks

Additional `opencrab_search_documents` checks were run for the weaker-answer categories:

| Query | Result |
|---|---|
| `black pants retrieval seed 2112061 3663072` | PASS — top evidence exact black-pants seed, score `0.4865880734`, scanned `1374` |
| `2026-06-25 MUSINSA oversized knit retrieval seed rows 오버핏 니트 2702397 4285909` | PASS — top evidence exact oversized-knit seed, score `0.4796066879`, scanned `10374` |
| `2026-06-25 MUSINSA comfortable sneakers retrieval seed rows 편한 운동화 810034 957758` | PASS — top evidence exact comfortable-sneakers seed, score `0.4686237185`, scanned `10132` |

One broad black-pants document search without `scan_limit` timed out once. A narrower retry with `scan_limit=1000` succeeded.

## Conclusion

The five additional single-topic retrieval seed chunks are now present in the primary MUSINSA product pack and retrievable by OpenCrab evidence search/project evidence. This improves OpenCrab's role as semantic candidate/provenance layer for the plugin, while the runtime plugin should continue to rerank/validate candidates against the local product index/cache.

## Caveats and next enrichment

- OpenCrab project-run generated answers may still say “missing” even when the correct evidence chunk is retrieved. Plugin/service integration should parse evidence text/metadata rather than trust the generated prose alone.
- Current seed chunks are hand-selected representatives, not exhaustive category catalogs.
- Next useful expansion: add more compact seed chunks for `셔츠 출근룩`, `여름 반팔`, `와이드 데님`, `후드집업 5만원 이하`, `키높이 신발`, and `175cm/88kg relaxed fit`-specific outfits.
