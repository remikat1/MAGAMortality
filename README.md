# Maga Mortality

Mobile-first web app to visualize deaths attributed to policies, events, and political actors, with defensible sourcing and clear labeling of **direct vs statistical attribution** and **actual vs projected** counts.

## Repo structure

- `docs/`: product spec, UX flows, architecture, MVP scope, roadmap
- `app/`: mobile-first React web app (Vite)
- `public/data/`: read-only datasets served as static JSON (MVP)
- `.github/workflows/`: GitHub Pages deploy + ingestion job scaffolds

## Local development (MVP frontend)

Prereqs: Node.js 20+

```bash
cd app
npm install
npm run dev
```

Then open the URL printed in your terminal.

## Deploy (GitHub Pages)

1. In GitHub: **Settings → Pages** → set source to **GitHub Actions**
2. The workflow in `.github/workflows/deploy.yml` builds and deploys on every push to `main`.

## Data updates (owner-only)

MVP assumes data is updated by committing new JSON under `app/public/data/`.
Phase 2+ adds automated ingestion that opens PRs (GitHub Actions) for review/merge.

