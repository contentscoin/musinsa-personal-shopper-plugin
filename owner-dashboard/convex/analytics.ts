import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const eventArg = v.object({
  eventId: v.optional(v.string()),
  eventType: v.string(),
  occurredAt: v.optional(v.string()),
  sessionHash: v.optional(v.string()),
  userAgentFamily: v.optional(v.string()),
  query: v.optional(v.string()),
  parsedIntent: v.optional(v.object({
    budget: v.optional(v.number()),
    colors: v.optional(v.array(v.string())),
    categories: v.optional(v.array(v.string())),
    seasons: v.optional(v.array(v.string())),
    gender: v.optional(v.string()),
    brand: v.optional(v.string())
  })),
  productIds: v.optional(v.array(v.string())),
  clickedProductId: v.optional(v.string()),
  convertedProductId: v.optional(v.string()),
  rank: v.optional(v.number()),
  confidence: v.optional(v.number()),
  missingOntologyFields: v.optional(v.array(v.string())),
  source: v.optional(v.string()),
  metadata: v.optional(v.any())
});

export const recordEvent = mutation({
  args: eventArg,
  handler: async (ctx, args) => {
    const event = normalizeEvent(args);
    const existing = await ctx.db.query("telemetryEvents").withIndex("by_event_id", q => q.eq("eventId", event.eventId)).first();
    if (existing) return { inserted: false, id: existing._id };
    const id = await ctx.db.insert("telemetryEvents", event);
    return { inserted: true, id };
  }
});

export const seedEvents = mutation({
  args: { events: v.array(eventArg) },
  handler: async (ctx, args) => {
    let inserted = 0;
    let skipped = 0;
    for (const raw of args.events) {
      const event = normalizeEvent(raw);
      const existing = await ctx.db.query("telemetryEvents").withIndex("by_event_id", q => q.eq("eventId", event.eventId)).first();
      if (existing) { skipped++; continue; }
      await ctx.db.insert("telemetryEvents", event);
      inserted++;
    }
    return { inserted, skipped };
  }
});

export const summary = query({
  args: { range: v.optional(v.union(v.literal("all"), v.literal("7d"), v.literal("24h"))) },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("telemetryEvents").withIndex("by_occurred_at").collect();
    const cutoff = cutoffFor(args.range ?? "all");
    const events = cutoff ? all.filter(e => Date.parse(e.occurredAt) >= cutoff) : all;
    return buildSummary(events);
  }
});

export const recentEvents = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
    const rows = await ctx.db.query("telemetryEvents").withIndex("by_occurred_at").order("desc").take(limit);
    return rows;
  }
});

export const createSnapshot = mutation({
  args: { ownerTag: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const events = await ctx.db.query("telemetryEvents").collect();
    const summary = buildSummary(events);
    const snapshotId = `musinsa-owner-dashboard-${Date.now()}`;
    const id = await ctx.db.insert("dashboardSnapshots", {
      snapshotId,
      generatedAt: new Date().toISOString(),
      totalEvents: summary.totalEvents,
      summary,
      ownerTag: args.ownerTag ?? "hermes-profile:paperclipbase"
    });
    return { id, snapshotId, summary };
  }
});

function normalizeEvent(raw: any) {
  const now = new Date().toISOString();
  const productIds = Array.isArray(raw.productIds) ? raw.productIds.map(String).slice(0, 20) : [];
  return {
    eventId: raw.eventId ?? crypto.randomUUID(),
    eventType: sanitize(raw.eventType || "search", 60),
    occurredAt: raw.occurredAt ?? now,
    sessionHash: sanitize(raw.sessionHash || "anonymous", 80),
    userAgentFamily: sanitize(raw.userAgentFamily || "unknown", 80),
    query: raw.query ? sanitize(raw.query, 240) : undefined,
    parsedIntent: {
      budget: typeof raw.parsedIntent?.budget === "number" ? raw.parsedIntent.budget : undefined,
      colors: arrayStrings(raw.parsedIntent?.colors, 10),
      categories: arrayStrings(raw.parsedIntent?.categories, 10),
      seasons: arrayStrings(raw.parsedIntent?.seasons, 10),
      gender: raw.parsedIntent?.gender ? sanitize(raw.parsedIntent.gender, 30) : undefined,
      brand: raw.parsedIntent?.brand ? sanitize(raw.parsedIntent.brand, 80) : undefined
    },
    productIds,
    clickedProductId: raw.clickedProductId ? String(raw.clickedProductId) : undefined,
    convertedProductId: raw.convertedProductId ? String(raw.convertedProductId) : undefined,
    rank: typeof raw.rank === "number" ? raw.rank : undefined,
    confidence: typeof raw.confidence === "number" ? raw.confidence : undefined,
    missingOntologyFields: arrayStrings(raw.missingOntologyFields, 20),
    source: sanitize(raw.source || "owner-dashboard", 80),
    metadata: raw.metadata ?? {}
  };
}

