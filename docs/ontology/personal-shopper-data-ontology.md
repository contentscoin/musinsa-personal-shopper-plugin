# MUSINSA Personal Shopper Data Ontology Pack

Owner tag: hermes-profile:paperclipbase
Pack intent: personal-shopper-data
Generated at: 2026-06-24T16:00:21.443Z

## Privacy boundary
- No names, phone numbers, emails, addresses, order IDs, IP addresses, or raw user identifiers are stored.
- Session identifiers are SHA-256 hashed and truncated.
- Queries are regex-sanitized before storage.
- Pack owner can view sanitized event-level rows plus aggregate statistics.

## Funnel metrics
- Total events: 16
- Searches/recommendations: 5
- Product clicks: 3
- Conversions: 3
- Click-through rate: 0.6
- Conversion rate: 0.6

## Event counts
- conversion: 3
- product_click: 3
- recommendation: 3
- shortlist_save: 3
- search: 2
- compare: 1
- low_confidence_recommendation: 1

## Top queries
- 남성 차콜 후드집업 5만원 이하 추천: 5
- 남성 차콜 후드집업 5만원 이하 추천 [phone]: 1
- 비 오는 날 남친룩 추천 [phone]: 1
- 카드 [card_or_long_number] [address] 주문 [order_id] 후드집업: 1
- 화이트 스니커즈 7만원 이하 추천 [email]: 1

## Top products
- 3783092: 13
- 3697526: 7
- 4240657: 1
- 4240660: 1

## Top clicked products
- 3783092: 3

## Top converted products
- 3783092: 3

## Top colors
- 차콜: 3
- 화이트: 1

## Top categories
- 후드집업: 4
- 스니커즈: 1

## Top budgets
- 50000: 3
- 70000: 1

## Low-confidence queries
- 비 오는 날 남친룩 추천 [phone]: 1

## Missing ontology fields
- occasion_tags: 1
- style_tags: 1
- weather_tags: 1

## Generated marketing and ontology insights
- funnel_health: 검색/추천 5건 기준 CTR 0.6, CVR 0.6입니다.
- top_query_pattern: 가장 많이 관찰된 질문 패턴은 "남성 차콜 후드집업 5만원 이하 추천"입니다.
- top_product_interest: 가장 자주 노출/관심을 받은 상품 ID는 3783092입니다.
- high_conversion_product: 상품 3783092는 클릭과 전환 양쪽에서 상위에 있어 우선 캠페인 후보입니다.
- color_demand: 현재 AI 쇼핑 질문에서 차콜 색상 수요가 가장 높습니다.
- category_demand: 현재 AI 쇼핑 질문에서 후드집업 카테고리 수요가 가장 높습니다.
- ontology_gap: 추천 신뢰도가 낮은 질문 1건이 있어 상품 태그/상황/핏 온톨로지 보강이 필요합니다.

