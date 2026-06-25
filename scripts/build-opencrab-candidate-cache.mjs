import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { loadProducts, searchProductsWithRetrieval } from '../src/productStore.mjs';

const out = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : 'data/index/opencrab-candidate-cache.json';
const products = await loadProducts();
const queries = [
  { query: '남성 차콜 후드집업 5만원 이하', price_max: 50000, gender: '남성' },
  { query: '차콜 후드집업', price_max: 70000 },
  { query: '화이트 스니커즈', category: '신발 > 스니커즈' },
  { query: '여름 반팔 티셔츠', category: '상의 > 반소매 티셔츠' },
  { query: '블랙 코튼 팬츠', category: '바지 > 코튼 팬츠' },
  { query: '오버핏 니트', category: '상의 > 니트/스웨터' },
  { query: '가디건 출근룩', category: '아우터 > 카디건' }
];
const cache = {
  generated_at: new Date().toISOString(),
  owner_tag: 'hermes-profile:paperclipbase',
  project_name: 'paperclipbase',
  source: 'local product index fallback cache for OpenCrab retrieval adapter; replace/sync with OpenCrab project-run results when available',
  queries: {},
  default: []
};
for (const q of queries) {
  const response = searchProductsWithRetrieval(products, { ...q, limit: 20, retrieval_mode: 'local_index' });
  const candidates = response.results.map(item => ({ product_id: String(item.product_id), source_url: item.source_url, score: item.score, name: item.name_ko }));
  cache.queries[q.query] = candidates;
  if (q.query === '남성 차콜 후드집업 5만원 이하') cache.default = candidates.slice(0, 10);
}
await mkdir(dirname(out), { recursive: true });
await writeFile(out, JSON.stringify(cache, null, 2));
console.log(JSON.stringify({ ok: true, out, query_count: Object.keys(cache.queries).length, default_count: cache.default.length }, null, 2));
