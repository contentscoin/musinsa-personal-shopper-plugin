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
| p50 latency ms | 5.21 |
| p95 latency ms | 8.68 |
| max latency ms | 28.79 |

## By scenario

| Scenario | Count | Pass | Non-empty | Avg top price_fit | Avg top review_trust | Avg latency ms |
|---|---:|---:|---:|---:|---:|---:|
| brand_relevance | 35 | 35 | 35 | 0.3 | 2.03 | 7.53 |
| price_budget_fit | 25 | 25 | 25 | 1.94 | 2.06 | 4.79 |
| review_trust_signal | 25 | 25 | 25 | 0.3 | 4.05 | 4.44 |

## Failure samples

- None

## Sample successes

- #1 brand_relevance: {"query":"무신사 스탠다드 반소매 티셔츠 추천","brand":"무신사 스탠다드","limit":5,"customer_profile":{"style_preference":["데일리"],"purchase_context":"브랜드 우선 추천"}} => top=1396890 우먼즈 리브드 슬림 핏 티셔츠 [크림] / price=10430 / reviews=1092 / total=4.623 / 28.79ms
- #2 brand_relevance: {"query":"아디다스 패션스니커즈화 추천","brand":"아디다스","limit":5,"customer_profile":{"style_preference":["데일리"],"purchase_context":"브랜드 우선 추천"}} => top=4648367 캠퍼스 00s - 브라운 / JH7605 / price=68990 / reviews=745 / total=5.938 / 9.3ms
- #3 brand_relevance: {"query":"무신사 스탠다드 우먼 반소매 티셔츠 추천","brand":"무신사 스탠다드 우먼","limit":5,"customer_profile":{"style_preference":["데일리"],"purchase_context":"브랜드 우선 추천"}} => top=1396890 우먼즈 리브드 슬림 핏 티셔츠 [크림] / price=10430 / reviews=1092 / total=5.023 / 10.14ms
- #4 brand_relevance: {"query":"디미트리블랙 후드 집업 추천","brand":"디미트리블랙","limit":5,"customer_profile":{"style_preference":["데일리"],"purchase_context":"브랜드 우선 추천"}} => top=3783086 VLAD TYPE-B 아트웍 자수 후드 집업_네이비 / price=19900 / reviews=643 / total=6.876 / 8.68ms
- #5 brand_relevance: {"query":"나이키 패션스니커즈화 추천","brand":"나이키","limit":5,"customer_profile":{"style_preference":["데일리"],"purchase_context":"브랜드 우선 추천"}} => top=3976350 에어 포스 1 07 M - 화이트 / CW2288-111 / price=149000 / reviews=10635 / total=5.38 / 8.05ms
- #6 brand_relevance: {"query":"언탭트 스튜디오 데님 팬츠 추천","brand":"언탭트 스튜디오","limit":5,"customer_profile":{"style_preference":["데일리"],"purchase_context":"브랜드 우선 추천"}} => top=4164429 빈티지 프론트 워싱 와이드 청바지 데님 팬츠 / price=34970 / reviews=3892 / total=5.96 / 8.3ms
- #7 brand_relevance: {"query":"트릴리온 데님 팬츠 추천","brand":"트릴리온","limit":5,"customer_profile":{"style_preference":["데일리"],"purchase_context":"브랜드 우선 추천"}} => top=3642581 파라슈트 카고 리벳 데님 팬츠 (BLACK) / price=35900 / reviews=4514 / total=6.11 / 7.95ms
- #8 brand_relevance: {"query":"드로우핏 셔츠/블라우스 추천","brand":"드로우핏","limit":5,"customer_profile":{"style_preference":["데일리"],"purchase_context":"브랜드 우선 추천"}} => top=1760177 도브 울 블루종 자켓 [BLACK] / price=139200 / reviews=2023 / total=4.715 / 7.6ms
- #9 brand_relevance: {"query":"폴로 랄프 로렌 셔츠/블라우스 추천","brand":"폴로 랄프 로렌","limit":5,"customer_profile":{"style_preference":["데일리"],"purchase_context":"브랜드 우선 추천"}} => top=3271381 숏슬리브 시어서커 셔츠 - 화이트 / price=132300 / reviews=274 / total=4.273 / 9ms
- #10 brand_relevance: {"query":"시그니처 코튼 팬츠 추천","brand":"시그니처","limit":5,"customer_profile":{"style_preference":["데일리"],"purchase_context":"브랜드 우선 추천"}} => top=2578996 [여름원단추가]더블턱 와이드 슬랙스[블랙] / price=32900 / reviews=18392 / total=6.243 / 6.83ms
- #11 brand_relevance: {"query":"무센트 캡/야구모자 추천","brand":"무센트","limit":5,"customer_profile":{"style_preference":["데일리"],"purchase_context":"브랜드 우선 추천"}} => top=3232889 시그니처 볼캡 (14컬러) / price=29900 / reviews=8553 / total=4.827 / 6.35ms
- #12 brand_relevance: {"query":"스파오 반소매 티셔츠 추천","brand":"스파오","limit":5,"customer_profile":{"style_preference":["데일리"],"purchase_context":"브랜드 우선 추천"}} => top=5360472 [씬라이트] 후드 재킷_SPJPF4TC24 / price=29900 / reviews=7408 / total=4.96 / 6.18ms