function buildSummary(events: any[]) {
  const eventCounts = Object.fromEntries(topCounts(events.map(e => e.eventType), 100).map(x => [x.value, x.count]));
  const searchesOrRecommendations = events.filter(e => ["search", "recommendation"].includes(e.eventType)).length;
  const productClicks = events.filter(e => e.eventType === "product_click").length;
  const conversions = events.filter(e => e.eventType === "conversion").length;
  const topQueries = topCounts(events.map(e => e.query).filter(Boolean), 20);
  const topProducts = topCounts(events.flatMap(e => e.productIds ?? []), 20);
  const topClickedProducts = topCounts(events.map(e => e.clickedProductId).filter(Boolean), 20);
  const topConvertedProducts = topCounts(events.map(e => e.convertedProductId).filter(Boolean), 20);
  const lowConfidenceEvents = events.filter(e => e.eventType === "low_confidence_recommendation");
  const intentStats = {
    colors: topCounts(events.flatMap(e => e.parsedIntent?.colors ?? []), 20),
    categories: topCounts(events.flatMap(e => e.parsedIntent?.categories ?? []), 20),
    genders: topCounts(events.map(e => e.parsedIntent?.gender).filter(Boolean), 10),
    budgets: topCounts(events.map(e => e.parsedIntent?.budget).filter(Boolean).map(String), 20)
  };
  const funnel = { searchesOrRecommendations, productClicks, conversions, clickThroughRate: rate(productClicks, searchesOrRecommendations), conversionRate: rate(conversions, searchesOrRecommendations) };
  return {
    generatedAt: new Date().toISOString(),
    totalEvents: events.length,
    eventCounts,
    funnel,
    topQueries,
    topProducts,
    topClickedProducts,
    topConvertedProducts,
    intentStats,
    lowConfidence: {
      count: lowConfidenceEvents.length,
      rate: rate(lowConfidenceEvents.length, searchesOrRecommendations),
      missingOntologyFields: topCounts(lowConfidenceEvents.flatMap(e => e.missingOntologyFields ?? []), 20)
    },
    insights: buildInsights({ topQueries, topProducts, topClickedProducts, topConvertedProducts, intentStats, funnel, lowConfidenceEvents })
  };
}

function buildInsights({ topQueries, topProducts, topClickedProducts, topConvertedProducts, intentStats, funnel, lowConfidenceEvents }: any) {
  const insights = [];
  if (funnel.searchesOrRecommendations) insights.push({ type: "funnel_health", summary: `검색/추천 ${funnel.searchesOrRecommendations}건 기준 CTR ${funnel.clickThroughRate}, CVR ${funnel.conversionRate}입니다.`, evidence: funnel });
  if (topQueries[0]) insights.push({ type: "top_query_pattern", summary: `가장 많이 관찰된 질문 패턴은 "${topQueries[0].value}"입니다.`, evidence: topQueries[0] });
  if (topProducts[0]) insights.push({ type: "top_product_interest", summary: `가장 많이 노출/관심을 받은 상품 ID는 ${topProducts[0].value}입니다.`, evidence: topProducts[0] });
  if (topClickedProducts[0] && topConvertedProducts[0] && topClickedProducts[0].value === topConvertedProducts[0].value) insights.push({ type: "high_conversion_product", summary: `상품 ${topClickedProducts[0].value}는 클릭과 전환 양쪽에서 상위라 캠페인 후보입니다.`, evidence: { clicked: topClickedProducts[0], converted: topConvertedProducts[0] } });
  if (intentStats.colors[0]) insights.push({ type: "color_demand", summary: `현재 AI 쇼핑 질문에서 ${intentStats.colors[0].value} 색상 수요가 가장 높습니다.`, evidence: intentStats.colors[0] });
  if (intentStats.categories[0]) insights.push({ type: "category_demand", summary: `현재 AI 쇼핑 질문에서 ${intentStats.categories[0].value} 카테고리 수요가 가장 높습니다.`, evidence: intentStats.categories[0] });
  if (lowConfidenceEvents.length) insights.push({ type: "ontology_gap", summary: `추천 신뢰도가 낮은 질문 ${lowConfidenceEvents.length}건이 있어 상품 태그/상황/핏 온톨로지 보강이 필요합니다.`, evidence: { count: lowConfidenceEvents.length } });
  return insights;
}

function cutoffFor(range: string) {
  if (range === "24h") return Date.now() - 24 * 60 * 60 * 1000;
  if (range === "7d") return Date.now() - 7 * 24 * 60 * 60 * 1000;
  return null;
}
function topCounts(values: string[], limit: number) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([value, count]) => ({ value, count }));
}
function rate(num: number, den: number) { return den ? Number((num / den).toFixed(4)) : 0; }
function sanitize(text: string, max: number) { return String(text ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").slice(0, max).trim(); }
function arrayStrings(values: unknown, limit: number) { return Array.isArray(values) ? values.map(v => sanitize(String(v), 80)).filter(Boolean).slice(0, limit) : []; }
