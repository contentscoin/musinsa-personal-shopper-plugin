# MUSINSA Personal Shopper Plugin

> 무신사 상품 데이터를 온톨로지팩으로 연결해 ChatGPT/Codex에서 자연어 상품 추천, 비교, shortlist 저장, 리뷰/핏 판단, 개인정보 제외 analytics 축적까지 수행하는 AI 쇼핑 플러그인 프로토타입입니다.

## 1. 프로젝트 개요

**MUSINSA Personal Shopper Plugin**은 무신사 상품 데이터를 AI agent가 이해하기 쉬운 형태로 구조화하고, OpenAPI-compatible plugin server로 제공합니다.

사용자는 다음처럼 자연어로 쇼핑 의도를 말할 수 있습니다.

- `5만원 이하 미니멀 후드집업 추천해줘`
- `남성 차콜 후드집업 5만원 이하 추천`
- `이 상품은 정사이즈야? 리뷰/핏 기준으로 알려줘`
- `후보 상품을 가격/리뷰/만족도로 비교해줘`
- `추천 후보를 shortlist에 저장하고 나중에 비교해줘`

플러그인은 상품 추천뿐 아니라 **개인정보를 제외한 사용패턴/질문/클릭/전환 통계**도 수집해 `Personal Shopper Data` 온톨로지팩으로 축적합니다. 이 데이터는 AI 추천 품질 개선과 무신사 마케팅 통계자료로 활용할 수 있습니다.

---

## 2. 현재 MVP 상태

| 항목 | 상태 |
|---|---:|
| 무신사 상품 샘플 DB | 41개 상품 |
| 상품 온톨로지팩 | OpenCrab private pack 생성 |
| Personal Shopper Data 팩 | OpenCrab private pack 생성 |
| 테스트 | 11개 통과 |
| Plugin contract | OpenAPI 3.1 + `/.well-known/ai-plugin.json` |
| Demo script | `npm run demo` |
| GitHub repo | public |

---

## 3. 핵심 기능

| 기능 | 설명 |
|---|---|
| 상품 온톨로지 크롤러 | 공개 상품 페이지/sitemap 기반으로 상품 데이터 수집 |
| 상품 DB 온톨로지화 | 상품명, 브랜드, 가격, 리뷰, 이미지, 소재/핏 신호를 JSON/Markdown으로 구조화 |
| 자연어 intent 파싱 | 예산, 색상, 카테고리, 성별, 계절 등 쇼핑 의도 추출 |
| 상품 추천 API | 사용자 질의와 customer profile 기반 추천 |
| 리뷰/핏 인사이트 | 리뷰 집계, 소재/핏 라벨 기반 구매 조언 생성 |
| 상품 비교 API | 후보 상품의 가격, 리뷰 수, 만족도, 할인율, 핏 신호 비교 |
| Shortlist API | 세션별 추천 후보 저장/조회/삭제 |
| 개인정보 제외 analytics | 검색, 추천, 클릭, 비교, 전환 이벤트 기록 |
| Analytics dashboard | funnel, products, queries, intents, insights 통계 API 제공 |
| Marketing insights | CTR/CVR, top query/product, ontology gap 기반 자동 인사이트 생성 |
| Low-confidence loop | 추천 신뢰도가 낮은 질문을 ontology 개선 seed로 저장 |
| Product enrichment | style_tags, occasion_tags, season_tags, fit_tags, risk_tags 보강 |
| OpenCrab sync | analytics export를 Personal Shopper Data 온톨로지팩에 축적 |
| Plugin packaging | OpenAPI, plugin manifest, demo script, 제출 문서 포함 |

---

## 4. 데이터 수집/크롤링 경계

이 MVP는 비공개 API나 파트너 API를 가정하지 않습니다. 구현 시점 기준으로 공개 페이지/sitemap과 `robots.txt` 허용 범위를 확인해 보수적으로 수집합니다.

프로덕션 환경에서는 반드시 다음 중 하나로 전환하는 것을 권장합니다.

