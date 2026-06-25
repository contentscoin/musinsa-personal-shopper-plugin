# MUSINSA Personal Shopper Plugin

무신사 상품 데이터를 **ChatGPT Plugin App / OpenAPI plugin endpoint**로 연결해 **자연어 상품 검색, 추천, 비교, shortlist, 비식별 analytics, OpenCrab 온톨로지 기반 provenance 검색**을 제공하는 AI commerce plugin prototype입니다.

## 핵심 요약

| 항목 | 현재 상태 |
|---|---:|
| Live plugin endpoint | **https://musinsa-personal-shopper-plugin.vercel.app** |
| 상품 catalog | **2,050개 상품** |
| 브랜드/카테고리 | **713개 브랜드 / 190개 카테고리 경로** |
| API contract | OpenAPI 3.1 + `/.well-known/ai-plugin.json` |
| ChatGPT 등록 매뉴얼 | [`docs/chatgpt-app-registration.md`](docs/chatgpt-app-registration.md) |
| OpenCrab product pack | `0b3c79f7-1861-4466-ba20-2cbaa736de66` v3.8.0 |
| Hybrid retrieval gate | 60/60 pass, provenance coverage 60/60 |
| Tests | 31 pass / 0 fail |
| Owner dashboard | https://owner-dashboard-snowy.vercel.app |
| 상세 기술 문서 | [`docs/project-details.md`](docs/project-details.md) |

## 무엇을 할 수 있나

- 자연어 쇼핑 의도 파싱: 예산, 색상, 카테고리, 성별, 브랜드, 핏/소재 취향
- 상품 검색/추천: local index + OpenCrab semantic candidate/provenance 기반 hybrid rerank
- 상품 상세/리뷰 요약: fit/material/risk signal 중심 구매 판단 지원
- 후보 비교: 가격, 리뷰, 만족도, 핏, 할인율 기준 best pick 제안
- Shortlist: 세션별 상품 후보 저장/조회/삭제
- Privacy-safe analytics: raw PII 없이 검색/추천/클릭/전환/low-confidence event 집계
- Owner dashboard: live/fallback 상태가 구분되는 analytics dashboard

## 빠른 실행

```bash
npm install
npm test
npm start
```

서버 기본 포트는 `8787`입니다.

```bash
curl -s http://localhost:8787/health
curl -s http://localhost:8787/openapi.yaml
curl -s http://localhost:8787/.well-known/ai-plugin.json
curl -s http://localhost:8787/analytics/notice
curl -s http://localhost:8787/dashboard
```

예상 테스트 결과:

```text
# tests 31
# pass 31
# fail 0
```

## ChatGPT Plugin App 등록

ChatGPT의 **플러그인 앱 등록**에는 GPT Builder Actions URL이 아니라, public plugin app endpoint를 기준으로 제출합니다.

```text
Plugin app base URL: https://musinsa-personal-shopper-plugin.vercel.app
Plugin manifest URL: https://musinsa-personal-shopper-plugin.vercel.app/.well-known/ai-plugin.json
OpenAPI URL: https://musinsa-personal-shopper-plugin.vercel.app/openapi.yaml
```

등록 화면에서 단일 endpoint/domain을 요구하면 **base URL**을, manifest URL을 요구하면 **`/.well-known/ai-plugin.json`**을 넣습니다. OpenAPI URL은 manifest의 `api.url`에서 자동 참조됩니다.

필수 URL:

```text
https://musinsa-personal-shopper-plugin.vercel.app/health
https://musinsa-personal-shopper-plugin.vercel.app/.well-known/ai-plugin.json
https://musinsa-personal-shopper-plugin.vercel.app/openapi.yaml
https://musinsa-personal-shopper-plugin.vercel.app/analytics/notice
https://musinsa-personal-shopper-plugin.vercel.app/logo.png
```

전체 Plugin App 등록 절차, 제출 필드, 테스트 프롬프트, 실패 대응표는 아래 문서에 정리했습니다.

- [`docs/chatgpt-app-registration.md`](docs/chatgpt-app-registration.md)

## 주요 API

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/health` | 서버 상태/상품 수 확인 |
| GET | `/openapi.yaml` | OpenAPI schema |
| GET | `/.well-known/ai-plugin.json` | ChatGPT Plugin App manifest |
| POST | `/products/search` | 자연어/필터 기반 상품 검색 |
| GET | `/products/:productId` | 상품 상세 조회 |
| POST | `/products/:productId/reviews/summary` | 리뷰/핏/소재 인사이트 |
| POST | `/shopper/recommend` | 자연어 intent + profile 기반 추천 |
| POST | `/shopper/compare` | 후보 상품 비교 및 best pick |
| POST/GET/DELETE | `/shopper/shortlist` | shortlist 저장/조회/삭제 |
| POST | `/analytics/events` | sanitized analytics event 기록 |
| GET | `/analytics/summary` | analytics summary |
| GET | `/analytics/insights` | CTR/CVR, top query/product, ontology gap 인사이트 |
| GET | `/dashboard` | live/fallback 구분 analytics dashboard |

## 예시 요청

### 상품 추천

```bash
curl -s -X POST http://localhost:8787/shopper/recommend \
  -H 'content-type: application/json' \
  -d '{
    "query":"남성 차콜 후드집업 5만원 이하 추천",
    "customer_profile":{"usual_size":"L","fit_preference":"오버핏"},
    "limit":2
  }'
