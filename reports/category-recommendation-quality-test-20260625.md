# Category Recommendation Quality Test — 2026-06-25

- Base URL: http://127.0.0.1:8792
- Products loaded: 2050
- Dataset products: 2050
- Distinct category paths: 190
- Tested category paths: 80

## Summary

| Metric | Value |
|---|---:|
| Total scenarios | 160 |
| Passed | 160 |
| Failed | 0 |
| Non-empty scenarios | 160 |
| p50 latency ms | 4.38 |
| p95 latency ms | 6.64 |
| max latency ms | 26.92 |

## By scenario

| Scenario | Count | Pass | Non-empty | Avg exact category matches | Avg unique brands | Avg latency ms |
|---|---:|---:|---:|---:|---:|---:|
| category_general | 80 | 80 | 80 | 4.8 | 3.99 | 4.86 |
| category_with_budget | 80 | 80 | 80 | 4.55 | 3.59 | 4.54 |

## Failure samples

- None

## Sample successes

- #1 category_general / 상의 > 반소매 티셔츠: top=1944612 460G 컷 헤비 피그먼트 티셔츠-차콜- / exact=5/5 / brands=5 / 26.92ms
- #2 category_with_budget / 상의 > 반소매 티셔츠: top=3092901 [2PACK] 6.0oz 액티브 무지 기본 반팔 티셔츠_화이트/블랙 / exact=5/5 / brands=4 / 8.41ms
- #3 category_general / 상의 > 셔츠/블라우스: top=4989733 링클 시어서커 체크 반팔 셔츠 [차콜] / exact=5/5 / brands=5 / 6.98ms
- #4 category_with_budget / 상의 > 셔츠/블라우스: top=4989733 링클 시어서커 체크 반팔 셔츠 [차콜] / exact=5/5 / brands=4 / 6.5ms
- #5 category_general / 바지 > 데님 팬츠: top=3125213 M194 워싱 세미 와이드 데님 팬츠_연청 [숏기장 추가] / exact=5/5 / brands=5 / 7.03ms
- #6 category_with_budget / 바지 > 데님 팬츠: top=2351467 바이오스톤 워싱 와이드 데님 팬츠 (BLUE GRAY) / exact=5/5 / brands=5 / 6.57ms
- #7 category_general / 신발 > 스니커즈 > 패션스니커즈화: top=4648367 캠퍼스 00s - 브라운 / JH7605 / exact=5/5 / brands=3 / 6.73ms
- #8 category_with_budget / 신발 > 스니커즈 > 패션스니커즈화: top=4648367 캠퍼스 00s - 브라운 / JH7605 / exact=5/5 / brands=4 / 7.13ms
- #9 category_general / 바지 > 코튼 팬츠: top=3201316 듀러블 롱 벌룬 팬츠 (크림) / exact=5/5 / brands=5 / 6.64ms
- #10 category_with_budget / 바지 > 코튼 팬츠: top=3189629 [2PACK] 쿨믹스 와이드 린넨 라이크 롱팬츠 8종 2PACK BJLP4539 / exact=5/5 / brands=3 / 5.36ms
- #11 category_general / 바지 > 트레이닝/조거 팬츠: top=1844581 원턱 와이드 트레이닝 팬츠 / exact=5/5 / brands=4 / 6.07ms
- #12 category_with_budget / 바지 > 트레이닝/조거 팬츠: top=1844581 원턱 와이드 트레이닝 팬츠 / exact=5/5 / brands=4 / 5.99ms