- 무신사 공식 API
- 파트너 feed
- 사전 승인된 데이터 export
- 서면 허가 기반 crawling/data pipeline

크롤러 안전장치:

- User-Agent: `ChatGPT-User`
- `robots.txt` 확인
- 공식 sitemap URL에서 시작
- request rate-limit 적용
- source URL, crawled_at, image metadata 저장
- 로그인/마이페이지/좋아요/주문/결제 등 private path 제외
- 실패 URL은 기록하고 전체 프로세스는 계속 진행

---

## 5. 아키텍처

```text
MUSINSA sitemap/product pages
  -> scripts/crawl-musinsa-products.mjs
  -> data/products.crawled.json
  -> docs/ontology/musinsa-product-ontology-sample.md
  -> OpenCrab product ontology pack
  -> src/server.mjs OpenAPI-compatible plugin server
  -> ChatGPT/Codex 또는 외부 앱

사용자 plugin 행동
  -> POST /analytics/events
  -> PII sanitizer + session hash
  -> data/telemetry/events.jsonl
  -> analytics summary/dashboard APIs
  -> scripts/export-personal-shopper-data-ontology.mjs
  -> OpenCrab personal-shopper-data ontology pack
```

---

## 6. 빠른 실행

### 테스트

```bash
npm test
```

예상 결과:

```text
# tests 11
# pass 11
# fail 0
```

### 서버 실행

```bash
npm start
```

기본 포트는 `8787`입니다.

### 상태 확인

```bash
curl -s http://localhost:8787/health
curl -s http://localhost:8787/openapi.yaml
curl -s http://localhost:8787/.well-known/ai-plugin.json
```

### End-to-end demo 실행

```bash
npm run demo
```

Demo flow:

```text
recommend
  -> analytics recommendation event
  -> shortlist save
  -> analytics shortlist event
  -> compare
  -> product click event
  -> conversion event
  -> analytics summary
```

---

## 7. 주요 파일 구조

| 파일 | 설명 |
|---|---|
| `.well-known/ai-plugin.json` | ChatGPT-style plugin manifest |
| `openapi.yaml` | OpenAPI 3.1 API contract |
| `src/server.mjs` | HTTP JSON API server + static plugin files |
| `src/productStore.mjs` | 상품 DB 로드/검색 |
| `src/personalShopper.mjs` | intent 파싱, 추천, 비교, 상품 인사이트 |
| `src/shortlistStore.mjs` | 세션별 shortlist 저장소 |
| `src/telemetryStore.mjs` | 개인정보 제외 telemetry sanitizer/summary/dashboard |
| `scripts/demo.mjs` | end-to-end demo script |
| `scripts/crawl-musinsa-products.mjs` | 공개 상품 크롤러 |
| `scripts/export-personal-shopper-data-ontology.mjs` | analytics ontology export |
| `SUBMISSION.md` | 제출용 한국어 문서 |
| `docs/pitch-summary.md` | 한 장짜리 pitch summary |
| `docs/demo-scenarios.md` | 심사/발표용 demo scenarios |
| `docs/ontology/*.md` | OpenCrab-ready ontology artifacts |

---

## 8. API Endpoints

### Plugin/static

| Endpoint | 설명 |
|---|---|
| `GET /health` | 서버 상태와 로드된 상품 수 확인 |
| `GET /openapi.yaml` | OpenAPI spec 제공 |
| `GET /.well-known/ai-plugin.json` | Plugin manifest 제공 |
| `GET /logo.png` | Manifest 호환용 placeholder |

### Shopping API

| Endpoint | 설명 |
|---|---|
| `POST /products/search` | 자연어/필터 기반 상품 검색 |
| `GET /products/:productId` | 상품 상세 조회 |
| `POST /products/:productId/reviews/summary` | 리뷰/핏/소재 인사이트 요약 |
| `POST /shopper/recommend` | 자연어 intent + customer profile 기반 추천 |
| `POST /shopper/compare` | 후보 상품 비교 및 best pick 반환 |
| `POST /shopper/shortlist` | 추천 후보 shortlist 저장 |
| `GET /shopper/shortlist/:sessionId` | shortlist 조회 |
| `DELETE /shopper/shortlist/:sessionId` | shortlist 삭제 |

