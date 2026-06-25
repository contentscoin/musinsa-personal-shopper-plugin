import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { Readable } from 'node:stream';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { HttpError, readJsonBody, safeErrorPayload } from '../src/httpUtils.mjs';
import { recordTelemetryEvent, sanitizeTelemetryEvent } from '../src/telemetryStore.mjs';

function reqFrom(text) {
  return Readable.from([Buffer.from(text)]);
}

test('readJsonBody rejects invalid JSON with safe 400 error', async () => {
  await assert.rejects(() => readJsonBody(reqFrom('{bad')), (error) => {
    assert.equal(error.status, 400);
    assert.equal(error.code, 'invalid_json');
    assert.deepEqual(safeErrorPayload(error), { error: { code: 'invalid_json', message: 'Request body must be valid JSON' } });
    return true;
  });
});

test('readJsonBody rejects oversized JSON body', async () => {
  await assert.rejects(() => readJsonBody(reqFrom('{"x":"123456"}'), { maxBytes: 8 }), (error) => {
    assert.equal(error.status, 413);
    assert.equal(error.code, 'payload_too_large');
    return true;
  });
});

test('safeErrorPayload masks internal server errors', () => {
  const payload = safeErrorPayload(new Error('secret stack path /tmp/token'));
  assert.equal(payload.error.code, 'internal_error');
  assert.equal(payload.error.message, 'Internal server error');
});

test('sanitizeTelemetryEvent records consent metadata without storing raw session id', () => {
  const event = sanitizeTelemetryEvent({ event_type: 'search', session_id: 'raw-session', query: '후드집업', consent_granted: true });
  assert.equal(event.consent.granted, true);
  assert.match(event.consent.notice_version, /^2026-06-25/);
  assert.notEqual(event.session_hash, 'raw-session');
});

test('recordTelemetryEvent syncs sanitized event to configured Convex ingest URL', async () => {
  const received = [];
  const server = http.createServer(async (req, res) => {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    received.push({ headers: req.headers, body: JSON.parse(raw) });
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ inserted: true, id: 'mock-convex-id' }));
  });
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const dir = await mkdtemp(join(tmpdir(), 'musinsa-telemetry-'));
  const path = pathToFileURL(join(dir, 'events.jsonl'));
  const oldUrl = process.env.CONVEX_TELEMETRY_URL;
  const oldSecret = process.env.CONVEX_TELEMETRY_SECRET;
  process.env.CONVEX_TELEMETRY_URL = `http://127.0.0.1:${port}/telemetry/ingest`;
  process.env.CONVEX_TELEMETRY_SECRET = 'test-secret';
  try {
    const { recordTelemetryEvent: freshRecordTelemetryEvent } = await import(`../src/telemetryStore.mjs?sync-test=${Date.now()}`);
    const event = await freshRecordTelemetryEvent({ event_type: 'recommendation', session_id: 's1', query: 'test@example.com 차콜 후드집업', product_ids: ['1'], consent_granted: true }, path);
    assert.equal(event.convex_sync.ok, true);
    assert.equal(event.convex_sync.inserted, true);
    assert.equal(received.length, 1);
    assert.equal(received[0].headers.authorization, 'Bearer test-secret');
    assert.equal(received[0].body.event.eventType, 'recommendation');
    assert.match(received[0].body.event.query, /\[email\]/);
    const lines = (await readFile(path, 'utf8')).trim().split('\n');
    assert.equal(lines.length, 1);
  } finally {
    process.env.CONVEX_TELEMETRY_URL = oldUrl;
    process.env.CONVEX_TELEMETRY_SECRET = oldSecret;
    await new Promise(resolve => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  }
});
