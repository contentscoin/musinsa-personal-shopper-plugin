# Primer Hack Round 10 Submission Draft — MUSINSA Personal Shopper Plugin

> Source URL: https://hack.primer.kr/rounds/10  
> Access note: public page and JSON endpoint require login/authorization in this environment, so exact field limits should be reconciled in the authenticated form before final submit. This draft follows a standard hackathon submission structure.

## 1. 프로젝트명

**MUSINSA Personal Shopper Plugin**

## 2. 한 줄 소개

무신사 상품 데이터를 온톨로지팩으로 연결해 ChatGPT/Codex에서 자연어로 상품 추천, 비교, shortlist 저장, 리뷰/핏 판단, 클릭/전환 통계까지 수행하는 AI 쇼핑 플러그인입니다.

## 3. 문제 정의

무신사 고객은 “5만원 이하 차콜 후드집업”, “평소 L인데 오버핏 추천”, “리뷰 많은 화이트 스니커즈 비교”처럼 자연어로 쇼핑 의도를 표현합니다. 하지만 실제 구매 과정은 검색, 필터, 리뷰 확인, 사이즈 판단, 가격 비교로 분절되어 있습니다.

개발자/외부 서비스 입장에서도 무신사 상품 경험을 ChatGPT, Codex, 쇼핑봇, 외부 앱에 붙일 수 있는 표준 plugin/API layer가 부족합니다.

## 4. 해결 방법

MUSINSA Personal Shopper Plugin은 무신사 상품 데이터를 AI-ready ontology로 변환하고, OpenAPI plugin server로 제공합니다.

```text
MUSINSA product data
  -> product ontology JSON/Markdown
  -> OpenCrab product ontology pack
  -> OpenAPI plugin server
  -> ChatGPT/Codex natural-language shopping agent
```

사용자는 자연어로 질문하고, 플러그인은 예산/색상/카테고리/성별/계절 intent를 추출해 상품을 추천합니다. 추천 후보는 shortlist에 저장하고, 비교 API로 best pick과 decision notes를 받을 수 있습니다.

동시에 개인정보를 제외한 사용패턴/질문/클릭/전환 데이터를 Personal Shopper Data 온톨로지팩으로 축적해 AI 학습자료와 무신사 마케팅 통계자료로 활용할 수 있습니다.

## 5. 핵심 사용자

- ChatGPT/Codex에 플러그인을 설치해 무신사 기반 쇼핑을 하려는 사용자/개발자
- AI 쇼핑봇 또는 스타일 추천 서비스를 만들려는 개발자
- 무신사 상품 경험을 외부 앱/웹/플랫폼에 연결하려는 팀
- 추후 공식 API/feed를 활용하려는 커머스 사업자
- 무신사 내부 마케팅/CX/MD 팀: 사용자 질문·클릭·전환 통계 활용

## 6. 핵심 기능

| 기능 | 설명 | 구현 상태 |
|---|---|---|
| Product ontology crawler | 공개 상품 페이지/sitemap 기반 상품 데이터 수집 | 완료 |
| Product ontology pack | 상품명, 브랜드, 가격, 리뷰, 이미지, 소재/핏 신호 온톨로지화 | 완료 |
| Natural language intent parser | 예산/색상/카테고리/성별/계절 추출 | 완료 |
| Recommendation API | 자연어 질의와 customer profile 기반 추천 | 완료 |
| Review/Fit insight | 리뷰 집계/소재/핏 라벨 기반 구매 조언 | 완료 |
| Product comparison | 후보 상품 비교표, best pick, decision notes | 완료 |
| Shortlist API | 세션별 후보 저장/조회/삭제 | 완료 |
| Non-PII analytics | 검색/추천/클릭/전환/비교 이벤트 수집 | 완료 |
| Analytics dashboard | funnel/products/queries/intents 통계 API | 완료 |
| OpenCrab sync | Personal Shopper Data 온톨로지팩 자동 축적 | 완료 |
| Plugin packaging | OpenAPI + ai-plugin manifest + demo script + ZIP | 완료 |

## 7. 기술 구조

```text
MUSINSA sitemap/product pages
  -> scripts/crawl-musinsa-products.mjs
  -> data/products.crawled.json
  -> docs/ontology/musinsa-product-ontology-sample.md
  -> OpenCrab product ontology pack
  -> src/server.mjs OpenAPI-compatible plugin server
  -> ChatGPT/Codex or external app

User plugin behavior
  -> POST /analytics/events
  -> PII sanitizer + session hash
  -> data/telemetry/events.jsonl
  -> analytics summary/dashboard APIs
  -> scripts/export-personal-shopper-data-ontology.mjs
  -> OpenCrab personal-shopper-data ontology pack
```

## 8. 차별점

