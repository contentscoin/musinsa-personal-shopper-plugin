# MUSINSA Personal Shopper Data Ontology Pack

Owner tag: hermes-profile:paperclipbase
Pack intent: personal-shopper-data
Generated at: 2026-06-24T08:44:42.219Z

## Privacy boundary
- No names, phone numbers, emails, addresses, order IDs, IP addresses, or raw user identifiers are stored.
- Session identifiers are SHA-256 hashed and truncated.
- Queries are regex-sanitized before storage.
- Pack owner can view sanitized event-level rows plus aggregate statistics.

## Funnel metrics
- Total events: 11
- Searches/recommendations: 4
- Product clicks: 2
- Conversions: 2
- Click-through rate: 0.5
- Conversion rate: 0.5

## Event counts
- conversion: 2
- product_click: 2
- recommendation: 2
- search: 2
- shortlist_save: 2
- compare: 1

## Top queries
- 남성 차콜 후드집업 5만원 이하 추천: 3
- 남성 차콜 후드집업 5만원 이하 추천 [phone]: 1
- 카드 [card_or_long_number] [address] 주문 [order_id] 후드집업: 1
- 화이트 스니커즈 7만원 이하 추천 [email]: 1

## Top products
- 3783092: 9
- 3697526: 5
- 4240657: 1
- 4240660: 1

## Top clicked products
- 3783092: 2

## Top converted products
- 3783092: 2

## Top colors
- 차콜: 2
- 화이트: 1

## Top categories
- 후드집업: 3
- 스니커즈: 1

## Top budgets
- 50000: 2
- 70000: 1

## Sanitized event rows
| occurred_at | event_type | session_hash | query | product_ids | clicked_product_id | converted_product_id | rank | source |
|---|---|---|---|---|---|---|---:|---|
| 2026-06-24T07:08:34.211Z | recommendation | 147a1836ff126398dd86d621 | 남성 차콜 후드집업 5만원 이하 추천 [phone] | 3783092,3697526 |  |  |  | plugin |
| 2026-06-24T07:08:34.216Z | product_click | 147a1836ff126398dd86d621 | 남성 차콜 후드집업 5만원 이하 추천 | 3783092 | 3783092 |  | 1 | plugin |
| 2026-06-24T07:08:34.218Z | shortlist_save | 147a1836ff126398dd86d621 |  | 3783092,3697526 |  |  |  | plugin |
| 2026-06-24T07:08:34.220Z | compare | 147a1836ff126398dd86d621 |  | 3783092,3697526 |  |  |  | plugin |
| 2026-06-24T07:08:34.222Z | conversion | 147a1836ff126398dd86d621 |  | 3783092 |  | 3783092 |  | plugin |
| 2026-06-24T07:08:34.224Z | search | 34aaf82a09b4686756d87fc3 | 화이트 스니커즈 7만원 이하 추천 [email] | 4240660,4240657 |  |  |  | plugin |
| 2026-06-24T07:40:44.400Z | search | 03edd19af979ed90103d49c2 | 카드 [card_or_long_number] [address] 주문 [order_id] 후드집업 |  |  |  |  | plugin |
| 2026-06-24T07:56:01.629Z | recommendation | 34655f39a6569d58e19260b5 | 남성 차콜 후드집업 5만원 이하 추천 | 3783092,3697526 |  |  |  | plugin |
| 2026-06-24T07:56:01.636Z | shortlist_save | 34655f39a6569d58e19260b5 |  | 3783092,3697526 |  |  |  | plugin |
| 2026-06-24T07:56:01.644Z | product_click | 34655f39a6569d58e19260b5 | 남성 차콜 후드집업 5만원 이하 추천 | 3783092 | 3783092 |  | 1 | plugin |
| 2026-06-24T07:56:01.648Z | conversion | 34655f39a6569d58e19260b5 |  | 3783092 |  | 3783092 |  | plugin |

## Ontology triples
- PersonalShopperDataPack -> has_owner_tag -> hermes-profile:paperclipbase
- PersonalShopperDataPack -> has_privacy_policy -> sanitized_non_pii_events_only
- PersonalShopperDataPack -> has_total_events -> 11
- PersonalShopperDataPack -> has_click_through_rate -> 0.5
- PersonalShopperDataPack -> has_conversion_rate -> 0.5
- PersonalShopperDataPack -> has_top_query -> 남성 차콜 후드집업 5만원 이하 추천 (3)
- PersonalShopperDataPack -> has_top_query -> 남성 차콜 후드집업 5만원 이하 추천 [phone] (1)
- PersonalShopperDataPack -> has_top_query -> 카드 [card_or_long_number] [address] 주문 [order_id] 후드집업 (1)
- PersonalShopperDataPack -> has_top_query -> 화이트 스니커즈 7만원 이하 추천 [email] (1)
- PersonalShopperDataPack -> has_top_product -> 3783092 (9)
- PersonalShopperDataPack -> has_top_product -> 3697526 (5)
- PersonalShopperDataPack -> has_top_product -> 4240657 (1)
- PersonalShopperDataPack -> has_top_product -> 4240660 (1)