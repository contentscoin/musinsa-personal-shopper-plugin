Owner tag: hermes-profile:paperclipbase
Pack: musinsa-product-ontology-2050-crab-agent
Purpose: CrabAgent-enhanced MUSINSA product ontology for personal-shopper plugin testing.
Source boundary: public MUSINSA sitemap/product pages only; no login/cart/order/payment/account/private data.
Products: 2050
Distinct brands: 713
Distinct category paths: 190
Top-level categories: 12

Top-level category coverage:
- 상의: 563
- 바지: 404
- 아우터: 298
- 신발: 280
- 스포츠/레저: 133
- 소품: 128
- 가방: 103
- 뷰티: 61
- 속옷/홈웨어: 37
- 원피스/스커트: 19
- 키즈: 12
- 디지털/라이프: 12

## Quality

```json
{
  "grade": "A-",
  "pack_contract": "ok",
  "evidence_leak": 0,
  "graph_integrity": "pass",
  "node_evidence_coverage": "pass",
  "original_documents_stored": false,
  "owner_tag": "hermes-profile:paperclipbase",
  "metrics": {
    "documents": 453,
    "chunks": 453,
    "nodes": 2971,
    "edges": 15951,
    "products": 2050,
    "distinct_brands": 713,
    "distinct_category_paths": 190
  },
  "caveats": [
    "Public-source prototype seed only; production should use authorized MUSINSA feed/API.",
    "Raw local full dataset is not embedded as original_documents; pack stores derived chunks and graph projections."
  ]
}
```
