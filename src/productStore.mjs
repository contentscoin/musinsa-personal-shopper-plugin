import { readFile } from 'node:fs/promises';

const DEFAULT_DATA_PATH = new URL('../data/products.crawled.json', import.meta.url);

export async function loadProducts(path = DEFAULT_DATA_PATH) {
  const text = await readFile(path, 'utf8');
  const parsed = JSON.parse(text);
  return parsed.products ?? [];
}

export function searchProducts(products, filters = {}) {
  const q = normalize(filters.query ?? '');
  const category = normalize(filters.category ?? '');
  const brand = normalize(filters.brand ?? '');
  const gender = normalize(filters.gender ?? '');
  const min = filters.price_min ?? 0;
  const max = filters.price_max ?? Number.POSITIVE_INFINITY;
  const limit = filters.limit ?? 10;

  return products
    .map(product => ({ product, score: scoreProduct(product, { q, category, brand, gender, min, max }) }))
    .filter(row => row.score > 0)
    .sort((a, b) => b.score - a.score || (b.product.review.total_count ?? 0) - (a.product.review.total_count ?? 0))
    .slice(0, limit)
    .map(row => ({ ...compactProduct(row.product), score: Number(row.score.toFixed(3)) }));
}

function scoreProduct(product, f) {
  const haystackRaw = [
    product.name_ko, product.name_en, product.brand?.name_ko, product.brand?.name_en, product.category_path?.join(' '),
    ...(product.ai_tags?.style_tags ?? []), ...(product.ai_tags?.occasion_tags ?? []), ...(product.ai_tags?.risk_tags ?? []),
    ...(product.materials ?? []).flatMap(m => [m.dimension, ...(m.selected ?? [])])
  ].filter(Boolean).join(' ');
  const haystack = normalize(haystackRaw);
  const haystackTight = tight(haystack);
  const categoryText = normalize(product.category_path?.join(' '));
  const categoryTight = tight(categoryText);
  const brandText = normalize([product.brand?.name_ko, product.brand?.name_en].filter(Boolean).join(' '));
  const queryTokens = expandQueryTokens(f.q);
  let score = 0;

  // Structured filters are hard constraints. Without this, an empty or broad query can rank
  // unrelated high-review products above the requested brand/category.
  if (f.category && !(categoryText.includes(f.category) || categoryTight.includes(tight(f.category)))) return 0;
  if (f.brand && !brandMatches(brandText, f.brand)) return 0;
  if (f.gender && !normalize((product.gender ?? []).join(' ')).includes(f.gender)) return 0;

  if (queryTokens.length) {
    let matched = 0;
    let specificMatched = 0;
    const exactQuery = normalize(f.q);
    const exactQueryTight = tight(f.q);
    if (exactQuery.length >= 3 && (haystack.includes(exactQuery) || haystackTight.includes(exactQueryTight))) score += 4;
    if (exactQuery.length >= 3 && (categoryText.includes(exactQuery) || categoryTight.includes(exactQueryTight))) score += 6;
    for (const token of queryTokens) {
      if (haystack.includes(token) || haystackTight.includes(tight(token))) {
        matched += 1;
        if (!isGenericQueryToken(token)) specificMatched += 1;
        score += token.length >= 3 ? 2.2 : 1;
        if (categoryText.includes(token) || categoryTight.includes(tight(token))) score += 1.4;
      }
    }
    // Natural-language shopping should not return unrelated products just because the price matches.
    if (matched === 0) return 0;
    // For broad category phrases like "데님 팬츠" or "트러커 재킷", avoid returning
    // anything that only matched the generic tail word (팬츠/재킷/티셔츠/etc.).
    if (queryTokens.some(token => isGenericQueryToken(token)) && queryTokens.some(token => !isGenericQueryToken(token)) && specificMatched === 0) return 0;
    score += Math.min(matched, 4);
  } else {
    score += 1;
  }

  if (f.category) score += 3;
  if (f.brand) score += 3;
  if (f.gender) score += 1;
  const price = product.price?.final_price ?? product.price?.sale_price ?? Number.POSITIVE_INFINITY;
  if (price >= f.min && price <= f.max) score += 2; else return 0;
  if (product.review?.satisfaction_score) score += product.review.satisfaction_score / 5;
  if ((product.review?.total_count ?? 0) > 100) score += 0.5;
  if (product.images?.length) score += 0.2;
  return score;
}

function expandQueryTokens(query) {
  const base = normalize(query).split(/\s+/).filter(token => token.length >= 2);
  const joined = tight(query);
  const synonyms = [];
  const lexicon = [
    ['후드집업', '후드', '집업'],
    ['숏팬츠', '숏', '쇼츠', '반바지'],
    ['트랙탑', '트레이닝', '재킷'],
    ['스니커즈', '운동화', '신발'],
    ['니트', '스웨터'],
    ['차콜', '그레이', '회색'],
    ['블랙', '검정'],
    ['화이트', '흰색']
  ];
  for (const group of lexicon) {
    if (group.some(word => joined.includes(tight(word)))) synonyms.push(...group);
  }
  return [...new Set([...base, ...synonyms].map(normalize).filter(Boolean))];
}

export function getProduct(products, productId) {
  return products.find(p => String(p.product_id) === String(productId));
}

export function compactProduct(product) {
  return {
    product_id: product.product_id,
    name_ko: product.name_ko,
    brand: product.brand,
    category_path: product.category_path,
    gender: product.gender,
    price: product.price,
    review: product.review,
    materials: product.materials,
    primary_image: product.images?.[0]?.url,
    ai_tags: product.ai_tags,
    source_url: product.source_url
  };
}

function brandMatches(brandText, requestedBrand) {
  const brand = normalize(brandText);
  const requested = normalize(requestedBrand);
  if (!requested) return true;
  if (brand === requested) return true;
  // Allow sub-line brands such as "무신사 스탠다드 우먼" for "무신사 스탠다드"
  // and "푸마 바디웨어" for "푸마", but avoid false positives like "어반스터프" for "반스".
  return brand.startsWith(`${requested} `) || tight(brand).startsWith(tight(requested));
}

function isGenericQueryToken(token) {
  return new Set(['팬츠', '바지', '재킷', '자켓', '티셔츠', '셔츠', '상의', '신발', '운동화', '집업']).has(normalize(token));
}

function normalize(value) {
  return String(value ?? '').toLowerCase().replace(/[^0-9a-z가-힣\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tight(value) {
  return normalize(value).replace(/\s+/g, '');
}