## Sanitized event rows
| occurred_at | event_type | session_hash | query | product_ids | clicked_product_id | converted_product_id | rank | confidence | missing_ontology_fields | source |
|---|---|---|---|---|---|---|---:|---:|---|---|
| 2026-06-24T07:08:34.211Z | recommendation | 147a1836ff126398dd86d621 | 남성 차콜 후드집업 5만원 이하 추천 [phone] | 3783092,3697526 |  |  |  |  |  | plugin |
| 2026-06-24T07:08:34.216Z | product_click | 147a1836ff126398dd86d621 | 남성 차콜 후드집업 5만원 이하 추천 | 3783092 | 3783092 |  | 1 |  |  | plugin |
| 2026-06-24T07:08:34.218Z | shortlist_save | 147a1836ff126398dd86d621 |  | 3783092,3697526 |  |  |  |  |  | plugin |
| 2026-06-24T07:08:34.220Z | compare | 147a1836ff126398dd86d621 |  | 3783092,3697526 |  |  |  |  |  | plugin |
| 2026-06-24T07:08:34.222Z | conversion | 147a1836ff126398dd86d621 |  | 3783092 |  | 3783092 |  |  |  | plugin |
| 2026-06-24T07:08:34.224Z | search | 34aaf82a09b4686756d87fc3 | 화이트 스니커즈 7만원 이하 추천 [email] | 4240660,4240657 |  |  |  |  |  | plugin |
| 2026-06-24T07:40:44.400Z | search | 03edd19af979ed90103d49c2 | 카드 [card_or_long_number] [address] 주문 [order_id] 후드집업 |  |  |  |  |  |  | plugin |
| 2026-06-24T07:56:01.629Z | recommendation | 34655f39a6569d58e19260b5 | 남성 차콜 후드집업 5만원 이하 추천 | 3783092,3697526 |  |  |  |  |  | plugin |
| 2026-06-24T07:56:01.636Z | shortlist_save | 34655f39a6569d58e19260b5 |  | 3783092,3697526 |  |  |  |  |  | plugin |
| 2026-06-24T07:56:01.644Z | product_click | 34655f39a6569d58e19260b5 | 남성 차콜 후드집업 5만원 이하 추천 | 3783092 | 3783092 |  | 1 |  |  | plugin |
| 2026-06-24T07:56:01.648Z | conversion | 34655f39a6569d58e19260b5 |  | 3783092 |  | 3783092 |  |  |  | plugin |
| 2026-06-24T11:20:43.976Z | low_confidence_recommendation | 3274a3eba4aacaa0f9ded48b | 비 오는 날 남친룩 추천 [phone] |  |  |  |  | 0.2 | occasion_tags,weather_tags,style_tags | plugin |
| 2026-06-24T15:44:11.071Z | recommendation | 34655f39a6569d58e19260b5 | 남성 차콜 후드집업 5만원 이하 추천 | 3783092,3697526 |  |  |  |  |  | plugin |
| 2026-06-24T15:44:11.078Z | shortlist_save | 34655f39a6569d58e19260b5 |  | 3783092,3697526 |  |  |  |  |  | plugin |
| 2026-06-24T15:44:11.083Z | product_click | 34655f39a6569d58e19260b5 | 남성 차콜 후드집업 5만원 이하 추천 | 3783092 | 3783092 |  | 1 |  |  | plugin |
| 2026-06-24T15:44:11.086Z | conversion | 34655f39a6569d58e19260b5 |  | 3783092 |  | 3783092 |  |  |  | plugin |

## Ontology triples
- PersonalShopperDataPack -> has_owner_tag -> hermes-profile:paperclipbase
- PersonalShopperDataPack -> has_privacy_policy -> sanitized_non_pii_events_only
- PersonalShopperDataPack -> has_total_events -> 16
- PersonalShopperDataPack -> has_click_through_rate -> 0.6
- PersonalShopperDataPack -> has_conversion_rate -> 0.6
- PersonalShopperDataPack -> has_low_confidence_count -> 1
- PersonalShopperDataPack -> has_top_query -> 남성 차콜 후드집업 5만원 이하 추천 (5)
- PersonalShopperDataPack -> has_top_query -> 남성 차콜 후드집업 5만원 이하 추천 [phone] (1)
- PersonalShopperDataPack -> has_top_query -> 비 오는 날 남친룩 추천 [phone] (1)
- PersonalShopperDataPack -> has_top_query -> 카드 [card_or_long_number] [address] 주문 [order_id] 후드집업 (1)
- PersonalShopperDataPack -> has_top_query -> 화이트 스니커즈 7만원 이하 추천 [email] (1)
- PersonalShopperDataPack -> has_top_product -> 3783092 (13)
- PersonalShopperDataPack -> has_top_product -> 3697526 (7)
- PersonalShopperDataPack -> has_top_product -> 4240657 (1)
- PersonalShopperDataPack -> has_top_product -> 4240660 (1)
- PersonalShopperDataPack -> has_generated_insight -> funnel_health
- PersonalShopperDataPack -> has_generated_insight -> top_query_pattern
- PersonalShopperDataPack -> has_generated_insight -> top_product_interest
- PersonalShopperDataPack -> has_generated_insight -> high_conversion_product
- PersonalShopperDataPack -> has_generated_insight -> color_demand
- PersonalShopperDataPack -> has_generated_insight -> category_demand
- PersonalShopperDataPack -> has_generated_insight -> ontology_gap