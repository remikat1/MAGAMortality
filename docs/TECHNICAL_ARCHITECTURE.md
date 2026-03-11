# Technical Architecture — Maga Mortality

## Guiding constraints

- Read-only for end users; **single owner** curates/approves data
- Mobile-first, fast: **<2s load** on reasonable mobile networks
- Low cost / free where possible (GitHub Pages + GitHub Actions)
- Defensible numbers: first-class support for **Direct vs Statistical** and **Actual vs Projected**, plus ranges & confidence

## Phase 1–2 (Prototype + MVP): Static-first architecture

### Why static-first
You get:
- free hosting and CDN via GitHub Pages
- near-zero operational burden
- excellent performance
- simple owner-only updates via Git commits

### Components

- **Frontend**: React (Vite), mobile-first UI, client-side filtering
- **Data**: versioned JSON under `app/public/data/` served statically
- **Ingestion (optional MVP stub)**: GitHub Actions scheduled job that fetches source feeds and opens a PR with proposed data changes (human review/merge)
- **Analytics (optional)**: privacy-friendly basic metrics (can be added later)

### Data flow (MVP)
1. App loads `public/data/dataset.json` (cached by browser)
2. Client computes:
   - cumulative total given active filters
   - grouped breakdown list
3. Deep links encode filter state via URL query params

## Phase 3 (Growth): Service-backed architecture (GraphQL + Postgres)

When data size, ingestion complexity, or query needs outgrow static JSON:

### Components
- **API**: Node.js GraphQL (Apollo Server or Yoga)
- **DB**: Postgres
- **Jobs**: scheduled workers (or GitHub Actions → API) for ingestion & reconciliation
- **Admin**: private owner-only admin UI (or direct DB ops) for approvals

### Hosting options
- Frontend: GitHub Pages, Cloudflare Pages, or Vercel
- API: Render/Fly.io/Railway (small instance)
- DB: managed Postgres (Render/Fly/Neon/Supabase)

## Domain model (recommended)

Model the site as **Items** (events/policies) with **Estimates** (death counts) and **Sources**.

### Core entities
- **Politician**
  - `id`, `name`, `party`, `representedState?`, `roles[]`, `startDate?`, `endDate?`
- **Topic**
  - `id`, `name`, `slug`
- **Item** (Policy/Event)
  - `id`, `type` = `policy | event`
  - `title`, `summary`, `date?`, `location?`
  - `topics[]`
  - `politicianIds[]` (attribution / ownership / responsibility)
  - `status` = `active | superseded | retracted`
- **Estimate** (Death count)
  - `id`, `itemId`
  - `attributionType` = `direct | statistical`
  - `countType` = `actual | projected`
  - `value` OR `rangeMin`/`rangeMax`
  - `confidence` = `low | medium | high`
  - `methodSummary` (short), `methodDetailsUrl?`
  - `asOfDate`, `lastUpdatedAt`
  - `supersedesEstimateId?` (revision chain)
- **Source**
  - `id`, `estimateId`
  - `publisher`, `title`, `url`, `publishedAt`
  - `sourceType` = `primary | secondary | dataset`

### Why this shape
- multiple estimates per item (direct + statistical; actual + projected)
- revisions are explicit (supersedes chain)
- sources attach to the estimate (not only the item), which is what you’re defending

## Filtering & query shape

### MVP (client-side)
- Load once, filter in memory:
  - `topic`
  - `politicianId`
  - `itemType`
  - `attributionType`
  - `countType`

### Phase 3 (GraphQL)
Typical queries:
- `totals(filters): TotalSummary`
- `items(filters, sort, page): ItemConnection`
- `item(id): ItemDetail`

## Deduping / reconciliation strategy

The hard part is that multiple sources may:
- refer to the same underlying event/policy
- update numbers over time
- include overlapping populations

Recommended approach:
- **Canonical Item** for “the thing”
- **Estimates** as time/versioned claims about deaths for that thing
- UI defaults to **current** estimate (latest non-superseded)
- “History” shows prior superseded estimates and why they changed

## Security & permissions

MVP: no auth; all data public and read-only.

Owner-only changes happen via:
- direct commits to `main`, or
- PRs opened by ingestion workflow that owner merges

## Performance

Targets:
- initial load: <2s on mobile
- dataset size: keep `dataset.json` under ~500KB initially; split by year/topic later if needed
- caching: immutable asset hashes + `Cache-Control` for JSON (with revisioning)

