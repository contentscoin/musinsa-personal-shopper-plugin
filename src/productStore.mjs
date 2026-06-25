import { readFile } from 'node:fs/promises';

const DEFAULT_DATA_PATH = new URL('../data/products.crawled.json', import.meta.url);
const INDEX_SYMBOL = Symbol.for('musinsa.productSearchIndex');
const DEFAULT_SEARCH_MODE = 'local_index';

export async function loadProducts(path = DEFAULT_DATA_PATH) {
  const text = await readFile(path, 'utf8');
  const parsed = JSON.parse(text);
  const products = parsed.products ?? [];
  attachSearchIndex(products);
  return products;
}

export function attachSearchIndex(products) {
  if (!Array.isArray(products)) return null;
  if (!products[INDEX_SYMBOL]) {
    Object.defineProperty(products, INDEX_SYMBOL, {
      value: buildSearchIndex(products),
      enumerable: false,
      configurable: false
    });
  }
  return products[INDEX_SYMBOL];
}

export function buildSearchIndex(products) {
  const entries = products.map((product, index) => {
    const categoryText = normalize(product.category_path?.join(' '));
    const brandText = normalize([product.brand?.name_ko, product.brand?.name_en].filter(Boolean).join(' '));
    const aiTags = product.ai_tags ?? {};
    const tagTerms = [
      ...(aiTags.style_tags ?? []), ...(aiTags.occasion_tags ?? []), ...(aiTags.risk_tags ?? []),
      ...(aiTags.season_tags ?? []), ...(aiTags.fit_tags ?? [])
    ];
    const materialTerms = (product.materials ?? []).flatMap(m => [m.dimension, ...(m.selected ?? [])]);
    const haystackRaw = [
      product.product_id, product.name_ko, product.name_en, product.brand?.name_ko, product.brand?.name_en,
      product.category_path?.join(' '), ...tagTerms, ...materialTerms
    ].filter(Boolean).join(' ');
    const haystack = normalize(haystackRaw);
    return {
      product,
      index,
      productId: String(product.product_id),
      haystack,
      haystackTight: tight(haystack),
      categoryText,
      categoryTight: tight(categoryText),
      brandText,
      brandTight: tight(brandText),
      genderText: normalize((product.gender ?? []).join(' ')),
      finalPrice: product.price?.final_price ?? product.price?.sale_price ?? Number.POSITIVE_INFINITY,
      reviewCount: product.review?.total_count ?? 0,
      satisfactionScore: product.review?.satisfaction_score ?? 0,
      hasImage: Boolean(product.images?.length)
    };
  });
  const lexicon = buildCatalogLexicon(products);
  const byId = new Map(entries.map(entry => [entry.productId, entry]));
  return {
    built_at: new Date().toISOString(),
    product_count: entries.length,
    entries,
    byId,
    lexicon
  };
}

export function getCatalogLexicon(products) {
  return attachSearchIndex(products)?.lexicon ?? buildCatalogLexicon(products);
}

export function searchProducts(products, filters = {}) {
  return searchProductsWithRetrieval(products, filters).results;
}

