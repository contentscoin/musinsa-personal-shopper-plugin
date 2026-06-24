import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const DEFAULT_EVENT_PATH = new URL('../data/telemetry/events.jsonl', import.meta.url);
const DEFAULT_SUMMARY_PATH = new URL('../data/telemetry/summary.json', import.meta.url);
const ALLOWED_EVENT_TYPES = new Set([
  'search',
  'recommendation',
  'product_click',
  'shortlist_save',
  'compare',
  'purchase_intent',
  'conversion'
]);

export const ANALYTICS_NOTICE = {
  title: 'MUSINSA Personal Shopper analytics notice',
  message_ko: '서비스 개선과 추천 품질 향상을 위해 개인식별정보를 제외한 검색어, 추천 결과, 상품 클릭, 비교, shortlist 저장, 구매전환 통계를 수집합니다. 이메일, 전화번호, 주소, 주문번호, IP, 원문 사용자 ID는 저장하지 않습니다.',
  message_en: 'To improve service quality and recommendations, this plugin collects non-PII search, recommendation, product click, comparison, shortlist, and conversion analytics. Emails, phone numbers, addresses, order IDs, IP addresses, and raw user IDs are not stored.',
  collected: ['event_type', 'sanitized_query', 'parsed_intent', 'product_ids', 'clicked_product_id', 'converted_product_id', 'rank', 'metadata.surface', 'metadata.locale'],
  not_collected: ['name', 'email', 'phone', 'address', 'order_id', 'ip_address', 'raw_user_id', 'raw_session_id'],
  owner_visibility: 'Pack owner can view sanitized event-level rows plus aggregate statistics.'
};

export async function recordTelemetryEvent(payload = {}, path = DEFAULT_EVENT_PATH) {
  const event = sanitizeTelemetryEvent(payload);
  await mkdir(dirname(path.pathname), { recursive: true });
  await appendFile(path, JSON.stringify(event) + '\n');
  return event;
}

