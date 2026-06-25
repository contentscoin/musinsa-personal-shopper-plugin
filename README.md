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
| 무신사 상품 샘플 DB | **2,050개 상품** |
| 고유 브랜드/카테고리 | **713개 브랜드 / 190개 카테고리 경로** |
| 상품 온톨로지팩 | OpenCrab private pack `0b3c79f7-1861-4466-ba20-2cbaa736de66` v2.1.0 |
| 상품 온톨로지 확장 seed pack | OpenCrab private pack `98c2c29e-c16f-4440-b98a-21ed45c75e9e` |
| Owner dashboard Convex/Vercel pack | OpenCrab private pack `6bc1f3e9-9c69-4ad6-96f0-0c8b40b3f930` |
| Convex DB/backend | Production deployment `veracious-albatross-267` |
| Vercel Owner Dashboard | **https://owner-dashboard-snowy.vercel.app** |
| 테스트 | **11개 통과** |
| 검증 리포트 | product search 320/320, OpenAPI/manifest 0 failure |
| Plugin contract | OpenAPI 3.1 + `/.well-known/ai-plugin.json` |
| Demo script | `npm run demo` |
| GitHub repo | public |
| CI | GitHub Actions workflow included |

---

## 3. 핵심 기능

| 기능 | 설명 |
|---|---|
| 상품 온톨로지 크롤러 | 공개 상품 페이지/sitemap 기반으로 상품 데이터 수집 |
| 상품 DB 온톨로지화 | 상품명, 브랜드, 가격, 리뷰, 이미지, 소재/핏 신호를 JSON/Markdown으로 구조화 |
| 자연어 intent 파싱 | 예산, 색상, 카테고리, 성별, 계절 등 쇼핑 의도 추출 |
| 상품 추천 API | 사용자 질의와 customer profile 기반 추천 |
| Score breakdown | 추천 결과별 intent/price/review/style/personalization/risk 점수 분해 |
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

