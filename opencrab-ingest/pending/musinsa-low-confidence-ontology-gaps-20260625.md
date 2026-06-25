# MUSINSA Low-Confidence Ontology Gap Candidates — 2026-06-25

Owner tag: hermes-profile:paperclipbase

Source: API low-confidence gap collection test over the 2,050-product MUSINSA Personal Shopper dataset. Queries below are sanitized by the plugin telemetry sanitizer; raw PII is not stored. This file is a local staging artifact for later own-project OpenCrab update if approved/needed.

| Scenario | Sanitized query | Missing ontology fields | Confidence level | Recommendation count |
|---|---|---|---|---:|
| rain_commute_weather_gap | 비 오는 날 출근룩 방수 아우터 추천 [phone] | category, color, budget, weather_tags, occasion_tags, functional_material_tags | high | 5 |
| wedding_guest_formality_gap | 하객룩 격식있는 원피스 10만원 이하 추천 [email] | category, color, occasion_tags, formality_tags, dress_code_tags | medium | 5 |
| beginner_running_support_gap | 러닝 초보 무릎 보호 쿠션화 추천 주문 [order_id] | category, color, budget, activity_tags, support_level_tags, cushioning_tags, occasion_tags, performance_fit_tags | high | 5 |
| maternity_fit_gap | 임산부 편한 와이드팬츠 추천 [address] | color, budget, body_context_tags, comfort_tags, fit_risk_tags | medium | 5 |
| travel_capacity_gap | 2박3일 여행용 수납 좋은 백팩 추천 송장 [phone] | color, budget, capacity_tags, travel_duration_tags, storage_tags, occasion_tags | high | 5 |
| monsoon_breathable_shoe_gap | 여름 장마 통풍 잘 되는 신발 추천 카드 [card_or_long_number] | category, color, budget, weather_tags, breathability_tags, season_function_tags | high | 5 |

## Aggregate missing fields

- color: 6
- budget: 5
- occasion_tags: 5
- category: 4
- weather_tags: 3
- activity_tags: 1
- body_context_tags: 1
- breathability_tags: 1
- capacity_tags: 1
- comfort_tags: 1
- cushioning_tags: 1
- dress_code_tags: 1
- fit_risk_tags: 1
- formality_tags: 1
- functional_material_tags: 1
- performance_fit_tags: 1
- season_function_tags: 1
- storage_tags: 1
- style_tags: 1
- support_level_tags: 1
