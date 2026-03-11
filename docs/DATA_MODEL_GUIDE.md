# Data Model Guide (MVP)

MVP data is a single static JSON file served to the client:

- `app/public/data/dataset.json`

## What you edit

### 1) Add/modify an Item

`items[]` represents a **Policy** or **Event**:
- `type`: `policy` or `event`
- `title`, `summary`
- `date` (ISO date string)
- `topicIds[]`: references `topics[]`
- `politicianIds[]`: references `politicians[]`

### 2) Add an Estimate

`estimates[]` represents a **claim** about deaths for an item:
- `itemId`: which item this estimate belongs to
- `attributionType`: `direct` or `statistical`
- `countType`: `actual` or `projected`
- `value` OR `rangeMin` + `rangeMax`
- `confidence`: `low | medium | high`
- `methodSummary`: 1–2 sentence summary of methodology
- `asOfDate`: what date the claim applies to
- `lastUpdatedAt`: ISO timestamp for when you updated it

### 3) Attach Sources

`sources[]` attaches citations to an estimate:
- `estimateId`: which estimate you’re defending
- `publisher`, `title`, `url`, `publishedAt`
- `sourceType`: `primary | secondary | dataset`

## Revisions / updates (deduping numbers over time)

When an estimate is updated (same underlying thing, new number):

1. Keep the old estimate record.
2. Create a new estimate record with the updated number.
3. Set the new estimate’s `supersedesEstimateId` to the old estimate’s `id`.

The UI treats an estimate as **current** if it is not superseded by another estimate.

## Defensibility checklist (before publishing)

- Every estimate has ≥1 source in `sources[]`
- Method summary is understandable without jargon
- Direct vs Statistical and Actual vs Projected are correct
- If using a range, the range reflects uncertainty (not sloppiness)