Owner/운영 분석
  -> owner-dashboard/ React app
  -> Convex telemetryEvents/dashboardSnapshots
  -> Vercel production dashboard
  -> OpenCrab owner-dashboard Convex/Vercel ontology pack
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
curl -s http://localhost:8787/dashboard
```

현재 `/health` 기준 로컬 상품 로드 수는 **2,050개**입니다.

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
| `docs/ontology/musinsa-product-2050-stats.json` | 2,050개 상품/브랜드/카테고리 통계 |
| `reports/*.md` | 대량 검색/카테고리/랭킹/shortlist/OpenAPI 검증 리포트 |
| `owner-dashboard/` | Vercel + Convex 기반 오너용 analytics dashboard |
| `owner-dashboard/convex/schema.ts` | Convex `telemetryEvents`, `dashboardSnapshots` 스키마 |
| `owner-dashboard/convex/analytics.ts` | Convex analytics query/mutation 함수 |

---

## 8. API Endpoints

### Plugin/static

| Endpoint | 설명 |
|---|---|
| `GET /health` | 서버 상태와 로드된 상품 수 확인 |
| `GET /openapi.yaml` | OpenAPI spec 제공 |
| `GET /.well-known/ai-plugin.json` | Plugin manifest 제공 |
| `GET /dashboard` | 로컬 plugin server의 lightweight analytics dashboard 제공 |
| `GET /dashboard.html` | dashboard alias |
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
- `recommendations[].score_breakdown`
- `shortlist`
- `next_questions`

`score_breakdown`은 추천 근거를 투명하게 보여주기 위한 설명용 점수입니다.

```json
{
  "total": 6.71,
  "intent_match": 2.2,
  "price_fit": 1.7,
  "review_trust": 1.9,
  "style_context": 0.35,
  "personalization": 0.3,
  "business_signal": 0.8,
  "risk_penalty": -0.55
}
```

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

| Pack | 목적 | Package ID / 상태 |
|---|---|---|
| MUSINSA product DB ontology | 2,050개 상품 데이터, 링크, 이미지 URL, 가격/리뷰/소재/핏 신호 | `0b3c79f7-1861-4466-ba20-2cbaa736de66` / v2.1.0 |
| MUSINSA product sample ontology expansion | 2,050개 확장 요약 seed, category coverage, source boundary | `98c2c29e-c16f-4440-b98a-21ed45c75e9e` |
| MUSINSA owner dashboard Convex/Vercel deployment | Convex DB schema/storage, Vercel URL, sanitized telemetry facts, verification evidence | `6bc1f3e9-9c69-4ad6-96f0-0c8b40b3f930` |
| Personal Shopper Data | 비식별 사용패턴, 질문, 클릭, 전환, CTR/CVR, 마케팅 통계 | `5b77afa5-2646-4674-88e7-584cddd8f37c` |

모든 private pack은 `Owner tag: hermes-profile:paperclipbase`를 포함합니다.

Owner dashboard pack retrieval 검증 결과:

```text
Vercel URL: https://owner-dashboard-snowy.vercel.app
Convex deployment URL: https://veracious-albatross-267.convex.cloud
telemetryEvents purpose: sanitized non-PII commerce behavior events for owner analytics
seeded event count: 16
```

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
| `score_breakdown` | intent match, price fit, review trust, style context, personalization, business signal, risk penalty를 분해해 추천 설명력 강화 |

---

## 15. Owner Dashboard / Convex / Vercel

오너용 대시보드는 plugin server의 mock dashboard를 넘어, 별도 React 앱으로 배포되어 Convex DB의 sanitized telemetry를 조회합니다.

| 항목 | 값 |
|---|---|
| Dashboard URL | https://owner-dashboard-snowy.vercel.app |
| Vercel project | `owner-dashboard` |
| Convex project | `sin-taesu / musinsa-owner-dashboard` |
| Convex deployment | `production / veracious-albatross-267` |
| Convex client URL | `https://veracious-albatross-267.convex.cloud` |
| OpenCrab pack | `6bc1f3e9-9c69-4ad6-96f0-0c8b40b3f930` |

Convex tables:

| Table | Purpose | Indexes |
|---|---|---|
| `telemetryEvents` | 검색/추천/클릭/전환/low-confidence 등 비식별 commerce event 저장 | `by_event_id`, `by_type`, `by_occurred_at` |
| `dashboardSnapshots` | 오너 대시보드 요약 snapshot 저장 | `by_snapshot_id`, `by_generated_at` |

현재 seed 검증:

| 지표 | 값 |
|---|---:|
| sanitized telemetry rows | 16 |
| searches/recommendations | 5 |
| product clicks | 3 |
| conversions | 3 |
| CTR | 0.6 |
| CVR | 0.6 |
| top query | 남성 차콜 후드집업 5만원 이하 추천 |
| ontology gap fields | `occasion_tags`, `style_tags`, `weather_tags` |

로컬 실행:

```bash
cd owner-dashboard
npm install
npm run build
npm run dev
```

배포/DB 작업:

```bash
cd owner-dashboard
npx convex deploy --env-file .env.production.local
npx vercel deploy --prod
```

---

## 16. 제출/발표 문서

| 문서 | 설명 |
|---|---|
| `SUBMISSION.md` | 공고 제출용 한국어 문서 |
| `docs/primer-hack-submission.md` | Primer Hack 양식 대응 초안 |
| `docs/pitch-summary.md` | 한 장짜리 pitch summary |
| `docs/demo-scenarios.md` | 데모 시나리오 |
| `docs/implementation-plan.md` | 구현 계획/작업 매핑 |
| `RESOURCE_LINKS.md` | OpenCrab/opencrab.sh, MUSINSA robots/sitemap, GitHub 등 리소스 출처 링크 |

---

## 17. 리소스 출처 링크

핵심 출처 링크는 `RESOURCE_LINKS.md`에 정리되어 있습니다.

특히 OpenCrab 공식 사이트는 아래 링크를 사용합니다.

- OpenCrab / opencrab.sh: https://opencrab.sh
- MUSINSA robots.txt: https://www.musinsa.com/robots.txt
- MUSINSA sitemap sample: https://www.musinsa.com/static/sitemap/sitemap-goods-1.xml
- GitHub repository: https://github.com/contentscoin/musinsa-personal-shopper-plugin

---

## 18. Hackathon Narrative

**문제:** 무신사에는 풍부한 상품/리뷰/랭킹 데이터가 있지만, 고객은 여전히 검색어·필터·리뷰·사이즈 정보를 직접 조합해야 합니다. AI agent 시대에는 쇼핑도 자연어 대화에서 시작됩니다.

**해결:** MUSINSA Personal Shopper Plugin은 무신사 상품 데이터를 온톨로지 기반 AI commerce API로 전환합니다. ChatGPT/Codex는 이 API를 통해 상품 추천, 비교, 리뷰/핏 판단, shortlist 관리, analytics feedback loop를 수행할 수 있습니다.

**가치:** 고객은 더 빠르게 구매 결정을 내리고, 무신사는 개인정보 없이 질문 방식·클릭률·전환율·검색 항목을 축적해 마케팅과 추천 품질을 개선할 수 있습니다.

---

## 19. 한계와 향후 확장

현재 한계:

- 현재 plugin shortlist store는 in-memory입니다. 프로덕션에서는 Redis/Postgres/Convex 등 영속 저장소가 필요합니다.
- 현재 owner dashboard는 Convex production DB를 사용하지만 seed/demo telemetry 중심입니다. 실제 운영 traffic ingestion은 추가 보안/권한 검토가 필요합니다.
- 현재 crawler는 공개-source prototype입니다. 프로덕션에서는 공식 API/feed 전환이 필요합니다.
- 실제 장바구니, 결제, 주문 API는 구현하지 않았습니다.
- 리뷰 원문은 수집하지 않고, 공개 리뷰 집계와 소재/핏 신호를 활용합니다.

향후 확장:

- 공식 MUSINSA API/feed 연동
- plugin telemetry를 Convex로 직접 동기화하는 production ingestion endpoint
- owner dashboard 권한/로그인/role 기반 접근제어
- 실시간 재고/옵션/배송 연동
- authorized review API 기반 사이즈/핏 분석
- 장바구니/구매 링크 생성
- 글로벌 스토어 다국어 추천
- B2B Connector: 리셀러/자사몰/WMS/API feed 연동
- OpenCrab feedback loop 기반 추천 고도화
