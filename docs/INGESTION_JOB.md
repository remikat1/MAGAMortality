# Ingestion job (GitHub Actions)

## What it does (today)

Workflow: `.github/workflows/ingest-stub.yml` (renamed logically but file name unchanged)

Runs daily and on manual dispatch:
- Installs app dependencies
- Runs `npm run ingest` (script: `app/scripts/ingest.mjs`)
- Opens a PR that updates `app/public/data/dataset.json`

### Sources currently ingested automatically

- **Federal Register API** (`federalregister.gov/api/v1/...`)
  - Adds **policy trigger** items with `value: 0` (no mortality estimate attached automatically)
- **ICE detainee death reports** (`ice.gov/detain/detainee-death-reports`)
  - Adds a **collection record** + discovered report links (as link records with `value: 0`)
- **BOP deaths page** (`bop.gov/resources/deaths.jsp`)
  - Best-effort extraction of rows with ISO-like dates
  - Adds **event entries** with `value: 1` per extracted row (review required)
- **ProPublica RSS**
  - Adds story link records with `value: 0`

## What it does NOT do (yet)

- It does not scrape paywalled journals (e.g., JAMA) or extract numeric estimates from PDFs.
- It does not compute excess deaths or statistical models.
- It does not reconcile duplicates across sources beyond stable IDs.

## Why PRs (not direct writes to main)

This is a credibility product. The workflow generates a PR so the owner can:
- validate that parsing didn’t drift due to site changes
- attach correct topic tags
- attach real estimates + confidence + method summaries
- reject bad data before it goes live

## Next upgrades

- Add a curated “taxonomy mapping” layer for Federal Register docs → topic tags.
- Add structured parsing for ICE/BOP report pages (when formats are stable).
- Add NCHS / IHME dataset sync using official APIs/downloads (where allowed).

