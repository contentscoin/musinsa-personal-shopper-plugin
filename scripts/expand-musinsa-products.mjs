#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const UA = 'ChatGPT-User';
const ROBOTS_URL = 'https://www.musinsa.com/robots.txt';
const GOODS_SITEMAP_PREFIX = 'https://www.musinsa.com/static/sitemap/sitemap-goods-';

const args = parseArgs(process.argv.slice(2));
const target = Number(args.target ?? 2000);
const outPath = args.out ?? 'data/products.crawled.json';
const ontologyPath = args.ontology ?? 'docs/ontology/musinsa-product-ontology-sample.md';
const reportPath = args.report ?? 'docs/ontology/musinsa-product-crawl-expansion-report.md';
const delayMs = Number(args.delay ?? 1100);
const retryCount = Number(args.retries ?? 3);
const maxSitemaps = Number(args.maxSitemaps ?? 80);
const checkpointEvery = Number(args.checkpointEvery ?? 25);
const maxAttempts = Number(args.maxAttempts ?? target * 3);

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) result[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return result;
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function fetchText(url, attempts = retryCount + 1) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error(`Fetch timeout: ${url}`)), 20000);
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,application/xml,*/*' }, signal: controller.signal });
    if (!res.ok) {
      if ((res.status === 429 || res.status >= 500) && attempts > 1) {
        const backoffMs = (retryCount + 2 - attempts) * delayMs + 2500;
        console.warn(`Backoff ${backoffMs}ms for ${res.status} ${url}`);
        await sleep(backoffMs);
        return fetchText(url, attempts - 1);
      }
      throw new Error(`Fetch failed ${res.status} ${res.statusText}: ${url}`);
    }
    return await res.text();
  } catch (error) {
    if (attempts > 1) {
      const backoffMs = (retryCount + 2 - attempts) * delayMs + 2500;
      console.warn(`Backoff ${backoffMs}ms for ${error.message}: ${url}`);
      await sleep(backoffMs);
      return fetchText(url, attempts - 1);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function assertRobotsAllows(robotsText) {
  if (!robotsText.includes('User-agent: ChatGPT-User') || !robotsText.includes('Allow: /')) {
    throw new Error('robots.txt does not explicitly allow ChatGPT-User. Stop crawling.');
  }
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

function extractSitemapEntries(xml) {
  const urlBlocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(m => m[1]);
  return urlBlocks.map(block => ({
    url: textBetween(block, '<loc>', '</loc>'),
    lastmod: textBetween(block, '<lastmod>', '</lastmod>'),
    image: textBetween(block, '<image:loc>', '</image:loc>'),
    imageTitle: textBetween(block, '<image:title>', '</image:title>')
  })).filter(e => /\/products\/\d+/.test(e.url));
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
      depth1: category.categoryDepth1Code ?? '',
      depth2: category.categoryDepth2Code ?? '',
      depth3: category.categoryDepth3Code ?? '',
      depth4: category.categoryDepth4Code ?? ''
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

async function loadExisting(path) {
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8'));
    return { parsed, products: Array.isArray(parsed.products) ? parsed.products : [] };
  } catch {
    return { parsed: {}, products: [] };
  }
}

async function collectEntries(existingIds) {
  const entries = [];
  const seen = new Set();
  let consecutiveMissing = 0;
  for (let i = 1; i <= maxSitemaps && consecutiveMissing < 5; i += 1) {
    const url = `${GOODS_SITEMAP_PREFIX}${i}.xml`;
    try {
      const xml = await fetchText(url, 2);
      const sitemapEntries = extractSitemapEntries(xml);
      console.log(`Sitemap ${i}: ${sitemapEntries.length} product URLs`);
      for (const entry of sitemapEntries) {
        const id = entry.url.match(/\/products\/(\d+)/)?.[1];
        if (!id || existingIds.has(id) || seen.has(id)) continue;
        seen.add(id);
        entries.push(entry);
      }
      consecutiveMissing = 0;
      if (entries.length >= maxAttempts) break;
    } catch (error) {
      console.warn(`Skipping sitemap ${i}: ${error.message}`);
      consecutiveMissing += 1;
    }
  }
  return entries;
}

async function saveDataset(products, crawler) {
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify({ crawler, products }, null, 2));
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
  lines.push('## Summary');
  lines.push(`- Products: ${products.length}`);
  lines.push(`- Brands: ${new Set(products.map(p => p.brand?.name_ko || p.brand?.code).filter(Boolean)).size}`);
  lines.push(`- Category paths: ${new Set(products.map(p => (p.category_path ?? []).join(' > ')).filter(Boolean)).size}`);
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
  return lines.join('\n') + '\n';
}

function topCounts(values, limit = 30) {
  const counts = new Map();
  for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))).slice(0, limit);
}

function renderReport(products, crawler) {
  const categories = topCounts(products.map(p => (p.category_path ?? []).join(' > ')), 80);
  const brands = new Set(products.map(p => p.brand?.name_ko || p.brand?.code).filter(Boolean));
  const lines = [
    '# MUSINSA Product Ontology Expansion Report',
    '',
    'Owner tag: hermes-profile:paperclipbase',
    'Purpose: expand MUSINSA public product sample ontology to 2,000+ products before plugin testing.',
    `Created at: ${new Date().toISOString()}`,
    '',
    '## Crawl boundary',
    '- Source: MUSINSA public product sitemap/product pages.',
    '- User-Agent: ChatGPT-User, after robots.txt allow check.',
    '- No login, cart, order, payment, account, personalized, or private data collected.',
    '- Production boundary: use official/authorized MUSINSA feed/API for real service operation.',
    '',
    '## Result summary',
    `- Products in local ontology JSON: ${products.length}`,
    `- Distinct brands: ${brands.size}`,
    `- Distinct category paths: ${categories.length}`,
    `- Last crawl attempted product pages: ${crawler.attempted}`,
    `- Last crawl new successes: ${crawler.succeeded_this_run}`,
    `- Last crawl failed product pages: ${crawler.failed}`,
    '',
    '## Top category paths',
    ...categories.map(([k, v]) => `- ${k}: ${v}`),
    '',
    '## Representative product facts',
    ...products.slice(0, 80).map(p => `- ${p.product_id} | ${p.name_ko} | ${p.brand?.name_ko ?? ''} | ${(p.category_path ?? []).join(' > ')} | final_price=${p.price?.final_price ?? ''} | reviews=${p.review?.total_count ?? 0}`),
    '',
    '## Artifacts',
    '- Machine dataset: data/products.crawled.json',
    '- Ontology markdown: docs/ontology/musinsa-product-ontology-sample.md',
    '- AI tag enrichment: docs/ontology/musinsa-product-enrichment.md',
    '- Crawler: scripts/expand-musinsa-products.mjs'
  ];
  return lines.join('\n') + '\n';
}

async function main() {
  console.log(`Checking robots: ${ROBOTS_URL}`);
  assertRobotsAllows(await fetchText(ROBOTS_URL));
  const startedAt = new Date().toISOString();
  const { products } = await loadExisting(outPath);
  const existingIds = new Set(products.map(p => String(p.product_id)));
  console.log(`Existing products: ${products.length}; target: ${target}`);
  const entries = await collectEntries(existingIds);
  console.log(`Candidate new product URLs: ${entries.length}`);

  const failures = [];
  let attempted = 0;
  let succeeded = 0;
  for (const entry of entries) {
    if (products.length >= target || attempted >= maxAttempts) break;
    attempted += 1;
    const id = entry.url.match(/\/products\/(\d+)/)?.[1];
    if (!id || existingIds.has(id)) continue;
    console.log(`[${products.length}/${target}] Crawling ${entry.url}`);
    await sleep(delayMs);
    try {
      const html = await fetchText(entry.url);
      const product = productToOntology(extractNextData(html), entry.url, entry);
      if (!existingIds.has(String(product.product_id))) {
        products.push(product);
        existingIds.add(String(product.product_id));
        succeeded += 1;
      }
    } catch (error) {
      failures.push({ url: entry.url, error: error.message });
      console.warn(`Skipping ${entry.url}: ${error.message}`);
    }
    if (succeeded > 0 && succeeded % checkpointEvery === 0) {
      await saveDataset(products, {
        user_agent: UA,
        robots_url: ROBOTS_URL,
        target,
        started_at: startedAt,
        updated_at: new Date().toISOString(),
        attempted,
        succeeded_this_run: succeeded,
        succeeded_total: products.length,
        failed: failures.length,
        failures: failures.slice(-200)
      });
      console.log(`Checkpoint saved: ${products.length} products`);
    }
  }

  const crawler = {
    user_agent: UA,
    robots_url: ROBOTS_URL,
    target,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    attempted,
    succeeded_this_run: succeeded,
    succeeded_total: products.length,
    failed: failures.length,
    failures
  };
  await saveDataset(products, crawler);
  await mkdir(dirname(ontologyPath), { recursive: true });
  await writeFile(ontologyPath, ontologyMarkdown(products));
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, renderReport(products, crawler));
  console.log(JSON.stringify({ products: products.length, target, attempted, succeeded_this_run: succeeded, failed: failures.length, outPath, ontologyPath, reportPath }, null, 2));
  if (products.length < target) process.exitCode = 2;
}

main().catch(error => { console.error(error); process.exit(1); });
