import { compactProduct, searchProducts, getProduct } from './productStore.mjs';

const COLOR_WORDS = ['차콜', '그레이', '회색', '블랙', '검정', '화이트', '흰색', '아이보리', '베이지', '브라운', '카키', '네이비', '블루', '버건디'];
const CATEGORY_WORDS = ['후드집업', '후드 집업', '후드티', '후드 티셔츠', '스니커즈', '운동화', '니트', '스웨터', '가디건', '슬랙스', '팬츠', '바지', '트랙탑', '재킷', '자켓', '벨트', '백팩'];
const SEASON_WORDS = ['봄', '여름', '가을', '겨울'];
const GENDER_WORDS = ['남성', '여성', '남자', '여자', '우먼', '맨'];

export function parseShoppingIntent(request = {}) {
  const query = [request.query, request.occasion, ...(request.customer_profile?.style_preference ?? [])].filter(Boolean).join(' ');
  const budget = request.budget ?? parseBudget(query);
  const colors = COLOR_WORDS.filter(word => query.includes(word));
  const categories = CATEGORY_WORDS.filter(word => query.includes(word));
  const seasons = SEASON_WORDS.filter(word => query.includes(word));
  const genderHint = GENDER_WORDS.find(word => query.includes(word));
  const brandHint = request.brand ?? null;
  return {
    raw_query: query,
    budget,
    colors,
    categories,
    seasons,
    gender: normalizeGender(genderHint),
    brand: brandHint,
    must_have_terms: [...colors, ...categories],
    extracted_filters: {
      price_max: budget,
      gender: normalizeGender(genderHint),
      brand: brandHint
    }
  };
}

export function summarizeProduct(product, customerProfile = {}) {
  const fitSignals = material(product, ['핏']);
  const touchSignals = material(product, ['촉감']);
  const thicknessSignals = material(product, ['두께']);
  const seeThroughSignals = material(product, ['비침']);
  const stretchSignals = material(product, ['신축성']);
  const seasonSignals = material(product, ['계절']);
  const risks = [];
  if (seeThroughSignals.some(v => v.includes('비침') && !v.includes('없음'))) risks.push('비침 관련 소재 신호 확인 필요');
  if (thicknessSignals.some(v => v.includes('두꺼움'))) risks.push('계절/두께감 확인 필요');
  if ((product.review?.total_count ?? 0) < 20) risks.push('리뷰 표본이 적어 구매 판단 신뢰도가 낮을 수 있음');

  const usual = customerProfile.usual_size ? `평소 ${customerProfile.usual_size}` : '평소 사이즈 정보 없음';
  const fitPref = customerProfile.fit_preference ? `선호 핏: ${customerProfile.fit_preference}` : '핏 선호 없음';

  return {
    product_id: product.product_id,
    product_name: product.name_ko,
    review_count: product.review?.total_count ?? 0,
    satisfaction_score: product.review?.satisfaction_score ?? null,
    fit_summary: fitSignals.length ? `상품 소재/핏 라벨 기준 ${fitSignals.join(', ')} 성향입니다. ${usual}, ${fitPref}.` : `공개 핏 라벨이 부족합니다. ${usual}, ${fitPref}.`,
    material_summary: {
      fit: fitSignals,
      touch: touchSignals,
      thickness: thicknessSignals,
      see_through: seeThroughSignals,
      stretch: stretchSignals,
      season: seasonSignals
    },
    purchase_risks: risks,
    final_advice: buildAdvice(product, customerProfile, risks)
  };
}

export function recommend(products, request) {
  const intent = parseShoppingIntent(request);
  const filters = {
    query: intent.raw_query,
    price_max: intent.budget,
    gender: intent.gender,
    brand: intent.brand,
    limit: request.limit ?? 5
  };
  const results = searchProducts(products, filters);
  const recommendations = results.map((r, index) => {
    const full = getProduct(products, r.product_id);
    const shopperInsight = summarizeProduct(full, request.customer_profile ?? {});
    return {
      ...r,
      rank: index + 1,
      why_recommended: buildRecommendationReason(full, intent, shopperInsight),
      decision_badges: buildDecisionBadges(full, intent),
      shopper_insight: shopperInsight
    };
  });

  return {
    query_understood: intent.raw_query,
    parsed_intent: intent,
    assistant_summary: buildAssistantSummary(recommendations, intent),
    recommendations,
    shortlist: recommendations.slice(0, 3).map(item => ({
      product_id: item.product_id,
      product_name: item.name_ko,
      price: item.price?.final_price ?? item.price?.sale_price,
      reason: item.why_recommended,
      url: item.source_url,
      image: item.primary_image
    })),
    next_questions: nextQuestions(intent)
  };
}

export function compare(products, productIds) {
  const rows = productIds.map(id => getProduct(products, id)).filter(Boolean).map(product => {
    const summary = summarizeProduct(product);
    return {
      product_id: product.product_id,
      product_name: product.name_ko,
      brand: product.brand?.name_ko,
      category: product.category_path?.join(' > '),
      final_price: product.price?.final_price ?? product.price?.sale_price,
      discount_rate: product.price?.discount_rate ?? 0,
      review_count: product.review?.total_count ?? 0,
      satisfaction_score: product.review?.satisfaction_score ?? null,
      fit_signal: summary.material_summary.fit.join(', ') || '공개 핏 라벨 없음',
      risk_count: summary.purchase_risks.length,
      url: product.source_url,
      image: product.images?.[0]?.url,
      decision_summary: summary.final_advice
    };
  });
  return {
    comparison_table: rows,
    best_pick: chooseBestPick(rows),
    decision_notes: buildCompareNotes(rows)
  };
}

