# MUSINSA Personal Shopper Deployment + Chatbot Install — 2026-06-25

## Deployment

- Local plugin API: `http://127.0.0.1:8787`
- Public manifest target in plugin file: `http://localhost:8787`
- Health check: `GET /health => { ok: true, products_loaded: 2050 }`
- Running process observed: `node src/server.mjs` listening on port `8787`

## Chatbot installation

Installed as a Hermes MCP server in the active profile config:

- Config path: `/home/jake/.hermes/profiles/musinsa/config.yaml`
- MCP server name: `musinsa_personal_shopper`
- Transport: stdio
- Command: `node /home/jake/.hermes/profiles/paperclipbase/working/musinsa-personal-shopper-plugin/scripts/musinsa-mcp-server.mjs`

Discovered tools:

1. `musinsa_health`
2. `musinsa_search_products`
3. `musinsa_recommend`
4. `musinsa_compare`
5. `musinsa_get_product`
6. `musinsa_analytics_notice`

## Verification

- `hermes mcp test musinsa_personal_shopper`: connected, 6 tools discovered.
- Direct MCP client smoke test:
  - `musinsa_health` returned `products_loaded: 2050`.
  - `musinsa_recommend` returned recommendations for `차콜 후드집업 5만원 이하 추천`.
- OpenAPI/manifest connection test previously passed:
  - OpenAPI paths: 17
  - Schemas: 11
  - Operation IDs: 18
  - Unresolved refs: 0

## Activation note

Hermes discovers MCP tools at session startup/reload. The server is installed in config now; use `/reload-mcp` or start a new chat/session (`/new`) for the current Telegram chatbot session to expose the new tools in the live tool list.
