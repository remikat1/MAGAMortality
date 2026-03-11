# Mobile-first UX Flow — Maga Mortality

## Information architecture

- **Landing / Dashboard** (default)
- **Browse** (breakdown list + filters)
- **Detail** (policy/event/politician summary + sources + methodology)
- **Methodology** (global explainer)
- **Updates** (changelog / “what changed”)
- **Support** (Buy me a coffee)

## Global UX requirements (mobile)

- Thumb-friendly: primary controls within bottom 60% of viewport
- Minimal typing: all filtering via chips, toggles, and search-as-you-type (optional later)
- Fast: static-first; skeleton loading; avoid layout shift
- Clarity: show “Direct/Statistical” + “Actual/Projected” labels everywhere

## Primary flow (happy path)

### 1) Entry: shared link
- User opens link (possibly with query params encoding filters).
- App shows **Dashboard** with:
  - big cumulative number
  - “as of” date
  - chips summarizing active filters (if any)
  - “View breakdown” CTA

### 2) Dashboard → Breakdown
- Tap “View breakdown” or scroll to breakdown section.
- Breakdown list defaults to showing:
  - top contributors by deaths (descending)
  - grouped by item type (Policy/Event) with clear labels

### 3) Apply filters
Filter controls are a sticky bottom sheet (collapsed by default):
- **Topic** chips (Immigration, Healthcare, SNAP, Abortion, Environment, War, etc.)
- **Actor** chips (Politicians)
- **Attribution** toggle: Direct / Statistical / Both
- **Count type** toggle: Actual / Projected / Both
- **Time window** (optional MVP): All-time vs Last 30/90/365

On change:
- update the big number immediately
- animate the breakdown list update
- show a short “Updated” toast (no intrusive modals)

### 4) Detail view
Tap any breakdown row:
- Header: item name, tags, last updated
- Primary metric: deaths (single value or range)
- Secondary: “Why attributed” (2–4 bullets)
- **Sources** list (tap opens in new tab)
- **Methodology** (short summary + link to global Methodology page)
- “Share this view” (copy deep link)

### 5) Share
Primary share action:
- **Copy link** (always available)
Secondary (where supported):
- `navigator.share()` (native share sheet)

Deep links preserve:
- selected filters
- selected item detail (optional)

## Key screens (wireframe-level)

### Landing / Dashboard
- Top: “Maga Mortality”
- Big number: cumulative deaths
- Subtext: “As of YYYY-MM-DD · Direct+Statistical · Actual+Projected” (based on filters)
- Filter summary chips (tap to edit)
- CTA: “View breakdown”
- Small link row: Methodology · Updates · Support

### Browse / Breakdown
- Sticky header: big number mini
- Sticky bottom filter sheet:
  - Topic chips
  - Actor chips
  - Direct/Statistical toggle
  - Actual/Projected toggle
- List rows:
  - Title + short descriptor
  - Death count (right-aligned)
  - Tag chips
  - Updated date

### Methodology
- Explain “Direct vs Statistical”
- Explain “Actual vs Projected”
- Explain ranges/uncertainty and confidence
- “How to read the dashboard”

### Updates
- Changelog entries:
  - date
  - what changed
  - links to items impacted

### Support
- Single primary button linking to BuyMeACoffee (or similar)
- Plain text: “Hosting costs only; no ads; no accounts.”

## Accessibility & trust
- High contrast, readable type scale
- Always-visible labels (don’t rely on color alone)
- External links have an “opens new tab” indicator (text)
- Each item page includes “Report an issue with this number” mailto link (owner-triaged)

