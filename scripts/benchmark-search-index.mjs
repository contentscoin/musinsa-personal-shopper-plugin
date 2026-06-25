import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { loadProducts, searchProducts, searchProductsWithRetrieval } from '../src/productStore.mjs';

const out = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : 'reports/search-index-benchmark-20260625.md';
const products = await loadProducts();
const queries = [
  { query: '남성 차콜 후드집업 5만원 이하', price_max: 50000, gender: '남성', limit: 10 },
  { query: '화이트 스니커즈', limit: 10 },
  { query: '여름 반팔 티셔츠', limit: 10 },
  { query: '오버핏 니트', limit: 10 },
  { query: '블랙 코튼 팬츠', limit: 10 },
  { query: '가디건 출근룩', limit: 10 }
];

// Warm the attached local index.
for (const q of queries) searchProducts(products, q);

const rounds = 120;
const rows = [];
for (const q of queries) {
  const started = performance.now();
  let last;
  for (let i = 0; i < rounds; i++) last = searchProductsWithRetrieval(products, { ...q, retrieval_mode: 'local_index' });
  const elapsed = performance.now() - started;
  rows.push({
    query: q.query,
    rounds,
    avg_ms: Number((elapsed / rounds).toFixed(3)),
    result_count: last.results.length,
    candidate_count: last.retrieval.candidate_count,
    brands: last.retrieval.lexicon.brands,
    categories: last.retrieval.lexicon.categories,
    terms: last.retrieval.lexicon.terms
  });
}

const md = `# Search Index Benchmark — 2026-06-25

## Purpose

Measure the new precomputed local search index used as the low-latency serving layer before/alongside OpenCrab ontology-pack candidate retrieval.

## Dataset

- Products: ${products.length}
- Rounds per query: ${rounds}

## Results

| Query | Avg ms | Result count | Candidate count |
|---|---:|---:|---:|
${rows.map(r => `| ${r.query} | ${r.avg_ms} | ${r.result_count} | ${r.candidate_count} |`).join('\n')}

## Lexicon

| Metric | Count |
|---|---:|
| Brands | ${rows[0]?.brands ?? 0} |
| Categories | ${rows[0]?.categories ?? 0} |
| Terms | ${rows[0]?.terms ?? 0} |

## Architecture note

OpenCrab ontology packs should provide semantic product candidates and provenance. The plugin server should keep this precomputed local index/cache in the hot path and use OpenCrab candidates through \`candidate_product_ids\` / \`opencrab_candidate_product_ids\` for hybrid re-ranking.
`;

await mkdir(dirname(out), { recursive: true });
await writeFile(out, md);
console.log(JSON.stringify({ ok: true, out, rows }, null, 2));
