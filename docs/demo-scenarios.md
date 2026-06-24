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

1. `parsed_intent` extracts:
   - gender: 남성
   - color: 차콜
   - category: 후드집업
   - budget: 50000
2. Product ontology search returns matching hoodie products.
3. Response includes:
   - `assistant_summary`
   - recommendation reasons
   - `decision_badges`
   - `shortlist`
   - product URL/image

### Demo output highlight

```text
상위 후보는 [크롭선택] ASI 포시즌 에센셜 후드 집업_피그먼트 차콜입니다.
39,900원, 리뷰 11,607개, 만족도 4.8 기준으로 가장 관련도가 높습니다.
```

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

### Demo output highlight

```text
best_pick: [2-WAY] 슬리브 스타 피그먼트 후드 집업 스모크블랙
가격 우선이면 해당 상품이 가장 유리합니다.
리뷰 검증 우선이면 ASI 포시즌 후드 집업이 가장 강합니다.
```

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

### Expected behavior

1. Query에서 이메일/전화번호/주소/주문번호/카드번호/IP 제거.
2. Session ID는 hash prefix로 저장.
3. 이벤트 row와 집계 통계 생성.
4. Personal Shopper Data 온톨로지팩에 sync.

### Privacy example

Input:

```text
카드 4111-1111-1111-1111 서울시 강남구 어딘가 123 주문 ABC123456 후드집업
```

Stored:

```text
카드 [card_or_long_number] [address] 주문 [order_id] 후드집업
```

### Dashboard output

```text
total_events: 11
CTR: 0.5
CVR: 0.5
top_product: 3783092
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

### Verified

```text
/.well-known/ai-plugin.json served, 1,038 bytes
/openapi.yaml served, 10,695 bytes
```
