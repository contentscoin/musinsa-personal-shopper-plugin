# One-page Pitch — MUSINSA Personal Shopper Plugin

## 한 줄 요약

**무신사 상품 DB와 사용자 행동 통계를 온톨로지팩으로 연결해 ChatGPT/Codex에서 자연어 쇼핑 추천·비교·전환 분석까지 가능한 AI 쇼핑 플러그인.**

## 문제

무신사 고객은 “5만원 이하 차콜 후드집업”, “평소 L인데 오버핏 추천”, “리뷰 많은 화이트 스니커즈 비교”처럼 자연어로 쇼핑 의도를 표현하지만, 실제 구매 여정은 검색어 입력, 필터 설정, 리뷰 확인, 사이즈 판단, 가격 비교로 분절되어 있습니다.

개발자/외부 서비스 입장에서도 무신사 상품 경험을 AI agent, 쇼핑봇, 자사 앱에 붙일 수 있는 표준 plugin/API layer가 부족합니다.

## 해결책

MUSINSA Personal Shopper Plugin은 무신사 상품 데이터를 AI-ready ontology로 변환하고, OpenAPI plugin server로 제공합니다.

- 자연어 intent 추출
- 상품 추천
- 리뷰/핏/소재 기반 구매 조언
- shortlist 저장
- 후보 비교 및 best pick
- 비식별 analytics 축적
- OpenCrab ontology pack sync

## 데모 핵심

```text
남성 차콜 후드집업 5만원 이하 추천
→ intent: 남성 / 차콜 / 후드집업 / 50,000원 이하
→ 후보 추천
→ shortlist 저장
→ 후보 비교
→ 클릭/전환 event 기록
→ CTR/CVR, top product, top query 통계 생성
```

## 기술/구현

- Node.js 22 native HTTP server
- OpenAPI 3.1
- ChatGPT-style `.well-known/ai-plugin.json`
- 41개 무신사 상품 sample DB
- OpenCrab product ontology pack
- Personal Shopper Data analytics ontology pack
- JSONL telemetry + PII sanitizer
- Cron-based OpenCrab sync
- 11 automated tests passing

## 왜 무신사에 필요한가

1. **검색 피로 감소**: 고객이 원하는 조건을 자연어로 말하면 바로 구매 후보를 받음.
2. **리뷰/핏 데이터 활용 극대화**: 무신사의 강점인 리뷰/핏 신호를 AI 구매 조언으로 전환.
3. **AI commerce channel 확보**: ChatGPT/Codex/agent 시대에 무신사 상품을 외부 AI 환경에서 사용할 수 있음.
4. **마케팅 데이터 자산화**: 개인정보 없이 질문 방식, 클릭률, 전환율, 검색 항목을 축적.
5. **B2B 확장 가능**: 추후 공식 API/feed를 통해 리셀러, 자사몰, WMS, 글로벌 스토어로 확장.

## 현재 검증 지표

| 항목 | 값 |
|---|---:|
| Product sample | 41 products |
| Tests | 11 passed |
| Demo flow | passed |
| OpenCrab packs | 2 |
| Submission ZIP | generated |

## 제출물

- `SUBMISSION.md`
- `README.md`
- `openapi.yaml`
- `.well-known/ai-plugin.json`
- `scripts/demo.mjs`
- `src/*.mjs`
- `tests/personalShopper.test.mjs`
- `data/products.crawled.json`
- `docs/ontology/*.md`
