# MUSINSA Personal Shopper Plugin — Primer Hack 제출본

## 1. 프로젝트명

**MUSINSA Personal Shopper Plugin**

## 2. 한 줄 소개

무신사 상품 데이터를 온톨로지팩으로 연결해 ChatGPT/Codex에서 자연어로 상품 추천, 비교, shortlist 저장, 리뷰/핏 판단, 클릭/전환 통계까지 수행하는 AI 쇼핑 플러그인입니다.

## 3. 문제 정의

무신사에는 상품, 브랜드, 가격, 할인, 이미지, 리뷰 집계, 소재/핏 신호 등 구매 판단에 필요한 데이터가 풍부합니다. 하지만 사용자는 여전히 검색창, 카테고리, 필터, 리뷰, 사이즈 정보를 각각 직접 확인해야 합니다.

실제 고객 질문은 다음처럼 자연어에 가깝습니다.

- “5만원 이하 차콜 후드집업 추천해줘”
- “평소 L 입고 오버핏 좋아하는데 이 상품 괜찮아?”
- “화이트 스니커즈 후보 2개 비교해줘”
- “리뷰 많은 상품 위주로 골라줘”

반면 기존 쇼핑 UI는 이런 의도를 바로 구매 후보로 바꾸기 어렵습니다. 개발자 입장에서도 무신사 상품 경험을 ChatGPT, Codex, 쇼핑봇, 외부 앱에 붙일 수 있는 표준 plugin/API layer가 부족합니다.

## 4. 해결 방법

MUSINSA Personal Shopper Plugin은 무신사 상품 데이터를 AI가 이해하기 쉬운 온톨로지 구조로 바꾸고, OpenAPI-compatible plugin server를 통해 ChatGPT/Codex가 호출할 수 있게 합니다.

핵심 흐름:

```text
MUSINSA product data
  -> product ontology JSON/Markdown
  -> OpenCrab product ontology pack
  -> OpenAPI plugin server
  -> ChatGPT/Codex natural-language shopping agent
```

사용자는 자연어로 질문하고, 플러그인은 다음을 수행합니다.

1. 예산, 색상, 카테고리, 성별, 브랜드, 계절 intent 추출
2. 상품 DB/온톨로지 검색
3. 가격, 리뷰 수, 만족도, 소재/핏 신호 기반 추천
4. shortlist 저장
5. 후보 비교 및 best pick 제안
6. 개인정보 제외 analytics event 기록
7. CTR/CVR, top query/product/intent를 Personal Shopper Data 온톨로지팩에 축적

## 5. 핵심 기능

| 기능 | 설명 | 구현 상태 |
|---|---|---|
| Product ontology crawler | 공개 상품 페이지/sitemap 기반 상품 데이터 수집 | 구현 |
| Product DB ontology pack | 상품명, 브랜드, 가격, 리뷰, 이미지, 소재/핏 신호 온톨로지화 | 구현 |
| Natural language intent parser | 예산/색상/카테고리/성별/계절 추출 | 구현 |
| Recommendation API | 자연어 질의와 customer profile 기반 추천 | 구현 |
| Review/Fit insight | 리뷰 집계/소재/핏 라벨 기반 구매 조언 | 구현 |
| Product comparison | 후보 상품 비교표, best pick, decision notes | 구현 |
| Shortlist API | 세션별 후보 저장/조회/삭제 | 구현 |
| Non-PII analytics | 검색/추천/클릭/전환/비교 이벤트 수집 | 구현 |
| Analytics dashboard | funnel/products/queries/intents 통계 API | 구현 |
| Marketing insights | CTR/CVR, top query/product, ontology gap 자동 인사이트 | 구현 |
| Low-confidence loop | 신뢰도 낮은 질문을 온톨로지 개선 seed로 축적 | 구현 |
| Product enrichment | style/occasion/season/fit/risk tags 자동 보강 | 구현 |
| OpenCrab sync | Personal Shopper Data 온톨로지팩 자동 축적 | 구현 |
| Plugin packaging | OpenAPI + ai-plugin manifest + demo script + ZIP | 구현 |

## 6. 주요 API

### Plugin/static

- `GET /health`
- `GET /openapi.yaml`
- `GET /.well-known/ai-plugin.json`

### Shopping

- `POST /products/search`
- `GET /products/{productId}`
- `POST /products/{productId}/reviews/summary`
- `POST /shopper/recommend`
- `POST /shopper/compare`
- `POST /shopper/shortlist`
- `GET /shopper/shortlist/{sessionId}`
- `DELETE /shopper/shortlist/{sessionId}`

### Analytics

- `GET /analytics/notice`
- `POST /analytics/events`
- `GET /analytics/summary`
- `GET /analytics/funnel`
- `GET /analytics/products`
- `GET /analytics/queries`
- `GET /analytics/intents`
- `GET /analytics/insights`
- `POST /analytics/export`

## 7. 데모 시나리오

### 시나리오 A — 후드집업 추천

사용자:

> 남성 차콜 후드집업 5만원 이하 추천해줘. 평소 L 입고 오버핏 좋아해.

