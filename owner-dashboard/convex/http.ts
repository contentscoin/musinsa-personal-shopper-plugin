import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/telemetry/ingest",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders() }))
});

http.route({
  path: "/telemetry/ingest",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = request.headers.get("authorization") || "";
    const expected = process.env.TELEMETRY_INGEST_SECRET;
    if (expected && auth !== `Bearer ${expected}`) {
      return json({ error: { code: "unauthorized", message: "Invalid telemetry ingest secret" } }, 401);
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return json({ error: { code: "invalid_json", message: "Request body must be valid JSON" } }, 400);
    }

    const event = body?.event;
    if (!event || typeof event !== "object") {
      return json({ error: { code: "invalid_event", message: "Body must contain an event object" } }, 400);
    }

    const result = await ctx.runMutation(api.analytics.recordEvent, event);
    return json({ ok: true, ...result });
  })
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders({ "content-type": "application/json; charset=utf-8" })
  });
}

function corsHeaders(extra: Record<string, string> = {}) {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
    "access-control-max-age": "86400",
    ...extra
  };
}

export default http;
