# ChatGPT Plugin App 등록 매뉴얼

이 문서는 **MUSINSA Personal Shopper Plugin**을 GPT Builder Actions가 아니라 **ChatGPT 플러그인 앱 등록 흐름**에 맞춰 제출하는 절차를 정리합니다.

핵심은 OpenAPI URL을 직접 import하는 것이 아니라, **public plugin app endpoint와 manifest**를 기준으로 등록하는 것입니다.

---

## 1. 제출할 endpoint

현재 live plugin app endpoint:

```text
Plugin app base URL: https://musinsa-personal-shopper-plugin.vercel.app
Plugin manifest URL: https://musinsa-personal-shopper-plugin.vercel.app/.well-known/ai-plugin.json
OpenAPI URL: https://musinsa-personal-shopper-plugin.vercel.app/openapi.yaml
Privacy / Legal URL: https://musinsa-personal-shopper-plugin.vercel.app/analytics/notice
Logo URL: https://musinsa-personal-shopper-plugin.vercel.app/logo.png
```

등록 화면에서:

| 등록 화면 입력란 | 넣을 값 |
|---|---|
| App URL / Website URL / Domain / Base URL | `https://musinsa-personal-shopper-plugin.vercel.app` |
| Manifest URL을 요구하는 경우 | `https://musinsa-personal-shopper-plugin.vercel.app/.well-known/ai-plugin.json` |
| OpenAPI URL을 별도로 요구하는 경우 | `https://musinsa-personal-shopper-plugin.vercel.app/openapi.yaml` |
| Privacy policy / Legal URL | `https://musinsa-personal-shopper-plugin.vercel.app/analytics/notice` |
| Logo URL | `https://musinsa-personal-shopper-plugin.vercel.app/logo.png` |

> 정리: **Plugin App 등록의 1차 기준은 base URL 또는 manifest URL**입니다. OpenAPI schema는 manifest 내부 `api.url`에서 자동 연결됩니다.

---

## 2. 등록 전 필수 체크리스트

| 항목 | 현재 상태 |
|---|---|
| Public HTTPS endpoint | `https://musinsa-personal-shopper-plugin.vercel.app` live |
| Manifest | `GET /.well-known/ai-plugin.json` live |
| OpenAPI 3.1 spec | `GET /openapi.yaml` live |
| Authentication | `auth.type: none` |
| Privacy / Legal notice | `GET /analytics/notice` live |
| Logo | `GET /logo.png` live PNG |
| CORS | `Access-Control-Allow-Origin: *` |
| Product catalog | 2,050 products |
| Unit tests | 31 pass / 0 fail |

검증 명령:

```bash
curl -fsS https://musinsa-personal-shopper-plugin.vercel.app/.well-known/ai-plugin.json
curl -fsS https://musinsa-personal-shopper-plugin.vercel.app/openapi.yaml
curl -fsS https://musinsa-personal-shopper-plugin.vercel.app/analytics/notice
curl -fsS https://musinsa-personal-shopper-plugin.vercel.app/logo.png --output /tmp/musinsa-plugin-logo.png
curl -fsS https://musinsa-personal-shopper-plugin.vercel.app/health
```

---

## 3. Manifest 확인

Plugin App 등록 시스템은 보통 base URL에서 아래 manifest를 찾거나, manifest URL을 직접 입력받습니다.

```text
https://musinsa-personal-shopper-plugin.vercel.app/.well-known/ai-plugin.json
```

현재 manifest 핵심값:

```json
{
  "schema_version": "v1",
  "name_for_human": "MUSINSA Personal Shopper",
  "name_for_model": "musinsa_personal_shopper",
  "auth": { "type": "none" },
  "api": {
    "type": "openapi",
    "url": "https://musinsa-personal-shopper-plugin.vercel.app/openapi.yaml",
    "is_user_authenticated": false
  },
  "logo_url": "https://musinsa-personal-shopper-plugin.vercel.app/logo.png",
  "legal_info_url": "https://musinsa-personal-shopper-plugin.vercel.app/analytics/notice"
}
```

주의할 점:

- `api.url`이 `localhost`가 아니라 public HTTPS URL이어야 합니다.
- `logo_url`, `legal_info_url`도 public HTTPS URL이어야 합니다.
- 인증이 없는 MVP이므로 `auth.type`은 `none`입니다.

---

## 4. OpenAPI 확인

Manifest의 `api.url`은 아래 OpenAPI spec을 가리킵니다.

```text
https://musinsa-personal-shopper-plugin.vercel.app/openapi.yaml
```

`servers[0].url`도 public endpoint입니다.

```yaml
servers:
  - url: https://musinsa-personal-shopper-plugin.vercel.app
```

주요 operation:

| Operation | Endpoint | 용도 |
|---|---|---|
| `health` | `GET /health` | 서버/상품 catalog 상태 확인 |
| `searchProducts` | `POST /products/search` | 상품 검색 |
| `recommendByProfile` | `POST /shopper/recommend` | 자연어 추천 |
| `compareProducts` | `POST /shopper/compare` | 후보 비교 |
| `saveShortlist` | `POST /shopper/shortlist` | shortlist 저장 |
| `recordAnalyticsEvent` | `POST /analytics/events` | 비식별 analytics 기록 |

