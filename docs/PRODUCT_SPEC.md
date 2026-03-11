# Product Spec — Maga Mortality

## 1) Summary

**Maga Mortality** is a mobile-first, read-only web app that displays a cumulative death toll attributed to policies, events, and political actors—paired with defensible documentation and transparent methodology. It is designed to be easy to share, fast to load, and hard to dismiss: every number is traceable to sources, and statistical models are clearly labeled and explained.

## 2) Problem & goals

### Problem
It is difficult for the public to **understand and remember** the human impact of policy decisions, especially when the impact is distributed, delayed, or statistically attributable rather than individually attributable.

### Goals
- **Make impact legible**: a “big number” plus the breakdown.
- **Make it defensible**: show sources, methodology, and confidence/uncertainty.
- **Make it shareable**: single-link sharing + deep links to filtered views.
- **Make it maintainable**: owner-controlled updates; automated ingestion later.

### Non-goals (MVP)
- Persuasion “debate mode” or interactive argumentation engine
- User accounts, personalization, saved filters
- User-generated content visible on-site

## 3) Target users

### Primary
**All people** who can be reached via share links on social/news/social platforms.

### User motivations
- Quickly understand “what happened” and “how big is it”.
- Share an evidence-backed summary with others.
- Drill into categories (immigration, health care, SNAP, abortion, environment, war, etc.).

## 4) Key product principles

- **Radical clarity**: every figure is labeled: Actual vs Projected; Direct vs Statistical.
- **No dark patterns**: no accounts, no nagging, no manipulative UI.
- **Mobile-first**: thumb-friendly controls; minimal typing; fast.
- **Source-forward**: sources are one tap away from every number.

## 5) Primary user journey (happy path)

1. User discovers a link via Reddit/Instagram/news.
2. Landing opens directly to the **Dashboard** with the cumulative number.
3. User taps filters (topic/politician/event) to see a breakdown.
4. User taps into a row to see **sources and notes**, plus methodology.
5. User hits **Share** (copy link) to send filtered view.
6. Optional: user taps **Support** (“Buy me a coffee”) to cover costs.

## 6) Core features

### Must-have (MVP)
- **Cumulative sum** at top (with “as of” date and attribution labeling)
- **Filter by**:
  - politician (one or multiple)
  - topic/category
  - event/policy
  - attribution type (Direct / Statistical)
  - count type (Actual / Projected)
- **Breakdown list** with:
  - item name
  - deaths (range if applicable)
  - tag chips (Direct/Statistical, Actual/Projected)
  - last-updated date
- **Detail view** for an item:
  - description + notes
  - methodology summary (especially for statistical models)
  - sources list (links, citations)
- **Share** buttons:
  - “Copy link” (deep link preserves filters)
  - native share when available
- **Owner-only data updates** via repo commits (no admin UI in MVP)
- **Deduping & revisions**:
  - data model supports multiple revisions per item and a “current” flag
  - UI uses current revision by default; prior revisions accessible

### Future expansion
- Anonymous tip submission (not published automatically)
- Subscriptions/alerts (weekly digest, major changes)
- Additional politician comparisons
- More sophisticated modeling + uncertainty visualization

## 7) Content & methodology requirements

### Attribution types
- **Direct Attribution**: deaths documented as directly occurring due to an event/policy/decision (e.g., deaths in custody, executions, specific documented incidents).
- **Statistical Attribution (Excess Death Model)**: estimated incremental deaths beyond baseline due to systemic changes (e.g., healthcare access cuts, environmental regulation changes, maternal mortality impacts).

### Count types
- **Actual**: already occurred and recorded.
- **Projected**: forecasted based on a model or credible projection.

### Minimum evidence standard (MVP)
- Every death count has:
  - at least one source
  - methodology summary
  - “confidence” level (Low/Med/High) and/or uncertainty range
  - “last updated” timestamp

## 8) Success metrics (MVP)
- **Engagement**: share-link copy rate; time on page; filter usage.
- **Performance**: initial load < 2s on mobile; dataset load < 300ms on repeat.
- **Maintainability**: ability to update data via JSON without code changes.

## 9) Risks & mitigations

### Risk: attribution disputes / credibility attacks
- Mitigation: strict labeling, “what this means” explainer, sources always visible, revision history.

### Risk: legal/safety considerations
- Mitigation: focus on documented policy/event impacts, cite sources, avoid doxxing, avoid personally identifying victims.

### Risk: data freshness / drift
- Mitigation: “as of” date always shown; clear update cadence; automated ingestion later.

