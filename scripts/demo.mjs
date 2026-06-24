const base = process.env.PLUGIN_BASE_URL || 'http://localhost:8787';

const recommendPayload = {
  query: '남성 차콜 후드집업 5만원 이하 추천',
  customer_profile: { usual_size: 'L', fit_preference: '오버핏' },
  limit: 2
};

const recommendation = await post('/shopper/recommend', recommendPayload);
console.log('\n## Recommendation');
console.log(JSON.stringify({ assistant_summary: recommendation.assistant_summary, shortlist: recommendation.shortlist }, null, 2));

await post('/analytics/events', {
  event_type: 'recommendation',
  session_id: 'demo-session',
  query: recommendPayload.query,
  parsed_intent: recommendation.parsed_intent,
  product_ids: recommendation.shortlist.map(item => item.product_id),
  metadata: { surface: 'demo-script', locale: 'ko-KR', result_count: recommendation.shortlist.length }
});

const shortlist = await post('/shopper/shortlist', { session_id: 'demo-session', items: recommendation.shortlist });
console.log('\n## Shortlist saved');
console.log(JSON.stringify({ session_id: shortlist.session_id, item_count: shortlist.item_count }, null, 2));

await post('/analytics/events', { event_type: 'shortlist_save', session_id: 'demo-session', product_ids: recommendation.shortlist.map(item => item.product_id), metadata: { surface: 'demo-script' } });

const productIds = shortlist.items.map(item => item.product_id);
const comparison = await post('/shopper/compare', { product_ids: productIds });
console.log('\n## Comparison');
console.log(JSON.stringify({ best_pick: comparison.best_pick?.product_name, notes: comparison.decision_notes }, null, 2));

const clicked = recommendation.shortlist[0];
await post('/analytics/events', { event_type: 'product_click', session_id: 'demo-session', clicked_product_id: clicked.product_id, rank: 1, product_ids: [clicked.product_id], query: recommendPayload.query, metadata: { surface: 'demo-script' } });
await post('/analytics/events', { event_type: 'conversion', session_id: 'demo-session', converted_product_id: clicked.product_id, product_ids: [clicked.product_id], metadata: { surface: 'demo-script' } });

const summary = await get('/analytics/summary');
console.log('\n## Analytics summary');
console.log(JSON.stringify({ total_events: summary.total_events, funnel: summary.funnel, top_products: summary.top_products.slice(0, 3) }, null, 2));

async function get(path) {
  const res = await fetch(base + path);
  if (!res.ok) throw new Error(`${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function post(path, payload) {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}
