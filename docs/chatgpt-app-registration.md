# ChatGPT 앱 등록 / GPT Actions 연결 매뉴얼

이 문서는 **MUSINSA Personal Shopper Plugin**을 ChatGPT에서 호출 가능한 앱/액션으로 등록하는 절차를 정리합니다.

> 현재 repo는 OpenAPI 기반 HTTP plugin/action 서버입니다. ChatGPT의 최신 등록 흐름에서는 보통 **Custom GPT → Actions → OpenAPI schema import** 방식으로 연결합니다. `.well-known/ai-plugin.json`은 ChatGPT-style legacy plugin 호환/리뷰 설명용으로 계속 제공합니다.

---

## 1. 등록 전 체크리스트

| 항목 | 필요 여부 | 현재 repo 상태 |
|---|---:|---|
| OpenAPI 3.1 spec | 필수 | `GET /openapi.yaml` 제공 |
| 공개 HTTPS endpoint | 필수 | 로컬 기본값은 `http://localhost:8787`; 등록 전 배포 또는 tunnel 필요 |
| 인증 방식 | 필요 시 | MVP는 `auth: none` / Actions schema는 인증 없음 |
| Privacy / Legal URL | 권장/사실상 필수 | `GET /analytics/notice` 제공 |
| 로고 URL | 권장 | `GET /logo.png` 제공 |
| API 동작 검증 | 필수 | `npm test`, `npm run demo`, quality gates 제공 |
| 개인정보 처리 경계 | 필수 | non-PII analytics, sanitizer, consent metadata 구현 |

---

## 2. 로컬 서버 실행 및 기본 검증

```bash
npm install
npm start
```

기본 포트는 `8787`입니다.

```bash
curl -s http://localhost:8787/health
curl -s http://localhost:8787/openapi.yaml
curl -s http://localhost:8787/.well-known/ai-plugin.json
curl -s http://localhost:8787/analytics/notice
curl -s http://localhost:8787/dashboard
```

추천 검증 명령:

```bash
npm test
npm run verify:dashboard
npm run verify:opencrab-bridge
npm run verify:opencrab-live-bridge
npm run test:hybrid-opencrab
```

현재 기준 핵심 기대값:

```text
npm test -> 30 pass / 0 fail
/products/search -> 2,050개 상품 catalog 기반 검색
hybrid OpenCrab gate -> 60/60 pass, provenance coverage 60/60
```

---

## 3. ChatGPT 등록용 공개 URL 준비

ChatGPT Actions는 로컬 `localhost`를 직접 호출할 수 없으므로 **공개 HTTPS URL**이 필요합니다.

### 옵션 A — 빠른 개발 테스트: tunnel

예시:

```bash
npm start
# 다른 터미널에서 cloudflared/ngrok/localtunnel 등으로 8787 포트 공개
# 예: https://musinsa-personal-shopper-dev.example.trycloudflare.com
```

### 옵션 B — 제출/심사용: 배포

Vercel/Render/Fly.io/Cloud Run/Railway 등 Node.js 서버 실행이 가능한 곳에 배포합니다.

배포 후 반드시 아래가 HTTPS로 열려야 합니다.

```text
https://YOUR_PUBLIC_HOST/health
https://YOUR_PUBLIC_HOST/openapi.yaml
https://YOUR_PUBLIC_HOST/.well-known/ai-plugin.json
https://YOUR_PUBLIC_HOST/analytics/notice
https://YOUR_PUBLIC_HOST/logo.png
```

---

## 4. OpenAPI 서버 URL 변경

`openapi.yaml`의 `servers[0].url`은 ChatGPT가 실제 호출할 공개 URL이어야 합니다.

현재 로컬 기본값:

```yaml
servers:
  - url: http://localhost:8787
```

등록 전 예시:

```yaml
servers:
  - url: https://YOUR_PUBLIC_HOST
```

검증:

```bash
curl -s https://YOUR_PUBLIC_HOST/openapi.yaml | head
```

> 주의: schema 안의 server URL이 `localhost`로 남아 있으면 ChatGPT Actions 등록 후 테스트 호출이 실패합니다.

---

## 5. Legacy plugin manifest URL 변경

`.well-known/ai-plugin.json`도 공개 URL 기준으로 맞춥니다.