### Analytics API

| Endpoint | 설명 |
|---|---|
| `GET /analytics/notice` | 개인정보 제외 analytics 고지문 |
| `POST /analytics/events` | sanitized analytics event 기록 |
| `GET /analytics/summary` | 전체 analytics summary |
| `GET /analytics/funnel` | 추천/클릭/전환 funnel, CTR, CVR |
| `GET /analytics/products` | top products/clicked/converted products |
| `GET /analytics/queries` | 상위 sanitized query |
| `GET /analytics/intents` | 색상/카테고리/성별/예산 intent 통계 |
| `GET /analytics/insights` | CTR/CVR, top query/product, ontology gap 기반 자동 마케팅 인사이트 |
| `POST /analytics/export` | export-ready analytics summary 생성 |

---

## 9. 추천 API 예시

```bash
curl -s -X POST http://localhost:8787/shopper/recommend \
  -H 'content-type: application/json' \
  -d '{
    "query":"남성 차콜 후드집업 5만원 이하 추천",
    "customer_profile":{"usual_size":"L","fit_preference":"오버핏"},
    "limit":2
  }'
```

응답에는 다음 정보가 포함됩니다.

- `parsed_intent`
- `assistant_summary`
- `recommendations`
- `shortlist`
- `next_questions`

---

## 10. 데모 시나리오

### 시나리오 A — 차콜 후드집업 추천

사용자:

```text
남성 차콜 후드집업 5만원 이하 추천해줘. 평소 L 입고 오버핏 좋아해.
```

플러그인 동작:

1. 예산 50,000원, 색상 차콜, 카테고리 후드집업, 성별 남성 추출
2. 상품 온톨로지에서 조건에 맞는 상품 검색
3. 가격, 리뷰 수, 만족도, 핏 신호 기반 추천
4. 구매 링크와 이미지 반환

### 시나리오 B — shortlist 저장 후 비교

```text
방금 추천한 후보 2개 shortlist에 저장하고 비교해줘.
```

플러그인 동작:

1. 후보 상품을 session shortlist에 저장
2. 가격/리뷰/만족도/할인율/핏 신호 비교
3. best pick과 decision notes 반환

### 시나리오 C — 개인정보 제외 analytics 축적

사용자 행동:

```text
recommendation -> product_click -> shortlist_save -> compare -> conversion
```

플러그인 동작:

1. query와 metadata에서 개인정보 제거
2. session ID hash prefix 저장
3. CTR/CVR/top product/top query 집계
4. Personal Shopper Data 온톨로지팩에 export/sync

---

## 11. 개인정보/데이터 보호 정책

Analytics pipeline은 상품 추천 품질 개선과 마케팅 통계 생성을 위해 **비식별 이벤트**만 저장합니다.

저장하지 않는 정보:

- 이름
- 이메일
- 전화번호
- 주소
- 주문번호
- 송장번호
- 카드번호/긴 숫자열
- IP 주소
- raw user ID
- raw session ID

Sanitization 예시:

```text
010-1234-5678 -> [phone]
test@example.com -> [email]
서울시 강남구 ... -> [address]
주문 ABC123456 -> 주문 [order_id]
송장 123456789012 -> 송장 [tracking_id]
4111-1111-1111-1111 -> [card_or_long_number]
127.0.0.1 -> [ip]
```

Session ID는 raw 값이 아니라 SHA-256 hash prefix로 저장합니다.

---

## 12. OpenCrab 온톨로지팩