플러그인:

- `parsed_intent`: 예산 50,000원, 색상 차콜, 카테고리 후드집업, 성별 남성
- 추천 1순위: `[크롭선택] ASI 포시즌 에센셜 후드 집업_피그먼트 차콜`
- 이유: 카테고리/색상/예산 일치, 리뷰 11,607개, 만족도 4.8, 오버핏 신호
- shortlist 후보 2개 생성

### 시나리오 B — shortlist + 비교

사용자:

> 방금 추천한 후보 둘 비교해줘.

플러그인:

- shortlist에서 후보 상품 ID 로드
- 가격, 리뷰 수, 만족도, 할인율, 핏 신호 비교
- best pick 제안
- decision notes 생성

### 시나리오 C — 비식별 analytics 축적

사용자 행동:

- 추천 결과 클릭
- shortlist 저장
- 비교 실행
- 구매전환 이벤트 발생

플러그인:

- 개인정보 제거 후 event row 저장
- CTR/CVR 집계
- top query/product/intent 집계
- Personal Shopper Data 온톨로지팩으로 export/sync

## 8. 개인정보/데이터 경계

이 MVP는 개인정보를 저장하지 않습니다.

| 수집하지 않음 | 처리 |
|---|---|
| 이름 | 저장하지 않음 |
| 이메일 | `[email]` 치환 |
| 전화번호 | `[phone]` 치환 |
| 주소 | `[address]` 치환 |
| 주문번호 | `[order_id]` 치환 |
| 송장번호 | `[tracking_id]` 치환 |
| 카드번호/긴 숫자열 | `[card_or_long_number]` 치환 |
| IP | `[ip]` 치환 |
| raw user/session ID | SHA-256 hash prefix만 저장 |

수집하는 것은 상품 추천 품질/마케팅 분석을 위한 비식별 통계입니다.

- sanitized query
- parsed intent
- product IDs
- click/conversion event
- CTR/CVR
- top query/product/category/color/budget

## 9. 기술 스택

- Node.js 22+
- Native HTTP server
- Native `node:test`
- OpenAPI 3.1
- ChatGPT-style plugin manifest
- JSONL telemetry storage
- OpenCrab ontology packs
- Cron-based hourly OpenCrab sync

## 10. 구현/검증 결과

| 항목 | 결과 |
|---|---:|
| Product DB sample | 41 products |
| Unit tests | 11 passed, 0 failed |
| OpenAPI served | yes |
| Plugin manifest served | yes |
| End-to-end demo | passed |
| Submission ZIP files | 21 |
| ZIP SHA256 | `9d8513b20802734144eedcdcfb51ff0377d8ca09300c1bfa2fc315c97d9829cf` |

## 11. OpenCrab packs

| Pack | Package ID | 설명 |
|---|---|---|
| MUSINSA product DB ontology | `0b3c79f7-1861-4466-ba20-2cbaa736de66` | 상품 DB/이미지/가격/리뷰/소재 온톨로지 |
| Personal Shopper Data | `5b77afa5-2646-4674-88e7-584cddd8f37c` | 비식별 사용패턴/질문/클릭/전환/마케팅 통계 |

## 12. 차별점

1. **검색이 아니라 의사결정 지원**  
   단순 상품 검색이 아니라 예산, 핏, 리뷰 수, 만족도, 리스크를 종합해 구매 후보를 정리합니다.

2. **AI-ready ontology**  
   상품 DB를 LLM/agent가 추론 가능한 온톨로지팩으로 변환합니다.

3. **Developer-facing plugin**  
   ChatGPT/Codex, 외부 앱, 쇼핑봇, 자사몰 플로우에 붙일 수 있는 OpenAPI layer입니다.

4. **Privacy-aware feedback loop**  
   개인정보 없이 질문 방식, 클릭률, 전환율, 검색 항목, top product 통계를 축적합니다.

5. **무신사 마케팅 자산화**  
   사용자 질문/클릭/전환 패턴을 Personal Shopper Data 팩으로 축적해 AI 학습자료와 마케팅 통계자료로 사용할 수 있습니다.

6. **AI commerce intelligence loop**  
   `/analytics/insights`와 `low_confidence_recommendation` 이벤트로 전환율이 높은 질문/상품과 온톨로지 공백을 자동 발견하고, `style_tags`, `occasion_tags`, `risk_tags` enrichment로 상품 DB를 계속 개선합니다.

## 13. 향후 확장

- 공식 MUSINSA API/feed 연동
- 실시간 재고/옵션/배송 연동
- 리뷰 원문 authorized API 기반 사이즈/핏 분석
- 장바구니/구매 링크 생성
- 글로벌 스토어 다국어 추천
- B2B Connector: 리셀러/자사몰/WMS/API feed 연동
- 개인화 추천 모델과 OpenCrab pack feedback loop 고도화

## 14. 실행 방법

```bash
npm test
npm start
npm run demo
```

Plugin endpoints:

```text
http://localhost:8787/openapi.yaml
http://localhost:8787/.well-known/ai-plugin.json
```
