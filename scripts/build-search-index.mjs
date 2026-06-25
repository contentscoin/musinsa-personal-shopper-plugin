import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSearchIndex, loadProducts } from '../src/productStore.mjs';

const out = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : 'data/index/products.search-index.json';
const products = await loadProducts();
const index = buildSearchIndex(products);
const payload = {
  built_at: index.built_at,
  product_count: index.product_count,
  lexicon: index.lexicon,
  products: index.entries.map(entry => ({
    product_id: entry.productId,
    haystack: entry.haystack,
    category_path: entry.product.category_path ?? [],
    brand: entry.product.brand ?? {},
    gender: entry.product.gender ?? [],
    final_price: Number.isFinite(entry.finalPrice) ? entry.finalPrice : null,
    review_count: entry.reviewCount,
    satisfaction_score: entry.satisfactionScore,
    source_url: entry.product.source_url
  }))
};
await mkdir(dirname(out), { recursive: true });
await writeFile(out, JSON.stringify(payload, null, 2));
console.log(JSON.stringify({ ok: true, out: fileURLToPath(new URL(out, `file://${process.cwd()}/`)), product_count: payload.product_count, brands: payload.lexicon.brands.length, categories: payload.lexicon.categories.length, terms: payload.lexicon.terms.length }, null, 2));
