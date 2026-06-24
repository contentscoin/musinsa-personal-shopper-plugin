import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { searchProducts } from '../src/productStore.mjs';
import { compare, parseShoppingIntent, recommend, summarizeProduct } from '../src/personalShopper.mjs';
import { clearShortlist, getShortlist, saveShortlist } from '../src/shortlistStore.mjs';
import { ANALYTICS_NOTICE, analyticsDashboard, sanitizeQuery, sanitizeTelemetryEvent, summarizeEvents } from '../src/telemetryStore.mjs';

const products = [
  {
    product_id: '1',
    name_ko: '미니멀 차콜 후드집업',
    brand: { name_ko: '테스트브랜드', name_en: 'TEST' },
    category_path: ['아우터', '후드 집업'],
    gender: ['남성', '여성'],
    price: { sale_price: 39900, final_price: 39900, normal_price: 60900, discount_rate: 34 },
    review: { total_count: 1000, satisfaction_score: 4.8, has_summary: true },
    materials: [{ dimension: '핏', selected: ['오버|사이즈'] }, { dimension: '두께', selected: ['두꺼움'] }],
    images: [{ url: 'https://example.com/hoodie.jpg' }],
    source_url: 'https://www.musinsa.com/products/1'
  },
  {
    product_id: '2',
    name_ko: '화이트 스니커즈',
    brand: { name_ko: '슈즈브랜드', name_en: 'SHOES' },
    category_path: ['신발', '스니커즈', '패션스니커즈화'],
    gender: ['남성', '여성'],
    price: { sale_price: 34900, final_price: 34900, normal_price: 79000, discount_rate: 56 },
    review: { total_count: 410, satisfaction_score: 4.8, has_summary: true },
    materials: [],
    images: [{ url: 'https://example.com/sneakers.jpg' }],
    source_url: 'https://www.musinsa.com/products/2'
  }
];

test('searchProducts ranks matching affordable products', () => {
  const results = searchProducts(products, { query: '차콜 후드집업', price_max: 50000 });
  assert.equal(results.length, 1);
  assert.equal(results[0].product_id, '1');
});

test('parseShoppingIntent extracts budget, category, color, and gender hints', () => {
  const intent = parseShoppingIntent({ query: '남성 차콜 후드집업 5만원 이하 추천' });
  assert.equal(intent.budget, 50000);
  assert.ok(intent.colors.includes('차콜'));
  assert.ok(intent.categories.includes('후드집업'));
  assert.equal(intent.gender, '남성');
});

test('summarizeProduct extracts fit and risk signals', () => {
  const summary = summarizeProduct(products[0], { usual_size: 'L', fit_preference: '오버핏' });
  assert.match(summary.fit_summary, /오버/);
  assert.ok(summary.purchase_risks.some(r => r.includes('두께')));
});

test('recommend returns assistant summary, shortlist, and shopper insights', () => {
  const result = recommend(products, { query: '후드집업 5만원 이하', customer_profile: { usual_size: 'L' } });
  assert.equal(result.recommendations.length, 1);
  assert.equal(result.recommendations[0].shopper_insight.product_id, '1');
  assert.equal(result.recommendation_confidence.low_confidence, false);
  assert.equal(result.shortlist.length, 1);
  assert.match(result.assistant_summary, /상위 후보/);
});

test('compare returns a decision table and best pick', () => {
  const result = compare(products, ['1', '2']);
  assert.equal(result.comparison_table.length, 2);
  assert.ok(result.best_pick.product_id);
  assert.ok(result.decision_notes.length >= 1);
});

test('shortlist store saves, reads, dedupes, and clears session items', () => {
  const saved = saveShortlist(products, { session_id: 'test-session', product_ids: ['1', '1', '2'] });
  assert.equal(saved.session_id, 'test-session');
  assert.equal(saved.item_count, 2);
  const loaded = getShortlist('test-session');
  assert.equal(loaded.items[0].product_id, '1');
  assert.equal(loaded.items[1].product_id, '2');
  const cleared = clearShortlist('test-session');
  assert.equal(cleared.cleared, true);
  assert.equal(getShortlist('test-session').item_count, 0);
});

