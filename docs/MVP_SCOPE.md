# MVP Scope — Maga Mortality (Prioritized)

## Product promise (MVP)
In <10 seconds on mobile, a user can see a **cumulative death toll**, understand what it includes, and share a **defensible** filtered view backed by sources.

## In scope (must ship)

- **Dashboard**
  - big cumulative number
  - “as of” date
  - active filter summary chips
- **Browse / Breakdown**
  - list of items (policy/event) with deaths and tags
  - sort by deaths (default)
- **Filters (no typing required)**
  - topic chips
  - politician chips (top N; “more” can be later)
  - attribution type: Direct / Statistical / Both
  - count type: Actual / Projected / Both
- **Item detail**
  - short explanation + notes
  - deaths (value or range)
  - sources list (one tap away)
  - methodology snippet
- **Share**
  - copy link (deep link preserves filters + optional selected item)
- **Methodology page**
  - explain labels and what counts mean
- **Owner-only data updates**
  - edit JSON dataset in repo and redeploy automatically

## Explicitly out of scope (MVP)

- User accounts, saved filters, personalization
- Public submissions/tips UI
- Subscriptions/notifications
- Full automated scraping with reconciliation
- Paid features or ads
- Complex search

## MVP acceptance criteria

- **Performance**: Lighthouse mobile performance ≥ 90 on the landing route (local/prod)
- **Clarity**: every displayed number is labeled Direct/Statistical and Actual/Projected
- **Defensibility**: every estimate has ≥1 source link and a method summary
- **Shareability**: copied link restores the same view on a fresh load

