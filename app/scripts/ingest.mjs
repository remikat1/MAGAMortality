import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATASET_PATH = path.resolve(__dirname, '../public/data/dataset.json');

const USER_AGENT =
  'MagaMortalityBot/0.1 (+https://github.com/smithkb/MAGAMortality; contact: repo-owner)';

function stableId(prefix, input) {
  const h = crypto.createHash('sha1').update(String(input)).digest('hex').slice(0, 12);
  return `${prefix}_${h}`;
}

function isoDate(d = new Date()) {
  return new Date(d).toISOString().slice(0, 10);
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'user-agent': USER_AGENT,
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  return res.text();
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'user-agent': USER_AGENT, accept: 'application/json' }
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  return res.json();
}

function ensureTopic(dataset, topic) {
  dataset.topics ||= [];
  if (dataset.topics.some((t) => t.id === topic.id)) return;
  dataset.topics.push(topic);
}

function ensurePolitician(dataset, pol) {
  dataset.politicians ||= [];
  if (dataset.politicians.some((p) => p.id === pol.id)) return;
  dataset.politicians.push(pol);
}

function upsertItem(dataset, item) {
  dataset.items ||= [];
  const idx = dataset.items.findIndex((i) => i.id === item.id);
  if (idx >= 0) dataset.items[idx] = { ...dataset.items[idx], ...item };
  else dataset.items.push(item);
}

function upsertEstimate(dataset, estimate) {
  dataset.estimates ||= [];
  const idx = dataset.estimates.findIndex((e) => e.id === estimate.id);
  if (idx >= 0) dataset.estimates[idx] = { ...dataset.estimates[idx], ...estimate };
  else dataset.estimates.push(estimate);
}

function upsertSource(dataset, source) {
  dataset.sources ||= [];
  const idx = dataset.sources.findIndex((s) => s.id === source.id);
  if (idx >= 0) dataset.sources[idx] = { ...dataset.sources[idx], ...source };
  else dataset.sources.push(source);
}

function addDirectDeathEvent({ dataset, title, date, url, publisher, topicId, location }) {
  const itemId = stableId('i', `${publisher}:${title}:${date}:${url}`);
  const estimateId = stableId('e', `${itemId}:direct:actual`);
  const sourceId = stableId('s', `${estimateId}:${url}`);

  upsertItem(dataset, {
    id: itemId,
    type: 'event',
    title,
    summary: `${publisher} reported a death in custody/detention (auto-ingested; verify details).`,
    date,
    location: location || 'United States',
    topicIds: [topicId],
    politicianIds: ['p_trump'],
    status: 'active'
  });

  upsertEstimate(dataset, {
    id: estimateId,
    itemId,
    attributionType: 'direct',
    countType: 'actual',
    value: 1,
    confidence: 'medium',
    methodSummary: 'Each entry corresponds to one documented death listed by the publisher.',
    asOfDate: date,
    lastUpdatedAt: new Date().toISOString(),
    supersedesEstimateId: null
  });

  upsertSource(dataset, {
    id: sourceId,
    estimateId,
    publisher,
    title,
    url,
    publishedAt: date,
    sourceType: 'primary'
  });
}

async function ingestFederalRegister({ dataset, limit = 25 }) {
  // API docs: https://www.federalregister.gov/developers/documentation/api/v1
  const url = `https://www.federalregister.gov/api/v1/documents.json?per_page=${limit}&order=newest`;
  const data = await fetchJson(url);

  for (const doc of data?.results || []) {
    const title = doc.title?.trim();
    const docUrl = doc.html_url || doc.pdf_url || doc.public_inspection_pdf_url;
    const pubDate = doc.publication_date || doc.public_inspection_document?.publication_date;
    if (!title || !docUrl || !pubDate) continue;

    const itemId = stableId('i', `federalregister:${doc.document_number}:${docUrl}`);
    upsertItem(dataset, {
      id: itemId,
      type: 'policy',
      title,
      summary:
        'Federal Register publication (auto-ingested). This is a policy trigger record; attach mortality estimates separately after analysis.',
      date: pubDate,
      location: 'United States',
      topicIds: [], // unknown without taxonomy; assign during curation
      politicianIds: ['p_trump'],
      status: 'active'
    });

    const estimateId = stableId('e', `${itemId}:direct:policy_trigger`);
    // This is intentionally a 0-valued estimate so the item can be browsed without inflating totals.
    upsertEstimate(dataset, {
      id: estimateId,
      itemId,
      attributionType: 'direct',
      countType: 'actual',
      value: 0,
      confidence: 'high',
      methodSummary: 'Policy trigger record only (no death estimate attached yet).',
      asOfDate: pubDate,
      lastUpdatedAt: new Date().toISOString(),
      supersedesEstimateId: null
    });

    const sourceId = stableId('s', `${estimateId}:${docUrl}`);
    upsertSource(dataset, {
      id: sourceId,
      estimateId,
      publisher: 'Federal Register',
      title: `Federal Register: ${title}`,
      url: docUrl,
      publishedAt: pubDate,
      sourceType: 'primary'
    });
  }
}