현재 로컬 기본값:

```json
{
  "api": {
    "type": "openapi",
    "url": "http://localhost:8787/openapi.yaml",
    "is_user_authenticated": false
  },
  "logo_url": "http://localhost:8787/logo.png",
  "legal_info_url": "http://localhost:8787/analytics/notice"
}
```

등록 전 예시:

```json
{
  "api": {
    "type": "openapi",
    "url": "https://YOUR_PUBLIC_HOST/openapi.yaml",
    "is_user_authenticated": false
  },
  "logo_url": "https://YOUR_PUBLIC_HOST/logo.png",
  "legal_info_url": "https://YOUR_PUBLIC_HOST/analytics/notice"
}
```

> Custom GPT Actions는 보통 manifest를 직접 요구하지 않고 OpenAPI schema를 import합니다. 그래도 manifest는 심사용/호환성/문서화에 유용합니다.

---

## 6. ChatGPT에서 Custom GPT + Actions 등록

### 6.1 GPT 생성

1. ChatGPT 접속
2. **Explore GPTs** 또는 **Create a GPT** 진입
3. GPT 이름 입력
   - 추천: `MUSINSA Personal Shopper`
4. 설명 입력
   - 예: `무신사 상품 온톨로지 기반 자연어 추천, 비교, shortlist, 비식별 analytics 액션`
5. Instructions에 아래 운영 지침 입력

권장 Instructions:

```text
You are MUSINSA Personal Shopper. Help users find and compare MUSINSA products using the connected Actions.

Use searchProducts for broad product search, recommendByProfile for natural-language outfit/product recommendations, compareProducts for comparing candidate product IDs, and shortlist endpoints when users ask to save or revisit candidates.

Respect privacy boundaries: do not send names, emails, phone numbers, addresses, order IDs, tracking IDs, IPs, or raw user IDs to analytics. If analytics events are recorded, send only sanitized query text, product IDs, event type, and consent metadata.

When results include source_url or retrieval.opencrab_adapter.candidate_rows, show original MUSINSA product links and briefly mention the OpenCrab evidence/provenance when relevant.

If the user asks for an outfit under a budget, apply the budget strictly where the API supports it and explain tradeoffs.
```

### 6.2 Action 추가

1. GPT Builder의 **Configure** 탭으로 이동
2. **Actions** 섹션 선택
3. **Create new action** 클릭
4. Authentication은 MVP 기준 **None** 선택
5. Schema 입력 방식 선택
   - URL import가 가능하면: `https://YOUR_PUBLIC_HOST/openapi.yaml`
   - 안 되면 `openapi.yaml` 내용을 복사해 붙여넣기
6. Schema validation error가 없는지 확인
7. 저장

### 6.3 Privacy policy / Legal URL

가능하면 GPT 설정의 Privacy/Legal URL에 아래를 사용합니다.

```text
https://YOUR_PUBLIC_HOST/analytics/notice
```

현재 notice는 다음을 명시합니다.

- 수집: event_type, sanitized_query, product_ids, parsed_intent, non-PII statistics
- 미수집: 이름, 이메일, 전화번호, 주소, 주문번호, 송장번호, 카드번호, IP, raw user/session ID
- session id는 hash 처리

---

## 7. 등록 후 Actions 테스트 프롬프트

ChatGPT GPT Preview에서 아래 순서로 테스트합니다.

### 7.1 Health check

```text
서버 상태 확인해줘.
```

예상 Action:

```text
health
```

확인:

- products_loaded: `2050`
- search index/lexicon 정보 반환

### 7.2 상품 검색

```text
남성 차콜 후드집업 5만원 이하 추천해줘.
```

예상 Action:

```text
searchProducts 또는 recommendByProfile
```

확인:

- 가격 조건을 초과하지 않는 후보
- product_id
- 원본 MUSINSA `source_url`
- retrieval metadata

### 7.3 사용자 프로필 기반 추천

```text
나는 175cm 88kg이고 부드러운 소재, 안 끼는 여유핏을 좋아해. 10만원 이하로 입을 옷 추천해줘.
```

예상 Action:

```text
recommendByProfile
```

확인:

- relaxed/oversized/soft/non-tight 취향 반영
- `assistant_summary`
- `score_breakdown`
- `recommendation_confidence`
- OpenCrab hybrid 후보가 있으면 provenance rows/source_url 노출

