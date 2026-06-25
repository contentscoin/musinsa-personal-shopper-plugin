# Hybrid OpenCrab Quality Gate — 2026-06-25

## Summary

| Metric | Value |
|---|---:|
| Queries | 60 |
| Passed | 60 |
| Failed | 0 |
| Local non-empty | 59 |
| Hybrid non-empty | 60 |
| OpenCrab provenance coverage | 60 |
| Avg overlap | 0.22 |
| Local p50/p95/max ms | 6.53 / 9.99 / 12.57 |
| Hybrid p50/p95/max ms | 37.64 / 43.3 / 61.43 |

## By family

| Family | Count | Pass | Local non-empty | Hybrid non-empty | Avg overlap | Avg hybrid candidates |
|---|---:|---:|---:|---:|---:|---:|
| relaxed_fit_175_88 | 12 | 12 | 12 | 12 | 0.42 | 11 |
| office_shirt | 12 | 12 | 12 | 12 | 0.58 | 11 |
| summer_tee | 12 | 12 | 12 | 12 | 0 | 11 |
| mixed_personal_shopper | 12 | 12 | 12 | 12 | 0.08 | 11 |
| provenance_stress | 12 | 12 | 11 | 12 | 0 | 11 |

## Sample local vs hybrid records

- #1 **relaxed_fit_175_88** `175cm 88kg 릴렉스핏`
  - local: 2034137, 2035287, 1388775, 3417714, 996177
  - hybrid: 2112061, 4989733, 2385283, 3467738, 4227437
  - sources: 2026-06-25 MUSINSA relaxed fit 175 88 retrieval seed rows / 2026-06-25 MUSINSA office shirt retrieval seed rows
  - provenance rows: 11, overlap: 0, failures: none
- #2 **relaxed_fit_175_88** `175 88 여유핏 남자 코디`
  - local: 1753488, 4175389, 1955217, 4175458, 1821755
  - hybrid: 2112061, 4989733, 2385283, 3467738, 4227437
  - sources: 2026-06-25 MUSINSA relaxed fit 175 88 retrieval seed rows / 2026-06-25 MUSINSA office shirt retrieval seed rows
  - provenance rows: 11, overlap: 0, failures: none
- #3 **relaxed_fit_175_88** `부드럽고 안 끼는 남성 여유핏`
  - local: 4512936, 1504726, 1504727, 2603332, 3624956
  - hybrid: 2112061, 4989733, 2385283, 3467738, 4227437
  - sources: 2026-06-25 MUSINSA relaxed fit 175 88 retrieval seed rows / 2026-06-25 MUSINSA office shirt retrieval seed rows
  - provenance rows: 11, overlap: 0, failures: none
- #4 **relaxed_fit_175_88** `relaxed fit men soft outfit`
  - local: 3417714, 4900438, 5168051, 2034137, 1558197
  - hybrid: 4227437
  - sources: 2026-06-25 MUSINSA relaxed fit 175 88 retrieval seed rows / 2026-06-25 MUSINSA office shirt retrieval seed rows
  - provenance rows: 11, overlap: 0, failures: none
- #5 **relaxed_fit_175_88** `175cm 88kg 오버핏 티셔츠`
  - local: 2034137, 1848166, 2035287, 1944612, 1388775
  - hybrid: 4336536, 2112061, 2385283, 3467738, 4227437
  - sources: 2026-06-25 MUSINSA relaxed fit 175 88 retrieval seed rows / 2026-06-25 MUSINSA office shirt retrieval seed rows
  - provenance rows: 11, overlap: 0, failures: none
- #6 **relaxed_fit_175_88** `남성 여유핏 코디 10만원 이하`
  - local: 4512936, 1504726, 1504727, 2603332, 3624956
  - hybrid: 2112061, 4989733, 2385283, 3467738, 4227437
  - sources: 2026-06-25 MUSINSA relaxed fit 175 88 retrieval seed rows / 2026-06-25 MUSINSA office shirt retrieval seed rows
  - provenance rows: 11, overlap: 0, failures: none
- #7 **relaxed_fit_175_88** `편한 와이드 팬츠 오버핏 상의`
  - local: 1168906, 2112059, 2112061, 1168922, 2060759
  - hybrid: 2112061, 4024189, 3467738, 4227437, 2312232
  - sources: 2026-06-25 MUSINSA relaxed fit 175 88 retrieval seed rows / 2026-06-25 MUSINSA office shirt retrieval seed rows
  - provenance rows: 11, overlap: 1, failures: none
- #8 **relaxed_fit_175_88** `175 88 루즈핏 후드집업`
  - local: 2385283, 4401751, 4283788, 4288927, 5306830
  - hybrid: 2385283
  - sources: 2026-06-25 MUSINSA relaxed fit 175 88 retrieval seed rows / 2026-06-25 MUSINSA office shirt retrieval seed rows
  - provenance rows: 11, overlap: 1, failures: none
- #9 **relaxed_fit_175_88** `175cm 88kg 원턱 와이드 팬츠`
  - local: 2112059, 2112061, 3908604, 4939569, 4352419
  - hybrid: 2112061, 4024189, 3467738
  - sources: 2026-06-25 MUSINSA relaxed fit 175 88 retrieval seed rows / 2026-06-25 MUSINSA office shirt retrieval seed rows
  - provenance rows: 11, overlap: 1, failures: none
- #10 **relaxed_fit_175_88** `soft non-tight outfit men`
  - local: 1504726, 1944612, 1618312, 1504727, 2724650
  - hybrid: 2112061, 4989733, 2385283, 3467738, 4227437
  - sources: 2026-06-25 MUSINSA relaxed fit 175 88 retrieval seed rows / 2026-06-25 MUSINSA office shirt retrieval seed rows
  - provenance rows: 11, overlap: 0, failures: none
- #11 **relaxed_fit_175_88** `릴렉스핏 남성 와이드 팬츠`
  - local: 1168906, 2112059, 2112061, 1168922, 2060759
  - hybrid: 2112061, 4024189
  - sources: 2026-06-25 MUSINSA relaxed fit 175 88 retrieval seed rows / 2026-06-25 MUSINSA office shirt retrieval seed rows
  - provenance rows: 11, overlap: 1, failures: none
- #12 **relaxed_fit_175_88** `오버핏 스트라이프 롱슬리브`
  - local: 4336536, 4336541, 5249171, 4886714, 4761188
  - hybrid: 4336536, 2112061, 2385283, 3467738, 4227437
  - sources: 2026-06-25 MUSINSA relaxed fit 175 88 retrieval seed rows / 2026-06-25 MUSINSA office shirt retrieval seed rows
  - provenance rows: 11, overlap: 1, failures: none

## Failure samples

- None

## Notes

This gate uses the repo-level OpenCrab retrieval bridge in verified fixture mode. The fixture was captured from a real OpenCrab MCP project_run payload for the paperclipbase MUSINSA product ontology pack. A future live upstream can be supplied via OPENCRAB_BRIDGE_UPSTREAM_URL.
