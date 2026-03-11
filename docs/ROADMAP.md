# Development Roadmap — Maga Mortality

## Phase 1 — Prototype (1–3 days)

- **Repo scaffold**
  - React app running locally
  - sample dataset + schema
  - basic mobile UI
- **Core UX proof**
  - big number
  - filter chips
  - breakdown list
  - item detail with sources
  - deep-link share

Exit criteria:
- end-to-end flow works on mobile simulator + real phone
- adding/editing a JSON entry updates totals correctly

## Phase 2 — MVP launch (1–2 weeks)

- **Polish & trust**
  - Methodology page
  - “as of” date, confidence/range display conventions
  - revision history support in data model (supersedes)
- **Performance hardening**
  - caching strategy
  - dataset splitting if needed
  - image/icon optimization
- **Deployment**
  - GitHub Pages with CI build/deploy
  - custom domain (optional)

Exit criteria:
- stable deploy on every merge to `main`
- <2s initial load on mid-range phone

## Phase 3 — Growth features (2–6 weeks, as needed)

Choose based on pain:

- **Data ops**
  - ingestion job that proposes updates via PR
  - dedupe tooling / reconciliation helpers
- **Backend**
  - GraphQL API + Postgres when dataset becomes large or needs server-side queries
- **User features**
  - anonymous tip submission (triaged privately)
  - update digest / changelog subscription