async function ingestIceDetaineeDeathReports({ dataset }) {
  const url = 'https://www.ice.gov/detain/detainee-death-reports';
  let html;
  try {
    html = await fetchText(url);
  } catch (err) {
    console.warn(`Skipping ICE detainee death reports ingestion (fetch failed for ${url}):`, err.message || err);
    return;
  }
  const $ = cheerio.load(html);

  // Best-effort: ICE site structure changes; we try to capture linked report pages/PDFs.
  const links = [];
  $('a').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text()?.trim();
    if (!href) return;
    const abs = href.startsWith('http') ? href : new URL(href, url).toString();
    if (/detainee-death/i.test(abs) || /death-report/i.test(abs) || /\/detain\/detainee-death-reports/i.test(abs)) {
      links.push({ url: abs, text });
    }
    if (/\.(pdf)$/i.test(abs) && /death/i.test(text || '')) links.push({ url: abs, text });
  });

  const unique = new Map();
  for (const l of links) unique.set(l.url, l);

  // If we can’t parse individual deaths reliably, we still add/update a source “collection” item.
  const collectionId = stableId('i', `ice:collection:${url}`);
  upsertItem(dataset, {
    id: collectionId,
    type: 'event',
    title: 'ICE detainee death reports (collection)',
    summary:
      'Collection page for ICE detainee death reporting (auto-ingested). Individual deaths should be curated from the linked reports.',
    date: isoDate(),
    location: 'United States',
    topicIds: ['t_immigration'],
    politicianIds: ['p_trump'],
    status: 'active'
  });
  const estId = stableId('e', `${collectionId}:direct:actual`);
  upsertEstimate(dataset, {
    id: estId,
    itemId: collectionId,
    attributionType: 'direct',
    countType: 'actual',
    value: 0,
    confidence: 'high',
    methodSummary: 'Collection page only (no per-death parsing in automated MVP).',
    asOfDate: isoDate(),
    lastUpdatedAt: new Date().toISOString(),
    supersedesEstimateId: null
  });
  upsertSource(dataset, {
    id: stableId('s', `${estId}:${url}`),
    estimateId: estId,
    publisher: 'ICE (DHS)',
    title: 'ICE detainee death reports',
    url,
    publishedAt: isoDate(),
    sourceType: 'primary'
  });

  // Add linked report items as “events” with no count by default (curation step).
  for (const l of unique.values()) {
    const itemId = stableId('i', `ice:link:${l.url}`);
    upsertItem(dataset, {
      id: itemId,
      type: 'event',
      title: l.text ? `ICE report link: ${l.text}` : 'ICE detainee death report (link)',
      summary: 'Linked from ICE detainee death reports page (auto-ingested). Curate into individual deaths if needed.',
      date: isoDate(),
      location: 'United States',
      topicIds: ['t_immigration'],
      politicianIds: ['p_trump'],
      status: 'active'
    });
    const eId = stableId('e', `${itemId}:direct:actual`);
    upsertEstimate(dataset, {
      id: eId,
      itemId,
      attributionType: 'direct',
      countType: 'actual',
      value: 0,
      confidence: 'medium',
      methodSummary: 'Link record only (requires curation to extract deaths).',
      asOfDate: isoDate(),
      lastUpdatedAt: new Date().toISOString(),
      supersedesEstimateId: null
    });
    upsertSource(dataset, {
      id: stableId('s', `${eId}:${l.url}`),
      estimateId: eId,
      publisher: 'ICE (DHS)',
      title: l.text || 'ICE detainee death report link',
      url: l.url,
      publishedAt: isoDate(),
      sourceType: 'primary'
    });
  }
}

async function ingestBopDeaths({ dataset }) {
  const url = 'https://www.bop.gov/resources/deaths.jsp';
  const html = await fetchText(url);
  const $ = cheerio.load(html);

  // BOP page often contains a table/list of deaths with name + date.
  // We’ll extract rows with a date-like token. Each extracted row becomes an event with value=1.
  const textRows = [];
  $('tr').each((_, tr) => {
    const rowText = $(tr).text().replace(/\s+/g, ' ').trim();
    if (rowText) textRows.push(rowText);
  });

  // If table parsing fails, fall back to list items.
  if (textRows.length === 0) {
    $('li').each((_, li) => {
      const rowText = $(li).text().replace(/\s+/g, ' ').trim();
      if (rowText) textRows.push(rowText);
    });
  }

  const dateRegex = /\b(20\d{2})[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b/;
  let extracted = 0;

  for (const row of textRows) {
    const m = row.match(dateRegex);
    if (!m) continue;
    const date = `${m[1]}-${m[2]}-${m[3]}`;
    const title = `BOP death in custody: ${row.slice(0, 120)}${row.length > 120 ? '…' : ''}`;
    addDirectDeathEvent({
      dataset,
      title,
      date,
      url,
      publisher: 'Bureau of Prisons (DOJ)',
      topicId: 't_healthcare',
      location: 'United States'
    });
    extracted += 1;
    if (extracted >= 75) break; // safety cap
  }

  // Always keep a collection record too.
  const collectionId = stableId('i', `bop:collection:${url}`);
  upsertItem(dataset, {
    id: collectionId,
    type: 'event',
    title: 'BOP deaths in custody (collection)',
    summary: 'Collection page for Bureau of Prisons death reporting (auto-ingested).',
    date: isoDate(),
    location: 'United States',
    topicIds: ['t_healthcare'],
    politicianIds: ['p_trump'],
    status: 'active'
  });
  const estId = stableId('e', `${collectionId}:direct:actual`);
  upsertEstimate(dataset, {
    id: estId,
    itemId: collectionId,
    attributionType: 'direct',
    countType: 'actual',
    value: 0,
    confidence: 'high',
    methodSummary: 'Collection page record; individual extracted rows become separate events.',
    asOfDate: isoDate(),
    lastUpdatedAt: new Date().toISOString(),
    supersedesEstimateId: null
  });
  upsertSource(dataset, {
    id: stableId('s', `${estId}:${url}`),
    estimateId: estId,
    publisher: 'Bureau of Prisons (DOJ)',
    title: 'BOP deaths in custody',
    url,
    publishedAt: isoDate(),
    sourceType: 'primary'
  });
}

async function ingestProPublicaRss({ dataset }) {
  // RSS endpoint (general)
  const url = 'https://www.propublica.org/feeds/propublica/main';
  const xml = await fetchText(url);
  const $ = cheerio.load(xml, { xmlMode: true });
  const items = $('item').toArray().slice(0, 20);

  for (const it of items) {
    const title = $(it).find('title').text().trim();
    const link = $(it).find('link').text().trim();
    const pubDateRaw = $(it).find('pubDate').text().trim();
    const pubDate = pubDateRaw ? isoDate(new Date(pubDateRaw)) : isoDate();
    if (!title || !link) continue;

    const itemId = stableId('i', `propublica:${link}`);
    upsertItem(dataset, {
      id: itemId,
      type: 'event',
      title: `ProPublica: ${title}`,
      summary:
        'ProPublica story (auto-ingested). If it includes quantifiable deaths attributable to policy, create/attach estimates manually with citations.',
      date: pubDate,
      location: 'United States',
      topicIds: [],
      politicianIds: ['p_trump'],
      status: 'active'
    });

    const estimateId = stableId('e', `${itemId}:direct:actual`);
    upsertEstimate(dataset, {
      id: estimateId,
      itemId,
      attributionType: 'direct',
      countType: 'actual',
      value: 0,
      confidence: 'medium',
      methodSummary: 'Story record only (no automated extraction of death counts).',
      asOfDate: pubDate,
      lastUpdatedAt: new Date().toISOString(),
      supersedesEstimateId: null
    });

    upsertSource(dataset, {
      id: stableId('s', `${estimateId}:${link}`),
      estimateId,
      publisher: 'ProPublica',
      title,
      url: link,
      publishedAt: pubDate,
      sourceType: 'secondary'
    });
  }
}

function ensureBaseTaxonomy(dataset) {
  ensureTopic(dataset, { id: 't_healthcare', name: 'Healthcare', slug: 'healthcare' });
  ensureTopic(dataset, { id: 't_immigration', name: 'Immigration', slug: 'immigration' });
  ensureTopic(dataset, { id: 't_snap', name: 'SNAP', slug: 'snap' });
  ensureTopic(dataset, { id: 't_abortion', name: 'Abortion & Maternal Health', slug: 'abortion-maternal' });
  ensureTopic(dataset, { id: 't_environment', name: 'Environment', slug: 'environment' });

  ensurePolitician(dataset, {
    id: 'p_trump',
    name: 'Donald Trump',
    party: 'Republican',
    representedState: null,
    notes: 'Default politician placeholder for MVP ingestion.'
  });
}

async function main() {
  const raw = await fs.readFile(DATASET_PATH, 'utf8');
  const dataset = JSON.parse(raw);

  ensureBaseTaxonomy(dataset);

  // Ingest “direct attribution” sources that are scrapeable without auth/paywalls.
  await ingestFederalRegister({ dataset, limit: 25 });
  await ingestIceDetaineeDeathReports({ dataset });
  await ingestBopDeaths({ dataset });
  await ingestProPublicaRss({ dataset });

  dataset.meta ||= {};
  dataset.meta.updatedAt = new Date().toISOString();
  dataset.meta.asOfDate = isoDate();
  dataset.meta.notes =
    'Auto-updated via GitHub Actions ingestion. Review sources/estimates for correctness before treating as final.';

  // Stable ordering makes diffs readable in PRs.
  dataset.topics?.sort((a, b) => a.id.localeCompare(b.id));
  dataset.politicians?.sort((a, b) => a.id.localeCompare(b.id));
  dataset.items?.sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.id.localeCompare(b.id));
  dataset.estimates?.sort((a, b) => (b.asOfDate || '').localeCompare(a.asOfDate || '') || a.id.localeCompare(b.id));
  dataset.sources?.sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || '') || a.id.localeCompare(b.id));

  await fs.writeFile(DATASET_PATH, JSON.stringify(dataset, null, 2) + '\n', 'utf8');
  console.log(`Updated dataset at ${DATASET_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

