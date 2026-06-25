# OpenAPI / Manifest Connection Test — 2026-06-25

- Base URL: http://127.0.0.1:8787
- Public manifest URL target: http://localhost:8787
- Products loaded: 2050

## Summary

| Metric | Value |
|---|---:|
| Passed | true |
| Failure count | 0 |
| OpenAPI paths | 17 |
| Schemas | 11 |
| Operation IDs | 18 |
| Unresolved refs | 0 |

## Endpoint checks

| Endpoint | Status | Content-Type | Latency ms |
|---|---:|---|---:|
| /health | 200 | application/json; charset=utf-8 | 8.22 |
| /.well-known/ai-plugin.json | 200 | application/json; charset=utf-8 | 2.66 |
| /openapi.yaml | 200 | application/yaml; charset=utf-8 | 1.51 |
| /analytics/notice | 200 | application/json; charset=utf-8 | 0.95 |
| /logo.png | 200 | image/png | 0.91 |
| /shopper/recommend runtime | 200 | application/json | 87.06 |
| /products/search runtime | 200 | application/json | 46.65 |

## Failures

- None
