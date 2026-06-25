# Search Index Benchmark — 2026-06-25

## Purpose

Measure the new precomputed local search index used as the low-latency serving layer before/alongside OpenCrab ontology-pack candidate retrieval.

## Dataset

- Products: 2050
- Rounds per query: 120

## Results

| Query | Avg ms | Result count | Candidate count |
|---|---:|---:|---:|
| 남성 차콜 후드집업 5만원 이하 | 7.871 | 10 | 2050 |
| 화이트 스니커즈 | 5.697 | 10 | 2050 |
| 여름 반팔 티셔츠 | 5.666 | 10 | 2050 |
| 오버핏 니트 | 5.024 | 10 | 2050 |
| 블랙 코튼 팬츠 | 7.202 | 10 | 2050 |
| 가디건 출근룩 | 4.206 | 10 | 2050 |

## Lexicon

| Metric | Count |
|---|---:|
| Brands | 1416 |
| Categories | 436 |
| Terms | 549 |

## Architecture note

OpenCrab ontology packs should provide semantic product candidates and provenance. The plugin server should keep this precomputed local index/cache in the hot path and use OpenCrab candidates through `candidate_product_ids` / `opencrab_candidate_product_ids` for hybrid re-ranking.
