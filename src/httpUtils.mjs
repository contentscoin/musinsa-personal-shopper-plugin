export class HttpError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const DEFAULT_MAX_JSON_BYTES = Number(process.env.MAX_JSON_BODY_BYTES ?? 262_144);

export function corsHeaders(extra = {}) {
  return {
    'access-control-allow-origin': process.env.CORS_ALLOW_ORIGIN ?? '*',
    'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization,x-requested-with',
    'access-control-max-age': '86400',
    ...extra
  };
}

export async function readJsonBody(req, { maxBytes = DEFAULT_MAX_JSON_BYTES } = {}) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      throw new HttpError(413, 'payload_too_large', `JSON request body exceeds ${maxBytes} bytes`);
    }
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
      throw new HttpError(400, 'invalid_json_object', 'JSON request body must be an object');
    }
    return parsed;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'invalid_json', 'Request body must be valid JSON');
  }
}

export function safeErrorPayload(error) {
  const status = Number(error?.status ?? 500);
  const code = typeof error?.code === 'string' ? error.code : status >= 500 ? 'internal_error' : 'request_error';
  const message = status >= 500 ? 'Internal server error' : String(error?.message ?? 'Request failed');
  return {
    error: {
      code,
      message,
      ...(error?.details ? { details: error.details } : {})
    }
  };
}