1. **검색이 아니라 구매 의사결정 지원**  
   가격, 리뷰 수, 만족도, 핏/소재 신호, 구매 리스크를 종합해 후보를 추천합니다.

2. **AI-ready ontology**  
   상품 데이터를 LLM/agent가 추론 가능한 온톨로지팩으로 변환합니다.

3. **Developer-facing plugin**  
   ChatGPT/Codex, 외부 앱, 쇼핑봇, 자사몰 플로우에 붙일 수 있는 OpenAPI layer입니다.

4. **Privacy-aware feedback loop**  
   개인정보 없이 질문 방식, 클릭률, 전환율, 검색 항목, top product 통계를 축적합니다.

5. **무신사 마케팅 자산화**  
   사용자 질문/클릭/전환 패턴을 Personal Shopper Data 팩으로 축적해 AI 학습자료와 마케팅 통계자료로 사용할 수 있습니다.

## 9. 데이터/법적 경계

- MVP는 공개 상품 페이지/sitemap 기반 prototype입니다.
- 로그인 필요 데이터, 장바구니, 주문, 결제, 개인화 데이터는 수집하지 않습니다.
- 실제 서비스화 시 무신사 공식 API, 파트너 feed, 또는 서면 허가 기반 데이터 연동으로 전환합니다.
- Analytics는 개인정보를 저장하지 않습니다.

개인정보 처리:

| 유형 | 처리 |
|---|---|
| 이메일 | `[email]` 치환 |
| 전화번호 | `[phone]` 치환 |
| 주소 | `[address]` 치환 |
| 주문번호 | `[order_id]` 치환 |
| 송장번호 | `[tracking_id]` 치환 |
| 카드번호/긴 숫자열 | `[card_or_long_number]` 치환 |
| IP | `[ip]` 치환 |
| raw user/session ID | SHA-256 hash prefix 저장 |

## 10. 데모 시나리오

### 시나리오 A — 추천

사용자:

> 남성 차콜 후드집업 5만원 이하 추천해줘. 평소 L 입고 오버핏 좋아해.

결과:

- intent: 남성 / 차콜 / 후드집업 / 50,000원 이하
- 추천 1순위: `[크롭선택] ASI 포시즌 에센셜 후드 집업_피그먼트 차콜`
- 이유: 카테고리/색상/예산 일치, 리뷰 11,607개, 만족도 4.8, 오버핏 신호

### 시나리오 B — shortlist + 비교

- 추천 후보 2개 shortlist 저장
- 가격/리뷰/만족도/할인율/핏 신호 비교
- best pick과 decision notes 반환

### 시나리오 C — analytics 축적

- 추천 → 클릭 → shortlist 저장 → 비교 → 전환 이벤트 기록
- 개인정보 제거 후 JSONL 저장
- CTR/CVR/top query/top product 집계
- Personal Shopper Data OpenCrab pack에 sync

## 11. 구현물

- `README.md`
- `SUBMISSION.md`
- `docs/pitch-summary.md`
- `docs/demo-scenarios.md`
- `.well-known/ai-plugin.json`
- `openapi.yaml`
- `src/server.mjs`
- `src/productStore.mjs`
- `src/personalShopper.mjs`
- `src/shortlistStore.mjs`
- `src/telemetryStore.mjs`
- `scripts/demo.mjs`
- `scripts/crawl-musinsa-products.mjs`
- `scripts/export-personal-shopper-data-ontology.mjs`
- `tests/personalShopper.test.mjs`
- `data/products.crawled.json`
- `docs/ontology/*.md`

## 12. 검증 결과

| 항목 | 결과 |
|---|---:|
| 상품 샘플 | 41 products |
| 테스트 | 11 passed, 0 failed |
| OpenAPI served | yes |
| Plugin manifest served | yes |
| End-to-end demo | passed |
| Personal Shopper Data events | 11 |
| Demo CTR/CVR | 0.5 / 0.5 |

## 13. OpenCrab packs

| Pack | Package ID | 설명 |
|---|---|---|
| MUSINSA product DB ontology | `0b3c79f7-1861-4466-ba20-2cbaa736de66` | 상품 DB/이미지/가격/리뷰/소재 온톨로지 |
| Personal Shopper Data | `5b77afa5-2646-4674-88e7-584cddd8f37c` | 비식별 사용패턴/질문/클릭/전환/마케팅 통계 |

## 14. 향후 확장

- 공식 MUSINSA API/feed 연동
- 실시간 재고/옵션/배송 연동
- 리뷰 원문 authorized API 기반 사이즈/핏 분석
- 장바구니/구매 링크 생성
- 글로벌 스토어 다국어 추천
- B2B Connector: 리셀러/자사몰/WMS/API feed 연동
- 개인화 추천 모델과 OpenCrab feedback loop 고도화
