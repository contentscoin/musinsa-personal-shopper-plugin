import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const source = resolve('../data/telemetry/events.jsonl');
const output = resolve('convex/seedEvents.generated.json');
const text = await readFile(source, 'utf8').catch(() => '');
const rows = text.split('\n').filter(Boolean).map(line => JSON.parse(line)).map(row => ({
  eventId: row.event_id,
  eventType: row.event_type,
  occurredAt: row.occurred_at,
  sessionHash: row.session_hash,
  userAgentFamily: row.user_agent_family,
  query: row.query,
  parsedIntent: {
    budget: row.parsed_intent?.budget,
    colors: row.parsed_intent?.colors ?? [],
    categories: row.parsed_intent?.categories ?? [],
    seasons: row.parsed_intent?.seasons ?? [],
    gender: row.parsed_intent?.gender,
    brand: row.parsed_intent?.brand
  },
  productIds: row.product_ids ?? [],
  clickedProductId: row.clicked_product_id,
  convertedProductId: row.converted_product_id,
  rank: row.rank,
  confidence: row.confidence,
  missingOntologyFields: row.missing_ontology_fields ?? [],
  source: row.source ?? 'plugin',
  metadata: row.metadata ?? {}
}));
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(rows, null, 2));
console.log(`Wrote ${rows.length} seed events to ${output}`);
