import { randomUUID } from 'node:crypto';
import { compactProduct, getProduct } from './productStore.mjs';

const shortlists = new Map();

export function saveShortlist(products, payload = {}) {
  const sessionId = payload.session_id || randomUUID();
  const existing = shortlists.get(sessionId) ?? { session_id: sessionId, items: [], created_at: new Date().toISOString(), updated_at: null };
  const incoming = normalizeItems(products, payload);
  const merged = dedupeByProductId([...existing.items, ...incoming]);
  const record = {
    session_id: sessionId,
    items: merged,
    created_at: existing.created_at,
    updated_at: new Date().toISOString(),
    item_count: merged.length
  };
  shortlists.set(sessionId, record);
  return record;
}

export function getShortlist(sessionId) {
  return shortlists.get(sessionId) ?? { session_id: sessionId, items: [], item_count: 0 };
}

export function clearShortlist(sessionId) {
  const existed = shortlists.delete(sessionId);
  return { session_id: sessionId, cleared: existed };
}

function normalizeItems(products, payload) {
  if (Array.isArray(payload.product_ids)) {
    return payload.product_ids.map(id => getProduct(products, id)).filter(Boolean).map(productToShortlistItem);
  }
  if (Array.isArray(payload.items)) {
    return payload.items.map(item => {
      if (item.product_id) {
        const product = getProduct(products, item.product_id);
        if (product) return { ...productToShortlistItem(product), note: item.note ?? item.reason };
      }
      return {
        product_id: String(item.product_id ?? ''),
        product_name: item.product_name ?? item.name_ko ?? '',
        price: item.price ?? null,
        reason: item.reason ?? item.note ?? '',
        url: item.url ?? item.source_url ?? '',
        image: item.image ?? item.primary_image ?? ''
      };
    }).filter(item => item.product_id);
  }
  return [];
}

function productToShortlistItem(product) {
  const compact = compactProduct(product);
  return {
    product_id: compact.product_id,
    product_name: compact.name_ko,
    brand: compact.brand?.name_ko,
    category: compact.category_path?.join(' > '),
    price: compact.price?.final_price ?? compact.price?.sale_price,
    review_count: compact.review?.total_count ?? 0,
    satisfaction_score: compact.review?.satisfaction_score ?? null,
    url: compact.source_url,
    image: compact.primary_image
  };
}

function dedupeByProductId(items) {
  const map = new Map();
  for (const item of items) map.set(String(item.product_id), item);
  return [...map.values()];
}