export async function loadTelemetryEvents(path = DEFAULT_EVENT_PATH) {
  try {
    const text = await readFile(path, 'utf8');
    return text.split('\n').filter(Boolean).map(line => JSON.parse(line));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

export async function buildTelemetrySummary(path = DEFAULT_EVENT_PATH) {
  const events = await loadTelemetryEvents(path);
  const summary = summarizeEvents(events);
  await mkdir(dirname(DEFAULT_SUMMARY_PATH.pathname), { recursive: true });
  await writeFile(DEFAULT_SUMMARY_PATH, JSON.stringify(summary, null, 2));
  return summary;
}

export async function analyticsDashboard(section = 'summary') {
  const summary = await buildTelemetrySummary();
  if (section === 'funnel') return { generated_at: summary.generated_at, funnel: summary.funnel, event_counts: summary.event_counts };
  if (section === 'products') return {
    generated_at: summary.generated_at,
    top_products: summary.top_products,
    top_clicked_products: summary.top_clicked_products,
    top_converted_products: summary.top_converted_products
  };
  if (section === 'queries') return { generated_at: summary.generated_at, top_queries: summary.top_queries };
  if (section === 'intents') return { generated_at: summary.generated_at, intent_stats: summary.intent_stats };
  return summary;
}

export function sanitizeTelemetryEvent(payload = {}) {
  const eventType = ALLOWED_EVENT_TYPES.has(payload.event_type) ? payload.event_type : 'search';
  const event = {
    event_id: payload.event_id || randomUUID(),
    event_type: eventType,
    occurred_at: payload.occurred_at || new Date().toISOString(),
    session_hash: hashId(payload.session_id || payload.anonymous_id || 'anonymous'),
    user_agent_family: sanitizeText(payload.user_agent_family || payload.client || 'unknown', 80),
    query: sanitizeQuery(payload.query || ''),
    parsed_intent: sanitizeIntent(payload.parsed_intent || {}),
    product_ids: Array.isArray(payload.product_ids) ? payload.product_ids.map(String).slice(0, 20) : [],
    clicked_product_id: payload.clicked_product_id ? String(payload.clicked_product_id) : undefined,
    converted_product_id: payload.converted_product_id ? String(payload.converted_product_id) : undefined,
    rank: Number.isFinite(Number(payload.rank)) ? Number(payload.rank) : undefined,
    source: sanitizeText(payload.source || 'plugin', 80),
    metadata: sanitizeMetadata(payload.metadata || {})
  };
  return Object.fromEntries(Object.entries(event).filter(([, value]) => value !== undefined && value !== ''));
}

export function summarizeEvents(events) {
  const byType = countBy(events, e => e.event_type);
  const topQueries = topCounts(events.map(e => e.query).filter(Boolean), 20);
  const topProducts = topCounts(events.flatMap(e => e.product_ids ?? []).filter(Boolean), 20);
  const topClickedProducts = topCounts(events.map(e => e.clicked_product_id).filter(Boolean), 20);
  const topConvertedProducts = topCounts(events.map(e => e.converted_product_id).filter(Boolean), 20);
  const searchCount = events.filter(e => e.event_type === 'search' || e.event_type === 'recommendation').length;
  const clickCount = events.filter(e => e.event_type === 'product_click').length;
  const conversionCount = events.filter(e => e.event_type === 'conversion').length;
  const intentStats = {
    colors: topCounts(events.flatMap(e => e.parsed_intent?.colors ?? []), 20),
    categories: topCounts(events.flatMap(e => e.parsed_intent?.categories ?? []), 20),
    genders: topCounts(events.map(e => e.parsed_intent?.gender).filter(Boolean), 10),
    budgets: topCounts(events.map(e => e.parsed_intent?.budget).filter(Boolean).map(String), 20)
  };
  return {
    generated_at: new Date().toISOString(),
    privacy: {
      notice: ANALYTICS_NOTICE,
      personal_data_policy: 'No names, phone numbers, emails, addresses, order IDs, card numbers, tracking numbers, IP addresses, or raw user identifiers are stored. Session identifiers are SHA-256 hashed and queries are regex-sanitized before storage.',
      owner_visibility: 'Pack owner can view sanitized event-level rows plus aggregate statistics.'
    },
    total_events: events.length,
    event_counts: byType,
    funnel: {
      searches_or_recommendations: searchCount,
      product_clicks: clickCount,
      conversions: conversionCount,
      click_through_rate: safeRate(clickCount, searchCount),
      conversion_rate: safeRate(conversionCount, searchCount)
    },
    top_queries: topQueries,
    top_products: topProducts,
    top_clicked_products: topClickedProducts,
    top_converted_products: topConvertedProducts,
    intent_stats: intentStats,
    recent_events: events.slice(-50)
  };
}

export function sanitizeQuery(query) {
  return sanitizeText(String(query ?? ''), 240)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/01[016789][-\s]?\d{3,4}[-\s]?\d{4}/g, '[phone]')
    .replace(/\b\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4}\b/g, '[phone]')
    .replace(/(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)(?:특별시|광역시|특별자치시|도|특별자치도|시)?\s+[^,\n]{4,}?(?=\s+(?:주문|order|송장|tracking|invoice|카드|IP)|$)/g, '[address]')
    .replace(/(?:\d[ -]*?){13,19}/g, '[card_or_long_number]')
    .replace(/(주문|order)\s*[:#-]?\s*[A-Za-z0-9-]{6,}/gi, '$1 [order_id]')
    .replace(/(송장|tracking|invoice)\s*[:#-]?\s*[A-Za-z0-9-]{6,}/gi, '$1 [tracking_id]')
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[ip]')
    .trim();
}

function sanitizeIntent(intent) {
  return {
    budget: Number.isFinite(Number(intent.budget)) ? Number(intent.budget) : undefined,
    colors: Array.isArray(intent.colors) ? intent.colors.map(v => sanitizeText(v, 30)).slice(0, 10) : [],
    categories: Array.isArray(intent.categories) ? intent.categories.map(v => sanitizeText(v, 40)).slice(0, 10) : [],
    seasons: Array.isArray(intent.seasons) ? intent.seasons.map(v => sanitizeText(v, 20)).slice(0, 10) : [],
    gender: intent.gender ? sanitizeText(intent.gender, 20) : undefined,
    brand: intent.brand ? sanitizeText(intent.brand, 60) : undefined
  };
}

function sanitizeMetadata(metadata) {
  const allowed = {};
  for (const key of ['surface', 'locale', 'experiment', 'result_count', 'latency_ms']) {
    if (metadata[key] !== undefined) allowed[key] = typeof metadata[key] === 'number' ? metadata[key] : sanitizeText(metadata[key], 80);
  }
  return allowed;
}

function sanitizeText(text, maxLength) {
  return String(text ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').slice(0, maxLength).trim();
}

function hashId(value) {
  return createHash('sha256').update(String(value)).digest('hex').slice(0, 24);
}

function countBy(items, fn) {
  return Object.fromEntries(topCounts(items.map(fn).filter(Boolean), 100).map(row => [row.value, row.count]));
}

function topCounts(values, limit) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))).slice(0, limit).map(([value, count]) => ({ value, count }));
}

function safeRate(numerator, denominator) {
  return denominator ? Number((numerator / denominator).toFixed(4)) : 0;
}
