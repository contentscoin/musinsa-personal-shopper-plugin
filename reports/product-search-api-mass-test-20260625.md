# Product Search API Mass Test — 2026-06-25

- Base URL: http://127.0.0.1:8791
- Products loaded: 2050
- Dataset products: 2050
- Distinct brands: 713
- Distinct category paths: 190

## Summary

| Metric | Value |
|---|---:|
| Total queries | 320 |
| Passed | 320 |
| Failed | 0 |
| Non-empty queries | 319 |
| Empty queries | 1 |
| p50 latency ms | 48.35 |
| p95 latency ms | 62.68 |
| max latency ms | 70.72 |

## By type

| Type | Count | Pass | Non-empty | Avg latency ms |
|---|---:|---:|---:|---:|
| category_structured | 50 | 50 | 50 | 42.76 |
| category_leaf_query | 50 | 50 | 50 | 50.2 |
| brand_structured | 45 | 45 | 45 | 45.19 |
| natural_color_category | 90 | 90 | 90 | 58.52 |
| brand_category_natural | 25 | 25 | 25 | 51.19 |
| budget_category | 60 | 60 | 59 | 46.64 |

## Failure samples

- None

## Sample successes

- #1 category_structured: {"category":"상의 > 반소매 티셔츠","limit":8} => 2086653 / 레이어드 크루 넥 티셔츠_일반 기장 [화이트] / 8 results / 64.45ms
- #2 category_leaf_query: {"query":"반소매 티셔츠","limit":8} => 2086653 / 레이어드 크루 넥 티셔츠_일반 기장 [화이트] / 8 results / 58.72ms
- #3 category_structured: {"category":"상의 > 셔츠/블라우스","limit":8} => 3562068 / KENSINGTON SHIRT / 8 results / 47.31ms
- #4 category_leaf_query: {"query":"셔츠/블라우스","limit":8} => 3562068 / KENSINGTON SHIRT / 8 results / 57.52ms
- #5 category_structured: {"category":"바지 > 데님 팬츠","limit":8} => 3663072 / 모어 와이드 데님 팬츠 (WASHED RAW BLACK) / 8 results / 42.94ms
- #6 category_leaf_query: {"query":"데님 팬츠","limit":8} => 3663072 / 모어 와이드 데님 팬츠 (WASHED RAW BLACK) / 8 results / 49.47ms
- #7 category_structured: {"category":"신발 > 스니커즈 > 패션스니커즈화","limit":8} => 1163169 / 삼바 OG - 화이트:블랙 / B75806 / 8 results / 43.16ms
- #8 category_leaf_query: {"query":"패션스니커즈화","limit":8} => 1163169 / 삼바 OG - 화이트:블랙 / B75806 / 8 results / 58.2ms
- #9 category_structured: {"category":"바지 > 코튼 팬츠","limit":8} => 1627892 / 레플리카 퍼티그 팬츠 [카키] / 8 results / 41.73ms
- #10 category_leaf_query: {"query":"코튼 팬츠","limit":8} => 1627892 / 레플리카 퍼티그 팬츠 [카키] / 8 results / 48.23ms
