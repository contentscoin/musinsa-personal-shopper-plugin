import { readFile, writeFile, mkdir } from 'node:fs/promises';

const dataPath = new URL('../data/products.crawled.json', import.meta.url);
const ontologyPath = new URL('../docs/ontology/musinsa-product-enrichment.md', import.meta.url);

const parsed = JSON.parse(await readFile(dataPath, 'utf8'));
const products = parsed.products ?? [];
const enriched = products.map(product => ({ ...product, ai_tags: buildAiTags(product) }));
parsed.products = enriched;
parsed.enrichment = {
  generated_at: new Date().toISOString(),
  method: 'deterministic keyword/material/category rules for MVP; production should use authorized product taxonomy, review APIs, and human QA.',
  fields: ['style_tags', 'occasion_tags', 'season_tags', 'fit_tags', 'risk_tags']
};
await writeFile(dataPath, JSON.stringify(parsed, null, 2));
await mkdir(new URL('../docs/ontology/', import.meta.url), { recursive: true });
await writeFile(ontologyPath, renderOntology(enriched));
console.log(JSON.stringify({ products: enriched.length, out: 'docs/ontology/musinsa-product-enrichment.md' }, null, 2));

function buildAiTags(product) {
  const text = normalize([
    product.name_ko,
    product.name_en,
    product.brand?.name_ko,
    product.brand?.name_en,
    product.category_path?.join(' '),
    product.season,
    ...(product.materials ?? []).flatMap(m => [m.dimension, ...(m.selected ?? [])])
  ].filter(Boolean).join(' '));
  const category = normalize(product.category_path?.join(' ') ?? '');
  const style = new Set(['데일리']);
  const occasion = new Set(['일상']);
  const season = new Set();
  const fit = new Set();
  const risk = new Set();

  if (/(미니멀|에센셜|베이직|basic|essential)/i.test(text)) style.add('미니멀');
  if (/(피그먼트|그래픽|스타|로고|스트릿|street)/i.test(text)) style.add('스트릿');
  if (/(슬랙스|셔츠|니트|가디건|재킷|자켓)/i.test(text)) { style.add('캐주얼'); occasion.add('출근룩'); }
  if (/(후드|집업|트랙탑|스니커즈|운동화|백팩)/i.test(text)) { style.add('캐주얼'); occasion.add('등교'); occasion.add('주말'); }
  if (/(벨트|슬랙스|셔츠)/i.test(text)) occasion.add('포멀');
  if (/(스니커즈|운동화)/i.test(category + text)) occasion.add('장시간 착용');

  if (/(봄|spring)/i.test(text)) season.add('봄');
  if (/(여름|summer)/i.test(text)) season.add('여름');
  if (/(가을|fall|autumn)/i.test(text)) season.add('가을');
  if (/(겨울|winter)/i.test(text)) season.add('겨울');
  if (/(후드|집업|니트|가디건|재킷|자켓|두꺼움)/i.test(text)) season.add('간절기');

  if (/(오버|루즈|oversized|over)/i.test(text)) fit.add('오버핏');
  if (/(크롭|crop)/i.test(text)) { fit.add('크롭'); risk.add('기장감 확인 필요'); }
  if (/(슬림|slim)/i.test(text)) fit.add('슬림');
  if (/(사이즈)/i.test(text)) risk.add('사이즈 리뷰 확인 권장');
  if (/(비침)/i.test(text) && andNot(text, '비침없음')) risk.add('비침 여부 확인 필요');
  if ((product.review?.total_count ?? 0) < 20) risk.add('리뷰 표본 부족');
  if (!product.images?.length) risk.add('이미지 부족');

  return {
    style_tags: [...style].slice(0, 8),
    occasion_tags: [...occasion].slice(0, 8),
    season_tags: [...season].slice(0, 8),
    fit_tags: [...fit].slice(0, 8),
    risk_tags: [...risk].slice(0, 8)
  };
}

function renderOntology(products) {
  const lines = ['# MUSINSA Product AI Tag Enrichment', '', `Generated at: ${new Date().toISOString()}`, '', '## Summary', ''];
  lines.push(`- Products enriched: ${products.length}`);
  lines.push('- Fields: style_tags, occasion_tags, season_tags, fit_tags, risk_tags');
  lines.push('- Method: deterministic MVP keyword/material/category rules; production should use official taxonomy/review feeds and QA.');
  lines.push('', '## Top Tag Counts', '');
  for (const [label, path] of Object.entries({ style: 'style_tags', occasion: 'occasion_tags', season: 'season_tags', fit: 'fit_tags', risk: 'risk_tags' })) {
    lines.push(`### ${label}`);
    for (const row of topCounts(products.flatMap(p => p.ai_tags?.[path] ?? []), 12)) lines.push(`- ${row.value}: ${row.count}`);
    lines.push('');
  }
  lines.push('## Product triples', '');
  for (const product of products.slice(0, 60)) {
    const pid = product.product_id;
    for (const tag of product.ai_tags?.style_tags ?? []) lines.push(`- Product:${pid} -> has_style_tag -> ${tag}`);
    for (const tag of product.ai_tags?.occasion_tags ?? []) lines.push(`- Product:${pid} -> has_occasion_tag -> ${tag}`);
    for (const tag of product.ai_tags?.season_tags ?? []) lines.push(`- Product:${pid} -> has_season_tag -> ${tag}`);
    for (const tag of product.ai_tags?.fit_tags ?? []) lines.push(`- Product:${pid} -> has_fit_tag -> ${tag}`);
    for (const tag of product.ai_tags?.risk_tags ?? []) lines.push(`- Product:${pid} -> has_risk_tag -> ${tag}`);
  }
  return lines.join('\n') + '\n';
}

function normalize(value) {
  return String(value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function andNot(text, forbidden) {
  return !text.includes(forbidden);
}

function topCounts(values, limit) {
  const counts = new Map();
  for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))).slice(0, limit).map(([value, count]) => ({ value, count }));
}
