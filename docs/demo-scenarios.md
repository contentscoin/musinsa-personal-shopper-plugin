# Demo Scenarios — MUSINSA Personal Shopper Plugin

## Scenario 1. 차콜 후드집업 추천

### User prompt

```text
남성 차콜 후드집업 5만원 이하 추천해줘. 평소 L 입고 오버핏 좋아해.
```

### API

```http
POST /shopper/recommend
```

### Expected behavior

1. `parsed_intent` extracts gender/color/category/budget.
2. Product ontology search returns matching hoodie products.
3. Response includes `assistant_summary`, recommendation reasons, `decision_badges`, `recommendation_confidence`, `shortlist`, product URL/image.

---

## Scenario 2. Shortlist 저장 후 비교

### User prompt

```text
방금 추천한 후보 2개 shortlist에 저장하고 비교해줘.
```

### API sequence

```http
POST /shopper/shortlist
GET /shopper/shortlist/demo-session
POST /shopper/compare
```

### Expected behavior

1. 추천 후보를 session shortlist에 저장.
2. shortlist에서 product IDs를 불러옴.
3. 가격, 리뷰 수, 만족도, 할인율, 핏 신호, URL 비교.
4. `best_pick`과 `decision_notes` 생성.

---

## Scenario 3. 개인정보 제외 analytics 축적

### User/system behavior

```text
recommendation → product_click → shortlist_save → compare → conversion
```

### API sequence

```http
POST /analytics/events
GET /analytics/summary
GET /analytics/funnel
GET /analytics/products
GET /analytics/queries
GET /analytics/intents
```

### Privacy example

Input:

```text
카드 4111-1111-1111-1111 서울시 강남구 어딘가 123 주문 ABC123456 후드집업
```

Stored:

```text
카드 [card_or_long_number] [address] 주문 [order_id] 후드집업
```

---

## Scenario 4. Plugin discovery

### Client behavior

```http
GET /.well-known/ai-plugin.json
GET /openapi.yaml
```

### Expected behavior

1. Client discovers plugin metadata.
2. Client loads OpenAPI spec.
3. Client can call recommendation/shortlist/analytics endpoints.

---

## Scenario 5. Marketing insights + ontology gap loop

### User/system behavior

```text
추천 결과가 없거나 신뢰도가 낮은 질문 발생
예: 비 오는 날 남친룩 추천
```

### API sequence

```http
POST /analytics/events
GET /analytics/insights
```

### Event example

```json
{
  "event_type": "low_confidence_recommendation",
  "query": "비 오는 날 남친룩 추천",
  "confidence": 0.2,
  "missing_ontology_fields": ["occasion_tags", "weather_tags", "style_tags"]
}
```

### Expected insight

```text
추천 신뢰도가 낮은 질문이 있어 상품 태그/상황/핏 온톨로지 보강이 필요합니다.
```

### Product enrichment command

```bash
npm run enrich:products
```

Output:

```text
docs/ontology/musinsa-product-enrichment.md
```
