import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { buildTelemetrySummary, loadTelemetryEvents } from '../src/telemetryStore.mjs';

const out = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : 'docs/ontology/personal-shopper-data-ontology.md';
const summary = await buildTelemetrySummary();
const events = await loadTelemetryEvents();

const lines = [];
lines.push('# MUSINSA Personal Shopper Data Ontology Pack');
lines.push('');
lines.push('Owner tag: hermes-profile:paperclipbase');
lines.push('Pack intent: personal-shopper-data');
lines.push(`Generated at: ${summary.generated_at}`);
lines.push('');
lines.push('## Privacy boundary');
lines.push('- No names, phone numbers, emails, addresses, order IDs, IP addresses, or raw user identifiers are stored.');
lines.push('- Session identifiers are SHA-256 hashed and truncated.');
lines.push('- Queries are regex-sanitized before storage.');
lines.push('- Pack owner can view sanitized event-level rows plus aggregate statistics.');
lines.push('');
lines.push('## Funnel metrics');
lines.push(`- Total events: ${summary.total_events}`);
lines.push(`- Searches/recommendations: ${summary.funnel.searches_or_recommendations}`);
lines.push(`- Product clicks: ${summary.funnel.product_clicks}`);
lines.push(`- Conversions: ${summary.funnel.conversions}`);
lines.push(`- Click-through rate: ${summary.funnel.click_through_rate}`);
lines.push(`- Conversion rate: ${summary.funnel.conversion_rate}`);
lines.push('');
lines.push('## Event counts');
for (const [type, count] of Object.entries(summary.event_counts)) lines.push(`- ${type}: ${count}`);
lines.push('');
writeTop(lines, 'Top queries', summary.top_queries);
writeTop(lines, 'Top products', summary.top_products);
writeTop(lines, 'Top clicked products', summary.top_clicked_products);
writeTop(lines, 'Top converted products', summary.top_converted_products);
writeTop(lines, 'Top colors', summary.intent_stats.colors);
writeTop(lines, 'Top categories', summary.intent_stats.categories);
writeTop(lines, 'Top budgets', summary.intent_stats.budgets);
lines.push('## Sanitized event rows');
lines.push('| occurred_at | event_type | session_hash | query | product_ids | clicked_product_id | converted_product_id | rank | source |');
lines.push('|---|---|---|---|---|---|---|---:|---|');
for (const e of events.slice(-500)) {
  lines.push(`| ${esc(e.occurred_at)} | ${esc(e.event_type)} | ${esc(e.session_hash)} | ${esc(e.query)} | ${esc((e.product_ids ?? []).join(','))} | ${esc(e.clicked_product_id ?? '')} | ${esc(e.converted_product_id ?? '')} | ${e.rank ?? ''} | ${esc(e.source)} |`);
}
lines.push('');
lines.push('## Ontology triples');
lines.push('- PersonalShopperDataPack -> has_owner_tag -> hermes-profile:paperclipbase');
lines.push('- PersonalShopperDataPack -> has_privacy_policy -> sanitized_non_pii_events_only');
lines.push(`- PersonalShopperDataPack -> has_total_events -> ${summary.total_events}`);
lines.push(`- PersonalShopperDataPack -> has_click_through_rate -> ${summary.funnel.click_through_rate}`);
lines.push(`- PersonalShopperDataPack -> has_conversion_rate -> ${summary.funnel.conversion_rate}`);
for (const q of summary.top_queries.slice(0, 10)) lines.push(`- PersonalShopperDataPack -> has_top_query -> ${q.value} (${q.count})`);
for (const p of summary.top_products.slice(0, 10)) lines.push(`- PersonalShopperDataPack -> has_top_product -> ${p.value} (${p.count})`);

await mkdir(dirname(out), { recursive: true });
await writeFile(out, lines.join('\n'));
console.log(JSON.stringify({ out, total_events: summary.total_events, ctr: summary.funnel.click_through_rate, conversion_rate: summary.funnel.conversion_rate }, null, 2));

function writeTop(lines, title, rows) {
  lines.push(`## ${title}`);
  if (!rows.length) lines.push('- none');
  for (const row of rows) lines.push(`- ${row.value}: ${row.count}`);
  lines.push('');
}

function esc(value) {
  return String(value ?? '').replaceAll('|', '/').replaceAll('\n', ' ');
}