test('openapi includes shortlist and analytics endpoints and upgraded response fields', () => {
  const spec = readFileSync(new URL('../openapi.yaml', import.meta.url), 'utf8');
  assert.match(spec, /\/shopper\/shortlist/);
  assert.match(spec, /\/analytics\/events/);
  assert.match(spec, /\/analytics\/summary/);
  assert.match(spec, /\/analytics\/notice/);
  assert.match(spec, /\/analytics\/funnel/);
  assert.match(spec, /\/analytics\/products/);
  assert.match(spec, /\/analytics\/queries/);
  assert.match(spec, /\/analytics\/intents/);
  assert.match(spec, /\/analytics\/insights/);
  assert.match(spec, /low_confidence_recommendation/);
  assert.match(spec, /\/analytics\/export/);
  assert.match(spec, /parsed_intent/);
  assert.match(spec, /assistant_summary/);
  assert.match(spec, /comparison_table/);
});

test('telemetry sanitizes personal data and hashes session identifiers', () => {
  const query = '차콜 후드집업 추천 test@example.com 010-1234-5678 서울시 강남구 어딘가 123 주문 ABCD123456 송장 123456789012 카드 4111-1111-1111-1111 IP 127.0.0.1';
  const event = sanitizeTelemetryEvent({ event_type: 'search', session_id: 'raw-session', query });
  assert.doesNotMatch(event.query, /test@example.com/);
  assert.doesNotMatch(event.query, /010-1234-5678/);
  assert.doesNotMatch(event.query, /서울시 강남구/);
  assert.doesNotMatch(event.query, /ABCD123456/);
  assert.doesNotMatch(event.query, /4111-1111-1111-1111/);
  assert.doesNotMatch(event.query, /127\.0\.0\.1/);
  assert.notEqual(event.session_hash, 'raw-session');
  assert.equal(event.session_hash.length, 24);
  assert.match(sanitizeQuery(query), /\[email\]/);
  assert.match(sanitizeQuery(query), /\[card_or_long_number\]/);
});

test('telemetry summary calculates CTR and conversion rate', () => {
  const events = [
    sanitizeTelemetryEvent({ event_type: 'recommendation', session_id: 's1', query: '차콜 후드집업', product_ids: ['3783092'], parsed_intent: { colors: ['차콜'], categories: ['후드집업'], budget: 50000 } }),
    sanitizeTelemetryEvent({ event_type: 'product_click', session_id: 's1', clicked_product_id: '3783092', product_ids: ['3783092'] }),
    sanitizeTelemetryEvent({ event_type: 'conversion', session_id: 's1', converted_product_id: '3783092', product_ids: ['3783092'] }),
    sanitizeTelemetryEvent({ event_type: 'low_confidence_recommendation', session_id: 's2', query: '비 오는 날 남친룩', confidence: 0.2, missing_ontology_fields: ['occasion_tags', 'weather_tags'] })
  ];
  const summary = summarizeEvents(events);
  assert.equal(summary.total_events, 4);
  assert.equal(summary.funnel.click_through_rate, 1);
  assert.equal(summary.funnel.conversion_rate, 1);
  assert.equal(summary.top_converted_products[0].value, '3783092');
  assert.equal(summary.low_confidence.count, 1);
  assert.equal(summary.low_confidence.missing_ontology_fields[0].value, 'occasion_tags');
  assert.ok(summary.insights.some(insight => insight.type === 'ontology_gap'));
});

test('analytics notice explicitly excludes raw personal identifiers', () => {
  assert.match(ANALYTICS_NOTICE.message_ko, /개인식별정보를 제외/);
  assert.ok(ANALYTICS_NOTICE.not_collected.includes('raw_user_id'));
  assert.ok(ANALYTICS_NOTICE.not_collected.includes('ip_address'));
});

test('plugin manifest points to served OpenAPI and legal notice endpoints', () => {
  const manifest = JSON.parse(readFileSync(new URL('../.well-known/ai-plugin.json', import.meta.url), 'utf8'));
  assert.equal(manifest.name_for_model, 'musinsa_personal_shopper');
  assert.equal(manifest.auth.type, 'none');
  assert.match(manifest.api.url, /\/openapi\.yaml$/);
  assert.match(manifest.legal_info_url, /\/analytics\/notice$/);
});
