# Live ChatGPT App Endpoint Verification — 2026-06-25

## Live endpoint

```text
https://musinsa-personal-shopper-plugin.vercel.app
```

## ChatGPT Plugin App registration endpoints

```text
Plugin app base URL: https://musinsa-personal-shopper-plugin.vercel.app
Plugin manifest URL: https://musinsa-personal-shopper-plugin.vercel.app/.well-known/ai-plugin.json
OpenAPI URL: https://musinsa-personal-shopper-plugin.vercel.app/openapi.yaml
```

## Required plugin/app URLs

| URL | Purpose | Verified |
|---|---|---:|
| `https://musinsa-personal-shopper-plugin.vercel.app/health` | health/product count | yes |
| `https://musinsa-personal-shopper-plugin.vercel.app/openapi.yaml` | OpenAPI schema referenced by manifest | yes |
| `https://musinsa-personal-shopper-plugin.vercel.app/.well-known/ai-plugin.json` | Plugin App manifest | yes |
| `https://musinsa-personal-shopper-plugin.vercel.app/analytics/notice` | privacy/legal notice | yes |
| `https://musinsa-personal-shopper-plugin.vercel.app/logo.png` | plugin logo | yes |
| `https://musinsa-personal-shopper-plugin.vercel.app/dashboard` | live/fallback analytics dashboard | yes |

## Deployment

Vercel production alias:

```text
https://musinsa-personal-shopper-plugin.vercel.app
```

Latest deployment URL from verification pass:

```text
https://musinsa-personal-shopper-plugin-qlk494wop.vercel.app
```

## Implementation notes

- `src/server.mjs` now exports `handleRequest` and a default handler so it can run both locally with `npm start` and as a Vercel Node function.
- `api/index.mjs` proxies Vercel serverless requests to `handleRequest`.
- `vercel.json` routes all paths to the function and includes data/docs/static files.
- `/openapi.yaml` and `/.well-known/ai-plugin.json` are served with the request public base URL, so deployment aliases return self-consistent endpoint URLs.
- Static repo files now also point at the production endpoint.

## Verification output

```json
{
  "health_ok": true,
  "products_loaded": 2050,
  "openapi_server": true,
  "manifest_api_url": "https://musinsa-personal-shopper-plugin.vercel.app/openapi.yaml",
  "manifest_legal_url": "https://musinsa-personal-shopper-plugin.vercel.app/analytics/notice",
  "notice_has_not_collected": true
}
```

Live search smoke test:

```json
{
  "count": 3,
  "first_ids": ["2273084", "1778404", "1778408"],
  "candidate_source": ["opencrab_candidates"],
  "adapter_source": "opencrab_cache",
  "candidate_rows": 0
}
```

Local verification before deploy:

```text
node --check src/server.mjs
node --check api/index.mjs
npm test => 31 pass / 0 fail
```

## ChatGPT Plugin App registration steps

1. Open the ChatGPT Plugin App registration flow.
2. If the form asks for App URL / Website URL / Domain / Base URL, submit:
   `https://musinsa-personal-shopper-plugin.vercel.app`
3. If the form asks for Manifest URL, submit:
   `https://musinsa-personal-shopper-plugin.vercel.app/.well-known/ai-plugin.json`
4. Confirm the manifest `api.url` points to:
   `https://musinsa-personal-shopper-plugin.vercel.app/openapi.yaml`
5. Set privacy/legal URL if prompted:
   `https://musinsa-personal-shopper-plugin.vercel.app/analytics/notice`
6. Registration smoke-test prompts:
   - `서버 상태 확인해줘.`
   - `175cm 88kg이고 안 끼는 릴렉스핏으로 10만원 이하 옷 추천해줘.`
   - `추천한 후보 2개 비교해줘.`
