#!/usr/bin/env node
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const UA = 'ChatGPT-User';
const ROBOTS_URL = 'https://www.musinsa.com/robots.txt';
const SITEMAP_URL = 'https://www.musinsa.com/static/sitemap/sitemap-goods-1.xml';

const args = parseArgs(process.argv.slice(2));
const max = Number(args.max ?? 5);
const outPath = args.out ?? 'data/products.crawled.json';
const ontologyPath = args.ontology ?? 'docs/ontology/musinsa-product-ontology-sample.md';
const delayMs = Number(args.delay ?? 600);

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) result[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return result;
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,application/xml,*/*' } });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} ${res.statusText}: ${url}`);
  return await res.text();
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function assertRobotsAllows(robotsText) {
  if (!robotsText.includes('User-agent: ChatGPT-User') || !robotsText.includes('Allow: /')) {
    throw new Error('robots.txt does not explicitly allow ChatGPT-User. Stop crawling.');
  }
}

function extractSitemapEntries(xml, limit) {
  const urlBlocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(m => m[1]);
  return urlBlocks.slice(0, limit).map(block => ({
    url: textBetween(block, '<loc>', '</loc>'),
    lastmod: textBetween(block, '<lastmod>', '</lastmod>'),
    image: textBetween(block, '<image:loc>', '</image:loc>'),
    imageTitle: textBetween(block, '<image:title>', '</image:title>')
  }));
}

function textBetween(source, start, end) {
  const i = source.indexOf(start);
  if (i < 0) return '';
  const j = source.indexOf(end, i + start.length);
  if (j < 0) return '';
  return decodeXml(source.slice(i + start.length, j).trim());
}

function decodeXml(s) {
  return s.replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&#39;', "'");
}

function extractNextData(html) {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('Missing __NEXT_DATA__ script');
  return JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&'));
}

function absImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('/images/')) return `https://image.msscdn.net${url}`;
  return url;
}

function selectedMaterialSignals(goodsMaterial) {
  const signals = [];
  for (const group of goodsMaterial?.materials ?? []) {
    const selected = (group.items ?? []).filter(i => i.isSelected).map(i => i.name);
    if (selected.length) signals.push({ dimension: group.name, selected });
  }
  return signals;
}

function productToOntology(raw, sourceUrl, sitemapEntry) {
  const data = raw?.props?.pageProps?.meta?.data;
  if (!data) throw new Error('Missing product meta data');
  const category = data.category ?? {};
  const brand = data.brandInfo ?? {};
  const price = data.goodsPrice ?? {};
  const review = data.goodsReview ?? {};
  const images = (data.goodsImages ?? []).map((img, index) => ({
    role: index === 0 ? 'primary_or_detail' : 'detail',
    url: absImageUrl(img.imageUrl),
    source: 'product_page'
  }));
  if (sitemapEntry.image) images.unshift({ role: 'sitemap_thumbnail', url: sitemapEntry.image, title: sitemapEntry.imageTitle, source: 'sitemap' });
  const categoryPath = [category.categoryDepth1Name, category.categoryDepth2Name, category.categoryDepth3Name, category.categoryDepth4Name].filter(Boolean);
  const productId = String(data.goodsNo);
  const product = {
    product_id: productId,
    source_url: sourceUrl,
    crawled_at: new Date().toISOString(),
    name_ko: data.goodsNm ?? '',
    name_en: data.goodsNmEng ?? '',
    product_number: data.styleNo ?? '',
    gender: data.sex ?? [],
    season: data.season ?? '',
    brand: {
      code: data.brand ?? brand.brand ?? '',
      name_ko: brand.brandName ?? '',
      name_en: brand.brandEnglishName ?? '',
      nation: brand.brandNationName ?? '',
      is_exclusive: Boolean(brand.isBrandExclusive)
    },
    category_path: categoryPath,
    category_codes: {
      depth1: category.categoryDepth1Code ?? '', depth2: category.categoryDepth2Code ?? '', depth3: category.categoryDepth3Code ?? '', depth4: category.categoryDepth4Code ?? ''
    },
    price: {
      sale_price: price.salePrice ?? null,
      normal_price: price.normalPrice ?? null,
      discount_rate: price.discountRate ?? null,
      coupon_price: price.couponPrice ?? null,
      final_price: price.finalPrice ?? null,
      is_sale: Boolean(price.isSale)
    },
    review: {
      total_count: review.totalCount ?? 0,
      satisfaction_score: review.satisfactionScore ?? null,
      has_summary: Boolean(review.hasSummary)
    },
    materials: selectedMaterialSignals(data.goodsMaterial),
    logistics: (data.goodsLogisticsInfoV2 ?? []).slice(0, 2).map(info => ({
      default_release_period: info.defaultReleasePeriod ?? null,
      overseas_delivery: Boolean(info.isOverseasDelivery),
      return_courier: info.returnShippingCourierName ?? '',
      return_address_city: info.returnShippingAddress ?? ''
    })),
    benefits: (data.goodsDetailBanner?.benefitBanner ?? []).slice(0, 3).map(b => ({ title: b.bannerTitle ?? b.name ?? '', display_type: b.displayType ?? '' })),
    images,
    ontology_triples: []
  };
  product.ontology_triples = buildTriples(product);
  return product;
}

function buildTriples(p) {
  const s = `MUSINSA product ${p.product_id}`;
  const triples = [
    [s, 'has_name', p.name_ko],
    [s, 'belongs_to_brand', p.brand.name_ko || p.brand.code],
    [s, 'belongs_to_category', p.category_path.join(' > ')],
    [s, 'has_sale_price', String(p.price.sale_price ?? '')],
    [s, 'has_review_count', String(p.review.total_count ?? 0)],
    [s, 'has_satisfaction_score', String(p.review.satisfaction_score ?? '')],
    [s, 'has_product_url', p.source_url]
  ];
  for (const signal of p.materials) triples.push([s, `has_material_signal_${signal.dimension}`, signal.selected.join(', ')]);
  for (const img of p.images.slice(0, 3)) triples.push([s, 'has_image', img.url]);
  return triples.filter(t => t[2]);
}

function ontologyMarkdown(products) {
  const lines = [];
  lines.push('# MUSINSA Product Ontology Crawl Sample');
  lines.push('');
  lines.push('Owner tag: hermes-profile:paperclipbase');
  lines.push('Pack intent: musinsa-product-db-personal-shopper-sample');
  lines.push(`Created at: ${new Date().toISOString()}`);
  lines.push('Source boundary: public MUSINSA sitemap/product pages fetched with User-Agent ChatGPT-User after robots.txt allow check. Production should use official API/feed authorization.');
  lines.push('');
  lines.push('## Products');
  for (const p of products) {
    lines.push(`\n### ${p.name_ko}`);
    lines.push(`- Product ID: ${p.product_id}`);
    lines.push(`- Source URL: ${p.source_url}`);
    lines.push(`- Brand: ${p.brand.name_ko} (${p.brand.name_en})`);
    lines.push(`- Category: ${p.category_path.join(' > ')}`);
    lines.push(`- Gender: ${(p.gender ?? []).join(', ')}`);
    lines.push(`- Price: sale ${p.price.sale_price}, normal ${p.price.normal_price}, discount ${p.price.discount_rate}%`);
    lines.push(`- Review: ${p.review.total_count} reviews, satisfaction ${p.review.satisfaction_score}, has_summary=${p.review.has_summary}`);
    lines.push(`- Material/Fit signals: ${p.materials.map(m => `${m.dimension}=${m.selected.join('/')}`).join('; ')}`);
    lines.push(`- Primary image: ${p.images[0]?.url ?? ''}`);
    lines.push('- Ontology triples:');
    for (const [subj, pred, obj] of p.ontology_triples) lines.push(`  - ${subj} -> ${pred} -> ${obj}`);
  }
  lines.push('\n## Claims not verified');
  lines.push('- This sample does not include private inventory, cart, order, payment, or authenticated user data.');
  lines.push('- Review text is not crawled in this MVP; only public aggregate review signals and product material labels are used.');
  return lines.join('\n');
}

async function main() {
  console.log(`Checking robots: ${ROBOTS_URL}`);
  const robots = await fetchText(ROBOTS_URL);
  assertRobotsAllows(robots);
  console.log(`Fetching sitemap: ${SITEMAP_URL}`);
  const sitemap = await fetchText(SITEMAP_URL);
  const entries = extractSitemapEntries(sitemap, max);
  const products = [];
  const failures = [];
  for (const entry of entries) {
    console.log(`Crawling ${entry.url}`);
    await sleep(delayMs);
    try {
      const html = await fetchText(entry.url);
      const nextData = extractNextData(html);
      products.push(productToOntology(nextData, entry.url, entry));
    } catch (error) {
      failures.push({ url: entry.url, error: error.message });
      console.warn(`Skipping ${entry.url}: ${error.message}`);
    }
  }
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify({ crawler: { user_agent: UA, source_sitemap: SITEMAP_URL, robots_url: ROBOTS_URL, attempted: entries.length, succeeded: products.length, failed: failures.length, failures }, products }, null, 2));
  await mkdir(dirname(ontologyPath), { recursive: true });
  await writeFile(ontologyPath, ontologyMarkdown(products));
  console.log(`Wrote ${products.length} products to ${outPath}`);
  console.log(`Wrote ontology markdown to ${ontologyPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });
