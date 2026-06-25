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
| Schemas | 12 |
| Operation IDs | 18 |
| Unresolved refs | 0 |

## Endpoint checks

| Endpoint | Status | Content-Type | Latency ms |
|---|---:|---|---:|
| /health | 200 | application/json; charset=utf-8 | 41.99 |
| /.well-known/ai-plugin.json | 200 | application/json; charset=utf-8 | 12.35 |
| /openapi.yaml | 200 | application/yaml; charset=utf-8 | 2.48 |
| /analytics/notice | 200 | application/json; charset=utf-8 | 1.17 |
| /logo.png | 200 | image/png | 2.23 |
| /shopper/recommend runtime | 200 | application/json | 146.87 |
| /products/search runtime | 200 | application/json | 58.23 |

## Failures

- None