export function searchProductsWithRetrieval(products, filters = {}) {
  const started = performanceNow();
  const index = attachSearchIndex(products);
  const q = normalize(filters.query ?? '');
  const category = normalize(filters.category ?? '');
  const brand = normalize(filters.brand ?? '');
  const gender = normalize(filters.gender ?? '');
  const min = filters.price_min ?? 0;
  const max = filters.price_max ?? Number.POSITIVE_INFINITY;
  const limit = filters.limit ?? 10;
  const mode = normalizeSearchMode(filters.retrieval_mode);
  const requestedCandidateIds = normalizeCandidateIds(filters.candidate_product_ids ?? filters.opencrab_candidate_product_ids);
  const queryTokens = expandQueryTokens(q, index.lexicon);
  const exactQuery = normalize(q);
  const exactQueryTight = tight(q);

  let candidateEntries = index.entries;
  const candidateSource = [];
  if ((mode === 'hybrid' || mode === 'opencrab_first') && requestedCandidateIds.length) {
    const candidates = requestedCandidateIds.map(id => index.byId.get(String(id))).filter(Boolean);
    if (candidates.length) {
      candidateEntries = candidates;
      candidateSource.push('opencrab_candidates');
    }
  }
  if (!candidateSource.length) candidateSource.push('local_index');

  let scored = candidateEntries
    .map(entry => ({ entry, score: scoreIndexedEntry(entry, { q, category, brand, gender, min, max, queryTokens, exactQuery, exactQueryTight }) }))
    .filter(row => row.score > 0)
    .sort((a, b) => b.score - a.score || b.entry.reviewCount - a.entry.reviewCount)
    .slice(0, limit);
  const opencrabCandidateFallbackUsed = scored.length === 0 && candidateSource.includes('opencrab_candidates') && candidateEntries.length > 0;
  if (opencrabCandidateFallbackUsed) {
    // OpenCrab may return semantically relevant evidence for profile/occasion queries whose exact
    // wording is not present in product names/tags (e.g. "175cm 88kg 릴렉스핏"). In that case,
    // keep the ontology candidate set trusted and return a deterministic lightweight rerank instead
    // of falling back to an empty response.
    scored = candidateEntries
      .filter(entry => entry.finalPrice >= min && entry.finalPrice <= max)
      .map(entry => ({ entry, score: 0.6 + (entry.satisfactionScore ? entry.satisfactionScore / 10 : 0) + (entry.reviewCount > 100 ? 0.1 : 0) + (entry.hasImage ? 0.05 : 0) }))
      .sort((a, b) => b.score - a.score || b.entry.reviewCount - a.entry.reviewCount)
      .slice(0, limit);
  }

  const results = scored.map(row => ({ ...compactProduct(row.entry.product), score: Number(row.score.toFixed(3)) }));
  const elapsed = performanceNow() - started;
  return {
    results,
    retrieval: {
      mode,
      candidate_source: candidateSource,
      local_index_used: true,
      opencrab_candidates_used: candidateSource.includes('opencrab_candidates'),
      opencrab_candidate_fallback_used: opencrabCandidateFallbackUsed,
      candidate_count: candidateEntries.length,
      matched_count: scored.length,
      cache_hit: true,
      lexicon: {
        brands: index.lexicon.brands.length,
        categories: index.lexicon.categories.length,
        terms: index.lexicon.terms.length
      },
      latency_ms: {
        total: roundMs(elapsed),
        candidate_retrieval: 0,
        rerank: roundMs(elapsed)
      }
    }
  };
}

function scoreIndexedEntry(entry, f) {
  let score = 0;

  // Structured filters are hard constraints. Without this, an empty or broad query can rank
  // unrelated high-review products above the requested brand/category.
  if (f.category && !(entry.categoryText.includes(f.category) || entry.categoryTight.includes(tight(f.category)))) return 0;
  if (f.brand && !brandMatches(entry.brandText, f.brand)) return 0;
  if (f.gender && !entry.genderText.includes(f.gender)) return 0;

  if (f.queryTokens.length) {
    let matched = 0;
    let specificMatched = 0;
    if (f.exactQuery.length >= 3 && (entry.haystack.includes(f.exactQuery) || entry.haystackTight.includes(f.exactQueryTight))) score += 4;
    if (f.exactQuery.length >= 3 && (entry.categoryText.includes(f.exactQuery) || entry.categoryTight.includes(f.exactQueryTight))) score += 6;
    for (const token of f.queryTokens) {
      if (entry.haystack.includes(token) || entry.haystackTight.includes(tight(token))) {
        matched += 1;
        if (!isGenericQueryToken(token)) specificMatched += 1;
        score += token.length >= 3 ? 2.2 : 1;
        if (entry.categoryText.includes(token) || entry.categoryTight.includes(tight(token))) score += 1.4;
      }
    }
    // Natural-language shopping should not return unrelated products just because the price matches.
    if (matched === 0) return 0;
    // For broad category phrases like "데님 팬츠" or "트러커 재킷", avoid returning
    // anything that only matched the generic tail word (팬츠/재킷/티셔츠/etc.).
    if (f.queryTokens.some(token => isGenericQueryToken(token)) && f.queryTokens.some(token => !isGenericQueryToken(token)) && specificMatched === 0) return 0;
    score += Math.min(matched, 4);
  } else {
    score += 1;
  }

  if (f.category) score += 3;
  if (f.brand) score += 3;
  if (f.gender) score += 1;
  if (entry.finalPrice >= f.min && entry.finalPrice <= f.max) score += 2; else return 0;
  if (entry.satisfactionScore) score += entry.satisfactionScore / 5;
  if (entry.reviewCount > 100) score += 0.5;
  if (entry.hasImage) score += 0.2;
  return score;
}

