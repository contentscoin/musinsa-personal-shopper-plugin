# Ranking Signal Quality Test — 2026-06-25

- Base URL: http://127.0.0.1:8793
- Products loaded: 2050
- Dataset products: 2050
- Distinct brands: 713
- Distinct category paths: 190

## Summary

| Metric | Value |
|---|---:|
| Total scenarios | 85 |
| Passed | 85 |
| Failed | 0 |
| Non-empty scenarios | 85 |
| p50 latency ms | 9.86 |
| p95 latency ms | 14.73 |
| max latency ms | 37.84 |

## By scenario

| Scenario | Count | Pass | Non-empty | Avg top price_fit | Avg top review_trust | Avg latency ms |
|---|---:|---:|---:|---:|---:|---:|
| brand_relevance | 35 | 35 | 35 | 0.3 | 1.97 | 13.04 |
| price_budget_fit | 25 | 25 | 25 | 1.94 | 2.06 | 9.5 |
| review_trust_signal | 25 | 25 | 25 | 0.3 | 4.05 | 9.05 |

## Failure samples

- None

## Sample successes

- #1 brand_relevance: {"query":"무신사 스탠다드 반소매 티셔츠 추천","brand":"무신사 스탠다드","limit":5,"customer_profile":{"style_preference":["데일리"],"purchase_context":"브랜드 우선 추천"}} => top=1396890 우먼즈 리브드 슬림 핏 티셔츠 [크림] / price=10430 / reviews=1092 / total=11.823 / 37.84ms
- #2 brand_relevance: {"query":"아디다스 패션스니커즈화 추천","brand":"아디다스","limit":5,"customer_profile":{"style_preference":["데일리"],"purchase_context":"브랜드 우선 추천"}} => top=4648367 캠퍼스 00s - 브라운 / JH7605 / price=68990 / reviews=745 / total=8.338 / 16.87ms
- #3 brand_relevance: {"query":"무신사 스탠다드 우먼 반소매 티셔츠 추천","brand":"무신사 스탠다드 우먼","limit":5,"customer_profile":{"style_preference":["데일리"],"purchase_context":"브랜드 우선 추천"}} => top=1396890 우먼즈 리브드 슬림 핏 티셔츠 [크림] / price=10430 / reviews=1092 / total=12.223 / 15.45ms
- #4 brand_relevance: {"query":"디미트리블랙 후드 집업 추천","brand":"디미트리블랙","limit":5,"customer_profile":{"style_preference":["데일리"],"purchase_context":"브랜드 우선 추천"}} => top=3783086 VLAD TYPE-B 아트웍 자수 후드 집업_네이비 / price=19900 / reviews=643 / total=11.676 / 17.14ms
- #5 brand_relevance: {"query":"나이키 패션스니커즈화 추천","brand":"나이키","limit":5,"customer_profile":{"style_preference":["데일리"],"purchase_context":"브랜드 우선 추천"}} => top=3976350 에어 포스 1 07 M - 화이트 / CW2288-111 / price=149000 / reviews=10635 / total=7.78 / 14.32ms
- #6 brand_relevance: {"query":"언탭트 스튜디오 데님 팬츠 추천","brand":"언탭트 스튜디오","limit":5,"customer_profile":{"style_preference":["데일리"],"purchase_context":"브랜드 우선 추천"}} => top=4164429 빈티지 프론트 워싱 와이드 청바지 데님 팬츠 / price=34970 / reviews=3892 / total=10.76 / 14.73ms
- #7 brand_relevance: {"query":"트릴리온 데님 팬츠 추천","brand":"트릴리온","limit":5,"customer_profile":{"style_preference":["데일리"],"purchase_context":"브랜드 우선 추천"}} => top=3642581 파라슈트 카고 리벳 데님 팬츠 (BLACK) / price=35900 / reviews=4514 / total=10.91 / 13.93ms
- #8 brand_relevance: {"query":"드로우핏 셔츠/블라우스 추천","brand":"드로우핏","limit":5,"customer_profile":{"style_preference":["데일리"],"purchase_context":"브랜드 우선 추천"}} => top=6235439 세이건 스트라이프 하프 웨스턴 셔츠 [WHITE] / price=45000 / reviews=96 / total=7.689 / 12.78ms
- #9 brand_relevance: {"query":"폴로 랄프 로렌 셔츠/블라우스 추천","brand":"폴로 랄프 로렌","limit":5,"customer_profile":{"style_preference":["데일리"],"purchase_context":"브랜드 우선 추천"}} => top=3271381 숏슬리브 시어서커 셔츠 - 화이트 / price=132300 / reviews=274 / total=7.873 / 14.61ms
- #10 brand_relevance: {"query":"시그니처 코튼 팬츠 추천","brand":"시그니처","limit":5,"customer_profile":{"style_preference":["데일리"],"purchase_context":"브랜드 우선 추천"}} => top=4993414 와이드 커브드 다트 코튼 팬츠[베이지] / price=34900 / reviews=4049 / total=10.877 / 13.1ms
- #11 brand_relevance: {"query":"무센트 캡/야구모자 추천","brand":"무센트","limit":5,"customer_profile":{"style_preference":["데일리"],"purchase_context":"브랜드 우선 추천"}} => top=3232889 시그니처 볼캡 (14컬러) / price=29900 / reviews=8553 / total=8.427 / 12.62ms
- #12 brand_relevance: {"query":"스파오 반소매 티셔츠 추천","brand":"스파오","limit":5,"customer_profile":{"style_preference":["데일리"],"purchase_context":"브랜드 우선 추천"}} => top=6528057 스트라이프 셔링 반팔티_SPRSG24G92 / price=14900 / reviews=1 / total=10.15 / 11.77ms