---

## 5. Plugin App 등록 절차

1. ChatGPT / OpenAI의 **Plugin App 등록** 화면으로 이동합니다.
2. 앱 이름을 입력합니다.
   - `MUSINSA Personal Shopper`
3. 앱 설명을 입력합니다.
   - `무신사 상품 온톨로지 기반 자연어 추천, 비교, shortlist, 비식별 analytics plugin app`
4. Endpoint 입력란에 요구 형식에 맞게 아래 중 하나를 넣습니다.
   - Base URL: `https://musinsa-personal-shopper-plugin.vercel.app`
   - Manifest URL: `https://musinsa-personal-shopper-plugin.vercel.app/.well-known/ai-plugin.json`
5. OpenAPI URL을 별도로 요구하면 아래를 넣습니다.
   - `https://musinsa-personal-shopper-plugin.vercel.app/openapi.yaml`
6. Privacy/Legal URL을 요구하면 아래를 넣습니다.
   - `https://musinsa-personal-shopper-plugin.vercel.app/analytics/notice`
7. 인증 방식은 MVP 기준 `None` / `No auth`로 설정합니다.
8. 저장 후 manifest/OpenAPI validation을 통과하는지 확인합니다.

---

## 6. 등록 후 테스트 프롬프트

### 6.1 Health check

```text
서버 상태 확인해줘.
```

확인값:

- `products_loaded: 2050`
- OpenCrab/cache/search index metadata 반환

### 6.2 상품 추천

```text
남성 차콜 후드집업 5만원 이하로 추천해줘. 평소 L 입고 오버핏 좋아해.
```

확인값:

- `recommendByProfile` 또는 `searchProducts` 호출
- 상품명, 가격, product_id 반환
- MUSINSA 원본 `source_url` 포함
- 추천 이유/score breakdown 포함

### 6.3 OpenCrab provenance 검색

```text
175cm 88kg 남성, 너무 달라붙지 않는 릴렉스핏 상의 추천해줘. 원본 링크도 보여줘.
```

확인값:

- hybrid retrieval 사용 가능
- `retrieval.opencrab_adapter.candidate_rows`에 provenance row 포함
- 원본 MUSINSA 링크 제공

### 6.4 비교

```text
추천한 후보 두 개 비교해서 뭐가 더 나은지 알려줘.
```

확인값:

- `compareProducts` 호출
- 가격/리뷰/핏/리스크 기준 비교표와 best pick 반환

---

## 7. 개인정보/데이터 경계

이 plugin app은 개인정보를 저장하지 않는 MVP입니다.

수집하지 않음:

- 이름
- 이메일
- 전화번호
- 주소
- 주문번호
- 송장번호
- 카드번호/긴 숫자열
- IP
- raw user/session ID

수집 가능:

- sanitized query
- parsed intent
- product IDs
- event type
- aggregate CTR/CVR
- ontology gap fields

고지 URL:

```text
https://musinsa-personal-shopper-plugin.vercel.app/analytics/notice
```

---

## 8. 실패 대응표

| 증상 | 원인 | 해결 |
|---|---|---|
| Manifest fetch 실패 | base URL에서 `/.well-known/ai-plugin.json` 접근 실패 | `https://musinsa-personal-shopper-plugin.vercel.app/.well-known/ai-plugin.json` GET 200 확인 |
| OpenAPI fetch 실패 | manifest `api.url` 오류 | manifest의 `api.url`이 `https://musinsa-personal-shopper-plugin.vercel.app/openapi.yaml`인지 확인 |
| localhost 호출 오류 | OpenAPI `servers.url`이 localhost | `servers[0].url`을 `https://musinsa-personal-shopper-plugin.vercel.app`로 변경 |
| logo/legal URL 오류 | public URL이 아니거나 404 | `/logo.png`, `/analytics/notice` GET 확인 |
| 인증 오류 | 등록 화면에서 auth를 요구 | MVP는 no auth. 필요 시 API key/OAuth로 후속 확장 |
| HEAD 요청 405 | 서버가 GET/OPTIONS 중심으로 구현됨 | 등록/검증은 GET 기준으로 확인. 필요하면 HEAD handler 추가 가능 |

---

## 9. 현재 live 검증 결과

최근 확인 기준:

```text
GET /.well-known/ai-plugin.json -> 200, application/json
GET /openapi.yaml -> 200, application/yaml
GET /analytics/notice -> 200
GET /logo.png -> 200, PNG
GET /health -> products_loaded: 2050
npm test -> 31 pass / 0 fail
```

---

## 10. 제출용 한 줄 요약

```text
MUSINSA Personal Shopper is a public HTTPS ChatGPT Plugin App endpoint with a v1 plugin manifest, OpenAPI 3.1 schema, no-auth MVP, privacy notice, product recommendation/search/compare APIs, and OpenCrab provenance-backed MUSINSA source links.
```