### 7.4 비교

```text
추천한 후보 2~3개를 가격, 리뷰, 핏 기준으로 비교해줘.
```

예상 Action:

```text
compareProducts
```

확인:

- comparison_table
- best_pick
- decision_notes

### 7.5 Shortlist

```text
첫 번째와 두 번째 후보를 저장해두고 나중에 비교할 수 있게 해줘.
```

예상 Action:

```text
saveShortlist
```

확인:

- session_id
- saved product_ids

---

## 8. 등록 실패/심사 전 오류 체크

| 증상 | 원인 | 해결 |
|---|---|---|
| Action import 실패 | OpenAPI YAML 문법 오류 | `curl https://YOUR_PUBLIC_HOST/openapi.yaml` 후 YAML lint |
| ChatGPT가 호출 실패 | `servers.url`이 localhost | `openapi.yaml`의 server URL을 HTTPS public host로 변경 |
| logo/legal URL 실패 | manifest가 localhost | `.well-known/ai-plugin.json` URL들을 public host로 변경 |
| CORS/OPTIONS 오류 | preflight 처리 누락 | 서버의 `OPTIONS`/CORS 응답 확인 |
| 400 invalid JSON | Action schema와 request body 불일치 | OpenAPI schema와 실제 endpoint request를 맞춤 |
| 413 payload too large | request body limit 초과 | 요청 payload 축소 또는 body limit 조정 |
| Analytics consent 403 | `ANALYTICS_CONSENT_REQUIRED=true` | consent_granted 전달 또는 제출/데모에서는 설정 확인 |
| 추천 결과 없음 | OpenCrab/local index candidate mismatch | `npm run test:hybrid-opencrab` 재실행, candidate_rows 확인 |
| 원본 링크 없음 | product/source_url 누락 | `retrieval.opencrab_adapter.candidate_rows`와 product `source_url` 확인 |

---

## 9. 제출/데모용 최종 체크리스트

- [ ] Public HTTPS host 준비
- [ ] `openapi.yaml` server URL public host로 변경
- [ ] `.well-known/ai-plugin.json` URL public host로 변경
- [ ] `GET /health` 정상
- [ ] `GET /openapi.yaml` 정상
- [ ] `GET /.well-known/ai-plugin.json` 정상
- [ ] `GET /analytics/notice` 정상
- [ ] `GET /dashboard` 정상
- [ ] `npm test` pass
- [ ] `npm run verify:dashboard` pass
- [ ] `npm run verify:opencrab-bridge` pass
- [ ] `npm run verify:opencrab-live-bridge` pass
- [ ] `npm run test:hybrid-opencrab` pass
- [ ] ChatGPT GPT Builder Actions schema import 성공
- [ ] Preview에서 health/search/recommend/compare/shortlist 테스트 성공
- [ ] README/SUBMISSION에 public URL, 테스트 결과, privacy boundary, OpenCrab pack IDs 반영

---

## 10. 현재 repo 기준 참고 값

| 항목 | 값 |
|---|---|
| 상품 수 | 2,050 |
| 테스트 | 30 pass / 0 fail |
| Product DB pack | `0b3c79f7-1861-4466-ba20-2cbaa736de66` v3.8.0 |
| Hybrid quality gate | 60/60 pass |
| Dashboard verifier | live/fallback/refresh markers pass |
| Local server | `http://localhost:8787` |
| OpenAPI | `/openapi.yaml` |
| Legacy manifest | `/.well-known/ai-plugin.json` |
| Privacy notice | `/analytics/notice` |
| Dashboard | `/dashboard` |

---

## 11. 운영 메모

- 심사용 GPT Actions 연결에서는 `auth: none`이 가장 단순합니다.
- 실제 상용 운영에서는 API key, OAuth, rate limit, request logging policy, explicit data retention policy를 추가해야 합니다.
- MUSINSA 데이터는 MVP/데모용 공개 페이지 기반 샘플입니다. production은 공식/인가 API 또는 feed로 전환해야 합니다.
- OpenCrab은 hot path 전체를 대체하기보다 semantic candidate/provenance layer로 사용하고, plugin server가 local index/cache로 rerank하는 구조를 유지합니다.