| Pack | 목적 | Package ID |
|---|---|---|
| MUSINSA product DB ontology | 상품 데이터, 링크, 이미지 URL, 가격/리뷰/소재 신호 | `0b3c79f7-1861-4466-ba20-2cbaa736de66` |
| Personal Shopper Data | 비식별 사용패턴, 질문, 클릭, 전환, CTR/CVR, 마케팅 통계 | `5b77afa5-2646-4674-88e7-584cddd8f37c` |

Personal Shopper Data pack은 1시간마다 자동 sync되도록 cron job이 설정되어 있습니다.

---

## 13. Analytics export

```bash
npm run analytics:export
```

출력 파일:

```text
docs/ontology/personal-shopper-data-ontology.md
```

---

## 14. AI Commerce Intelligence Loop

이번 고도화에서 플러그인은 단순 추천 API를 넘어 **AI commerce intelligence loop**를 갖도록 확장되었습니다.

```text
사용자 자연어 질문
  -> 추천/비교/shortlist
  -> 개인정보 제외 analytics event
  -> /analytics/insights 자동 인사이트
  -> low_confidence_recommendation으로 ontology gap 기록
  -> 상품 style/occasion/risk tag enrichment
  -> OpenCrab product/data packs 갱신
```

추가된 고도화 요소:

| 요소 | 설명 |
|---|---|
| `/analytics/insights` | CTR/CVR, top query, top product, 색상/카테고리 수요, ontology gap 자동 요약 |
| `low_confidence_recommendation` | 추천 신뢰도가 낮은 질문을 저장해 상품 온톨로지 개선 seed로 사용 |
| `npm run enrich:products` | 상품별 style/occasion/season/fit/risk tag 자동 보강 |
| `docs/ontology/musinsa-product-enrichment.md` | enrichment 결과를 OpenCrab-ready ontology 문서로 저장 |

---

## 15. 제출/발표 문서

| 문서 | 설명 |
|---|---|
| `SUBMISSION.md` | 공고 제출용 한국어 문서 |
| `docs/primer-hack-submission.md` | Primer Hack 양식 대응 초안 |
| `docs/pitch-summary.md` | 한 장짜리 pitch summary |
| `docs/demo-scenarios.md` | 데모 시나리오 |
| `docs/implementation-plan.md` | 구현 계획/작업 매핑 |

---

## 16. Hackathon Narrative

**문제:** 무신사에는 풍부한 상품/리뷰/랭킹 데이터가 있지만, 고객은 여전히 검색어·필터·리뷰·사이즈 정보를 직접 조합해야 합니다. AI agent 시대에는 쇼핑도 자연어 대화에서 시작됩니다.

**해결:** MUSINSA Personal Shopper Plugin은 무신사 상품 데이터를 온톨로지 기반 AI commerce API로 전환합니다. ChatGPT/Codex는 이 API를 통해 상품 추천, 비교, 리뷰/핏 판단, shortlist 관리, analytics feedback loop를 수행할 수 있습니다.

**가치:** 고객은 더 빠르게 구매 결정을 내리고, 무신사는 개인정보 없이 질문 방식·클릭률·전환율·검색 항목을 축적해 마케팅과 추천 품질을 개선할 수 있습니다.

---

## 17. 한계와 향후 확장

현재 한계:

- 현재 shortlist store는 in-memory입니다. 프로덕션에서는 Redis/Postgres가 필요합니다.
- 현재 crawler는 공개-source prototype입니다. 프로덕션에서는 공식 API/feed 전환이 필요합니다.
- 실제 장바구니, 결제, 주문 API는 구현하지 않았습니다.
- 리뷰 원문은 수집하지 않고, 공개 리뷰 집계와 소재/핏 신호를 활용합니다.

향후 확장:

- 공식 MUSINSA API/feed 연동
- 실시간 재고/옵션/배송 연동
- authorized review API 기반 사이즈/핏 분석
- 장바구니/구매 링크 생성
- 글로벌 스토어 다국어 추천
- B2B Connector: 리셀러/자사몰/WMS/API feed 연동
- OpenCrab feedback loop 기반 추천 고도화