```

### Hybrid OpenCrab 검색

```bash
curl -s -X POST http://localhost:8787/products/search \
  -H 'content-type: application/json' \
  -d '{
    "query":"175cm 88kg 릴렉스핏 남성 여유핏",
    "retrieval_mode":"hybrid",
    "limit":5
  }'
```

응답의 `retrieval.opencrab_adapter.candidate_rows`에는 `product_id`, 원본 MUSINSA `source_url`, OpenCrab `package_id`, evidence source가 포함됩니다.

## 검증 명령

```bash
npm test
npm run demo
npm run verify:dashboard
npm run verify:opencrab-bridge
npm run verify:opencrab-live-bridge
npm run test:hybrid-opencrab
```

최근 검증 요약:

| Gate | 결과 |
|---|---:|
| Unit tests | 31/31 pass |
| Product search mass test | 320/320 pass |
| Hybrid OpenCrab quality gate | 60/60 pass |
| OpenAPI/manifest connection | 0 failures |
| Dashboard live/fallback verifier | pass |

## OpenCrab / 온톨로지 구조

이 plugin은 OpenCrab을 hot path 전체 DB로 쓰지 않고, **semantic candidate/provenance layer**로 사용합니다.

```text
OpenCrab ontology packs
  -> semantic candidate product_ids + evidence rows
  -> plugin local index/cache
  -> deterministic rerank
  -> 상품 + 원본 MUSINSA 링크 + provenance 반환
```

핵심 pack:

| Pack | Package ID / 상태 |
|---|---|
| MUSINSA product DB ontology | `0b3c79f7-1861-4466-ba20-2cbaa736de66` v3.8.0 |
| MUSINSA product sample expansion | `98c2c29e-c16f-4440-b98a-21ed45c75e9e` |
| Owner dashboard Convex/Vercel | `6bc1f3e9-9c69-4ad6-96f0-0c8b40b3f930` |
| Personal Shopper Data | `5b77afa5-2646-4674-88e7-584cddd8f37c` |

모든 private pack은 `Owner tag: hermes-profile:paperclipbase` 기준으로 관리합니다.

## Privacy / 데이터 경계

이 MVP는 개인정보를 저장하지 않습니다.

- 저장하지 않음: 이름, 이메일, 전화번호, 주소, 주문번호, 송장번호, 카드번호/긴 숫자열, IP, raw user/session ID
- 저장함: sanitized query, parsed intent, product IDs, event type, aggregate CTR/CVR, ontology gap fields
- session id는 raw 값이 아니라 hash prefix로 저장합니다.
- 자세한 고지문: `GET /analytics/notice`

상품 데이터는 공개 page/sitemap 기반 prototype입니다. production에서는 공식 API, 파트너 feed, 승인된 export 또는 서면 허가 기반 pipeline으로 전환해야 합니다.

## 주요 문서

| 문서 | 내용 |
|---|---|
| [`docs/chatgpt-app-registration.md`](docs/chatgpt-app-registration.md) | ChatGPT Plugin App 등록 매뉴얼 |
| [`docs/project-details.md`](docs/project-details.md) | 아키텍처/API/OpenCrab/analytics/dashboard 상세 설명 |
| [`SUBMISSION.md`](SUBMISSION.md) | 제출용 한국어 문서 |
| [`docs/demo-scenarios.md`](docs/demo-scenarios.md) | 심사/발표용 demo scenarios |
| [`docs/pitch-summary.md`](docs/pitch-summary.md) | 한 장짜리 pitch summary |
| [`RESOURCE_LINKS.md`](RESOURCE_LINKS.md) | OpenCrab, MUSINSA robots/sitemap, GitHub 등 리소스 출처 |
| [`reports/`](reports/) | 품질 게이트/검증 리포트 |

## 핵심 파일

| 파일 | 설명 |
|---|---|
| `src/server.mjs` | HTTP JSON API server + static plugin files |
| `src/productStore.mjs` | 상품 DB 로드/검색 + local index + hybrid rerank |
| `src/opencrabRetrieval.mjs` | OpenCrab/ontology retrieval adapter |
| `src/personalShopper.mjs` | intent parsing, 추천, 비교, 상품 인사이트 |
| `src/telemetryStore.mjs` | 개인정보 제외 telemetry sanitizer/summary/dashboard |
| `openapi.yaml` | OpenAPI 3.1 API contract |
| `.well-known/ai-plugin.json` | ChatGPT Plugin App manifest |
| `scripts/opencrab-retrieval-bridge.mjs` | OpenCrab evidence bridge |
| `scripts/opencrab-live-command.mjs` | OpenCrab project_run command adapter |
| `owner-dashboard/` | Vercel + Convex owner analytics dashboard |

## 한계와 다음 단계

현재 한계:

- shortlist store는 in-memory입니다.
- owner dashboard는 seed/demo telemetry 중심입니다.
- crawler는 공개-source prototype입니다.
- 장바구니/결제/주문 API는 구현하지 않았습니다.

다음 단계:

- 실제 OpenCrab `project_run` HTTP endpoint 연결
- 공식 MUSINSA API/feed 연동
- owner dashboard 권한/로그인/role 기반 접근제어
- 실시간 재고/옵션/배송/구매 링크 연동