function buildCatalogLexicon(products) {
  const brands = new Set();
  const categories = new Set();
  const colors = new Set(['차콜', '그레이', '회색', '블랙', '검정', '화이트', '흰색', '아이보리', '베이지', '브라운', '카키', '네이비', '블루', '버건디']);
  const terms = new Set();
  const categoryAliases = new Map();

  for (const product of products) {
    for (const brand of [product.brand?.name_ko, product.brand?.name_en]) {
      const value = normalize(brand);
      if (value.length >= 2) brands.add(value);
    }
    const path = product.category_path ?? [];
    for (const category of path) {
      const value = normalize(category);
      if (value.length >= 2) {
        categories.add(value);
        terms.add(value);
        terms.add(tight(value));
        for (const part of value.split(/\s+/).filter(p => p.length >= 2)) terms.add(part);
      }
    }
    const fullPath = normalize(path.join(' '));
    if (fullPath) categories.add(fullPath);
    const leaf = normalize(path.at?.(-1) ?? path[path.length - 1]);
    if (leaf) {
      const aliases = new Set([leaf, tight(leaf), ...leaf.split(/\s+/).filter(p => p.length >= 2)]);
      categoryAliases.set(leaf, [...aliases]);
    }
    for (const tag of [
      ...(product.ai_tags?.style_tags ?? []), ...(product.ai_tags?.occasion_tags ?? []),
      ...(product.ai_tags?.season_tags ?? []), ...(product.ai_tags?.fit_tags ?? [])
    ]) {
      const value = normalize(tag);
      if (value.length >= 2) terms.add(value);
    }
    const colorMatchText = normalize([product.name_ko, product.name_en, ...(product.ai_tags?.style_tags ?? [])].filter(Boolean).join(' '));
    for (const color of [...colors]) if (colorMatchText.includes(normalize(color))) colors.add(normalize(color));
  }

  const staticSynonymGroups = [
    ['후드집업', '후드 집업', '후드', '집업'],
    ['숏팬츠', '숏', '쇼츠', '반바지'],
    ['트랙탑', '트레이닝', '재킷', '자켓'],
    ['스니커즈', '운동화', '신발'],
    ['니트', '스웨터'],
    ['차콜', '그레이', '회색'],
    ['블랙', '검정'],
    ['화이트', '흰색']
  ];

  return {
    brands: [...brands].sort(),
    categories: [...categories].sort(),
    colors: [...colors].map(normalize).sort(),
    terms: [...terms].filter(Boolean).sort(),
    category_aliases: Object.fromEntries([...categoryAliases.entries()].sort()),
    synonym_groups: staticSynonymGroups
  };
}

function expandQueryTokens(query, lexicon = null) {
  const base = normalize(query).split(/\s+/).filter(token => token.length >= 2);
  const joined = tight(query);
  const synonyms = [];
  const lexiconGroups = lexicon?.synonym_groups ?? [];
  for (const group of lexiconGroups) {
    if (group.some(word => joined.includes(tight(word)))) synonyms.push(...group);
  }
  for (const color of lexicon?.colors ?? []) {
    if (joined.includes(tight(color))) synonyms.push(color);
  }
  for (const category of lexicon?.categories ?? []) {
    const categoryTight = tight(category);
    if (categoryTight.length >= 2 && joined.includes(categoryTight)) synonyms.push(category, ...category.split(/\s+/));
  }
  for (const brand of lexicon?.brands ?? []) {
    const brandTight = tight(brand);
    if (brandTight.length >= 2 && joined.includes(brandTight)) synonyms.push(brand);
  }
  return [...new Set([...base, ...synonyms].map(normalize).filter(Boolean))];
}

export function getProduct(products, productId) {
  const index = attachSearchIndex(products);
  return index?.byId.get(String(productId))?.product ?? products.find(p => String(p.product_id) === String(productId));
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

function normalizeCandidateIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(v => String(v)).filter(Boolean))];
}

function normalizeSearchMode(value) {
  const mode = String(value ?? DEFAULT_SEARCH_MODE).toLowerCase();
  if (['local_index', 'hybrid', 'opencrab_first'].includes(mode)) return mode;
  return DEFAULT_SEARCH_MODE;
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

function performanceNow() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function roundMs(value) {
  return Number(value.toFixed(3));
}