function parseBudget(query) {
  const manwon = query.match(/(\d+)\s*만\s*원/);
  if (manwon) return Number(manwon[1]) * 10000;
  const won = query.match(/(\d{2,})\s*원/);
  if (won) return Number(won[1]);
  return undefined;
}

function normalizeGender(word) {
  if (!word) return undefined;
  if (['남성', '남자', '맨'].includes(word)) return '남성';
  if (['여성', '여자', '우먼'].includes(word)) return '여성';
  return word;
}

function material(product, names) {
  return (product.materials ?? [])
    .filter(m => names.some(n => m.dimension.includes(n)))
    .flatMap(m => m.selected ?? []);
}

function buildRecommendationReason(product, intent, insight) {
  const reasons = [];
  if (intent.categories.some(c => productText(product).includes(c.replace(/\s+/g, '')) || productText(product).includes(c))) reasons.push('요청한 카테고리와 일치');
  if (intent.colors.some(c => productText(product).includes(c))) reasons.push('요청 색상/톤 포함');
  const price = product.price?.final_price ?? product.price?.sale_price;
  if (intent.budget && price <= intent.budget) reasons.push(`예산 ${intent.budget.toLocaleString('ko-KR')}원 이하`);
  if ((product.review?.total_count ?? 0) > 1000) reasons.push('리뷰 수가 많아 검증 신호가 강함');
  if ((product.review?.satisfaction_score ?? 0) >= 4.8) reasons.push(`만족도 ${product.review.satisfaction_score}`);
  if (insight.material_summary.fit.length) reasons.push(`핏 신호: ${insight.material_summary.fit.join(', ')}`);
  return reasons.length ? reasons.join(' · ') : '요청 조건과 공개 상품 데이터 기준으로 관련도가 높음';
}

function buildDecisionBadges(product, intent) {
  const price = product.price?.final_price ?? product.price?.sale_price;
  const badges = [];
  if (intent.budget && price <= intent.budget) badges.push('예산 적합');
  if ((product.review?.satisfaction_score ?? 0) >= 4.8) badges.push('고만족도');
  if ((product.review?.total_count ?? 0) >= 1000) badges.push('리뷰 풍부');
  if ((product.price?.discount_rate ?? 0) >= 30) badges.push('할인율 높음');
  if ((product.materials ?? []).length) badges.push('핏/소재 신호 있음');
  return badges;
}

function buildAssistantSummary(recommendations, intent) {
  if (!recommendations.length) return '조건에 맞는 상품을 찾지 못했습니다. 예산/카테고리/색상 조건을 조금 넓혀보세요.';
  const top = recommendations[0];
  const price = top.price?.final_price ?? top.price?.sale_price;
  return `상위 후보는 ${top.name_ko}입니다. ${price?.toLocaleString('ko-KR')}원, 리뷰 ${top.review?.total_count?.toLocaleString('ko-KR')}개, 만족도 ${top.review?.satisfaction_score} 기준으로 가장 관련도가 높습니다.`;
}

function nextQuestions(intent) {
  const questions = [];
  if (!intent.budget) questions.push('예산 상한이 있나요? 예: 5만원 이하');
  if (!intent.colors.length) questions.push('선호 색상이 있나요? 예: 차콜, 블랙, 아이보리');
  if (!intent.categories.length) questions.push('원하는 카테고리를 더 좁힐까요? 예: 후드집업, 스니커즈, 니트');
  questions.push('정핏/루즈/오버핏 중 어떤 핏을 선호하나요?');
  return questions.slice(0, 3);
}

function chooseBestPick(rows) {
  if (!rows.length) return null;
  return [...rows].sort((a, b) => scoreCompareRow(b) - scoreCompareRow(a))[0];
}

function scoreCompareRow(row) {
  return (row.satisfaction_score ?? 0) * 10 + Math.log10((row.review_count ?? 0) + 1) + (row.discount_rate ?? 0) / 20 - row.risk_count;
}

function buildCompareNotes(rows) {
  if (!rows.length) return ['비교할 상품을 찾지 못했습니다.'];
  const cheapest = [...rows].sort((a, b) => a.final_price - b.final_price)[0];
  const mostReviewed = [...rows].sort((a, b) => b.review_count - a.review_count)[0];
  return [
    `가격 우선이면 ${cheapest.product_name}이 가장 유리합니다.`,
    `리뷰 검증 우선이면 ${mostReviewed.product_name}이 가장 강합니다.`
  ];
}

function productText(product) {
  return [product.name_ko, product.brand?.name_ko, product.category_path?.join(' ')].filter(Boolean).join(' ').replace(/\s+/g, '');
}

function buildAdvice(product, profile, risks) {
  const price = product.price?.final_price ?? product.price?.sale_price;
  const reviewScore = product.review?.satisfaction_score;
  const positives = [];
  if (reviewScore && reviewScore >= 4.5) positives.push(`만족도 ${reviewScore}점으로 리뷰 신호가 좋습니다`);
  if ((product.review?.total_count ?? 0) > 100) positives.push('리뷰 수가 충분해 사회적 검증 신호가 있습니다');
  if (price) positives.push(`현재 확인 가격은 ${price.toLocaleString('ko-KR')}원입니다`);
  const riskText = risks.length ? `주의: ${risks.join(', ')}.` : '공개 데이터 기준 큰 구매 리스크는 낮습니다.';
  return `${positives.join('. ')}. ${riskText}`;
}
