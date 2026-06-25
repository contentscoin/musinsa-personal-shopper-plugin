import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  telemetryEvents: defineTable({
    eventId: v.string(),
    eventType: v.string(),
    occurredAt: v.string(),
    sessionHash: v.string(),
    userAgentFamily: v.optional(v.string()),
    query: v.optional(v.string()),
    parsedIntent: v.optional(v.object({
      budget: v.optional(v.number()),
      colors: v.array(v.string()),
      categories: v.array(v.string()),
      seasons: v.array(v.string()),
      gender: v.optional(v.string()),
      brand: v.optional(v.string())
    })),
    productIds: v.array(v.string()),
    clickedProductId: v.optional(v.string()),
    convertedProductId: v.optional(v.string()),
    rank: v.optional(v.number()),
    confidence: v.optional(v.number()),
    missingOntologyFields: v.array(v.string()),
    consent: v.optional(v.object({
      granted: v.boolean(),
      notice_version: v.string(),
      mode: v.string()
    })),
    source: v.string(),
    metadata: v.any()
  }).index("by_event_id", ["eventId"]).index("by_type", ["eventType"]).index("by_occurred_at", ["occurredAt"]),
  auditEvents: defineTable({
    action: v.string(),
    occurredAt: v.string(),
    actor: v.string(),
    target: v.string(),
    result: v.string(),
    metadata: v.any()
  }).index("by_action", ["action"]).index("by_occurred_at", ["occurredAt"]),
  dashboardSnapshots: defineTable({
    snapshotId: v.string(),
    generatedAt: v.string(),
    totalEvents: v.number(),
    summary: v.any(),
    ownerTag: v.string()
  }).index("by_snapshot_id", ["snapshotId"]).index("by_generated_at", ["generatedAt"])
});
