import React, { useEffect, useMemo, useState } from 'react';
import { formatDeaths, formatInt, sumEstimate } from './lib/format.js';
import { readFiltersFromUrl, writeFiltersToUrl } from './lib/urlState.js';

function uniq(arr) {
  return Array.from(new Set(arr));
}

function toggleInList(list, value) {
  if (list.includes(value)) return list.filter((x) => x !== value);
  return [...list, value];
}

function matchesFilters({ item, estimate, filters }) {
  if (filters.attribution !== 'both' && estimate.attributionType !== filters.attribution) return false;
  if (filters.count !== 'both' && estimate.countType !== filters.count) return false;

  if (filters.topic.length) {
    const itemTopics = item.topicIds || [];
    if (!filters.topic.some((t) => itemTopics.includes(t))) return false;
  }

  if (filters.politician.length) {
    const itemPols = item.politicianIds || [];
    if (!filters.politician.some((p) => itemPols.includes(p))) return false;
  }

  return true;
}

function estimateIsCurrent(est, allEstimatesById) {
  // Current if no other estimate supersedes it.
  for (const other of Object.values(allEstimatesById)) {
    if (other?.supersedesEstimateId === est.id) return false;
  }
  return true;
}

async function loadDataset() {
  const res = await fetch('./data/dataset.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to load dataset: ${res.status}`);
  return res.json();
}

export default function App() {
  const [dataset, setDataset] = useState(null);
  const [error, setError] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [filters, setFilters] = useState(() => readFiltersFromUrl());
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadDataset()
      .then((data) => {
        if (cancelled) return;
        setDataset(data);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    writeFiltersToUrl(filters);
  }, [filters]);

  const byId = useMemo(() => {
    if (!dataset) return null;
    const topicsById = Object.fromEntries((dataset.topics || []).map((t) => [t.id, t]));
    const politiciansById = Object.fromEntries((dataset.politicians || []).map((p) => [p.id, p]));
    const itemsById = Object.fromEntries((dataset.items || []).map((i) => [i.id, i]));
    const estimatesById = Object.fromEntries((dataset.estimates || []).map((e) => [e.id, e]));
    const sourcesByEstimateId = {};
    for (const s of dataset.sources || []) {
      if (!sourcesByEstimateId[s.estimateId]) sourcesByEstimateId[s.estimateId] = [];
      sourcesByEstimateId[s.estimateId].push(s);
    }
    return { topicsById, politiciansById, itemsById, estimatesById, sourcesByEstimateId };
  }, [dataset]);

  const currentEstimates = useMemo(() => {
    if (!dataset || !byId) return [];
    return (dataset.estimates || []).filter((e) => estimateIsCurrent(e, byId.estimatesById));
  }, [dataset, byId]);

  const rows = useMemo(() => {
    if (!dataset || !byId) return [];

    const joined = currentEstimates
      .map((estimate) => {
        const item = byId.itemsById[estimate.itemId];
        if (!item) return null;
        if (!matchesFilters({ item, estimate, filters })) return null;
        return { item, estimate };
      })
      .filter(Boolean);

    // Sort by numeric contribution (midpoint for ranges).
    joined.sort((a, b) => sumEstimate(b.estimate) - sumEstimate(a.estimate));
    return joined;
  }, [dataset, byId, currentEstimates, filters]);

  const total = useMemo(() => rows.reduce((acc, r) => acc + sumEstimate(r.estimate), 0), [rows]);

  const filterSummary = useMemo(() => {
    if (!dataset || !byId) return [];
    const parts = [];
    if (filters.topic.length) parts.push(...filters.topic.map((id) => byId.topicsById[id]?.name).filter(Boolean));
    if (filters.politician.length) parts.push(...filters.politician.map((id) => byId.politiciansById[id]?.name).filter(Boolean));
    if (filters.attribution !== 'both') parts.push(filters.attribution === 'direct' ? 'Direct' : 'Statistical');
    if (filters.count !== 'both') parts.push(filters.count === 'actual' ? 'Actual' : 'Projected');
    return parts;
  }, [dataset, byId, filters]);

  const availableTopicIds = useMemo(() => {
    if (!dataset) return [];
    return dataset.topics?.map((t) => t.id) || [];
  }, [dataset]);

  const availablePoliticianIds = useMemo(() => {
    if (!dataset) return [];
    // MVP: show only politicians referenced by items in dataset.
    const ids = [];
    for (const item of dataset.items || []) {
      for (const pid of item.politicianIds || []) ids.push(pid);
    }
    return uniq(ids).slice(0, 14);
  }, [dataset]);

  const selected = useMemo(() => {
    if (!selectedItemId || !dataset || !byId) return null;
    const item = byId.itemsById[selectedItemId];
    if (!item) return null;
    const estimates = currentEstimates.filter((e) => e.itemId === item.id);
    return { item, estimates };
  }, [selectedItemId, dataset, byId, currentEstimates]);

  async function onShare() {
    const shareUrl = window.location.href;
    const title = 'Maga Mortality';
    const text = 'Deaths attributed to policies/events with sources and methodology.';
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(shareUrl);
    alert('Link copied.');
  }

  function resetFilters() {
    setFilters({ topic: [], politician: [], attribution: 'both', count: 'both' });
  }

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <h1>Maga Mortality</h1>
          <p>Read-only · Sources-first · Mobile-first</p>
        </div>
        <button className="btn btnPrimary" onClick={onShare}>
          Share
        </button>
      </div>

      {!dataset && !error && (
        <div className="notice">Loading dataset…</div>
      )}
      {error && (
        <div className="notice">
          <div style={{ color: 'var(--danger)', fontWeight: 700 }}>Failed to load.</div>
          <div style={{ marginTop: 6 }}>{error}</div>
        </div>
      )}

      {dataset && (
        <>
          <div className="hero">
            <div className="bigNumber">{formatInt(total)}</div>
            <div className="subline">
              As of <strong>{dataset.meta?.asOfDate || '—'}</strong> · Showing{' '}
              <strong>
                {filters.attribution === 'both' ? 'Direct+Statistical' : filters.attribution}
              </strong>{' '}
              · <strong>{filters.count === 'both' ? 'Actual+Projected' : filters.count}</strong>
            </div>

            {filterSummary.length > 0 && (
              <div className="pillRow" aria-label="Active filters">
                {filterSummary.map((s) => (
                  <span key={s} className="chip chipSmall" aria-pressed="true">
                    {s}
                  </span>
                ))}
              </div>
            )}

            <div className="pillRow" style={{ marginTop: 10 }}>
              <button className="btn" onClick={() => setFiltersOpen((v) => !v)}>
                {filtersOpen ? 'Hide filters' : 'Filters'}
              </button>
              <button className="btn" onClick={resetFilters} disabled={filterSummary.length === 0}>
                Reset
              </button>
              <a className="btn" href="./#methodology">
                Methodology
              </a>
              <a className="btn" href="./#updates">
                Updates
              </a>
              <a className="btn" href="./#support">
                Support
              </a>
            </div>
          </div>

          <div className="grid">
            <div className="panel">
              <div className="panelHeader">
                <h2>Breakdown</h2>
                <div className="meta">{rows.length} estimates</div>
              </div>
              <div className="list">
                {rows.map(({ item, estimate }) => (
                  <button
                    key={estimate.id}
                    className="rowBtn"
                    onClick={() => setSelectedItemId(item.id)}
                    aria-label={`Open details for ${item.title}`}
                  >
                    <div className="rowTop">
                      <div className="rowTitle">{item.title}</div>
                      <div className="rowValue">{formatDeaths(estimate)}</div>
                    </div>
                    <div className="rowBottom">
                      <div className="tags">
                        <span className="tag tagStrong">{item.type.toUpperCase()}</span>
                        <span className="tag">{estimate.attributionType.toUpperCase()}</span>
                        <span className="tag">{estimate.countType.toUpperCase()}</span>
                        <span className="tag">{(estimate.confidence || '—').toUpperCase()}</span>
                      </div>
                      <div className="tag">{estimate.asOfDate}</div>
                    </div>
                  </button>
                ))}

                {rows.length === 0 && (
                  <div className="detailBody">
                    <div className="notice">No items match the current filters.</div>
                  </div>
                )}
              </div>
            </div>

            <div className="panel">
              <div className="panelHeader">
                <h2>Details</h2>
                <div className="meta">{selected ? 'Selected' : 'Tap a row'}</div>
              </div>
              {!selected && (
                <div className="detailBody">
                  <div className="notice">
                    Tap an item in the breakdown to view sources and methodology.
                  </div>
                </div>
              )}
              {selected && (
                <div className="detailBody">
                  <h3 className="detailTitle">{selected.item.title}</h3>
                  <div className="pillRow" style={{ marginTop: 8 }}>
                    {(selected.item.topicIds || [])
                      .map((id) => byId.topicsById[id]?.name)
                      .filter(Boolean)
                      .map((name) => (
                        <span className="chip chipSmall" key={name} aria-pressed="false">
                          {name}
                        </span>
                      ))}
                  </div>
                  <p className="detailSummary">{selected.item.summary}</p>

                  <div className="detailKpis">
                    <div className="kpi">
                      <div className="kpiLabel">Type</div>
                      <div className="kpiValue">{selected.item.type.toUpperCase()}</div>
                    </div>
                    <div className="kpi">
                      <div className="kpiLabel">Date</div>
                      <div className="kpiValue">{selected.item.date || '—'}</div>
                    </div>
                  </div>

                  {selected.estimates.map((e) => (
                    <div key={e.id} style={{ marginTop: 12 }}>
                      <div className="notice">
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                          <div style={{ fontWeight: 800 }}>{formatDeaths(e)} deaths</div>
                          <div style={{ color: 'var(--muted)' }}>
                            {e.attributionType} · {e.countType}
                          </div>
                        </div>
                        <div style={{ marginTop: 6 }}>{e.methodSummary}</div>
                        <div style={{ marginTop: 6, color: 'var(--muted)' }}>
                          As of {e.asOfDate} · Updated {new Date(e.lastUpdatedAt).toISOString().slice(0, 10)}
                        </div>
                      </div>

                      <div className="sources">
                        <div className="sectionTitle">Sources</div>
                        <ul>
                          {(byId.sourcesByEstimateId[e.id] || []).map((s) => (
                            <li key={s.id}>
                              <a href={s.url} target="_blank" rel="noreferrer">
                                {s.publisher}: {s.title}
                              </a>
                            </li>
                          ))}
                          {(byId.sourcesByEstimateId[e.id] || []).length === 0 && (
                            <li style={{ color: 'var(--muted)' }}>No sources attached (MVP requires ≥1).</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  ))}

                  <div className="pillRow" style={{ marginTop: 14 }}>
                    <button className="btn" onClick={() => setSelectedItemId(null)}>
                      Close
                    </button>
                    <button className="btn btnPrimary" onClick={onShare}>
                      Share this view
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div id="methodology" style={{ marginTop: 14 }} className="panel">
            <div className="panelHeader">
              <h2>Methodology (MVP)</h2>
              <div className="meta">Direct vs Statistical · Actual vs Projected</div>
            </div>
            <div className="detailBody">
              <div className="notice">
                <div style={{ fontWeight: 800 }}>Direct Attribution</div>
                <div style={{ marginTop: 6 }}>
                  Documented deaths directly tied to an event/decision (e.g., official logs, custody reporting).
                </div>
              </div>
              <div style={{ height: 10 }} />
              <div className="notice">
                <div style={{ fontWeight: 800 }}>Statistical Attribution (Excess Mortality)</div>
                <div style={{ marginTop: 6 }}>
                  Estimated incremental deaths above a baseline (e.g., 5-year rolling average) attributable to a change
                  in conditions. Ranges and confidence communicate uncertainty.
                </div>
              </div>
              <div style={{ height: 10 }} />
              <div className="notice">
                <div style={{ fontWeight: 800 }}>Actual vs Projected</div>
                <div style={{ marginTop: 6 }}>
                  “Actual” counts have occurred and were recorded; “Projected” counts are forecasts based on a model or
                  credible projection.
                </div>
              </div>
            </div>
          </div>

          <div id="updates" style={{ marginTop: 14 }} className="panel">
            <div className="panelHeader">
              <h2>Updates</h2>
              <div className="meta">Changelog (placeholder)</div>
            </div>
            <div className="detailBody">
              <div className="notice">In MVP, you can maintain updates in a simple `docs/` changelog or embed them in the dataset meta.</div>
            </div>
          </div>

          <div id="support" style={{ marginTop: 14 }} className="panel">
            <div className="panelHeader">
              <h2>Support</h2>
              <div className="meta">Hosting costs only</div>
            </div>
            <div className="detailBody">
              <div className="notice">
                Add your “Buy me a coffee” link here once you have it.
              </div>
            </div>
          </div>
        </>
      )}

      {dataset && (
        <div className="bottomSheet" role="region" aria-label="Filters">
          <div className="bottomSheetInner">
            <div className="sheetTop">
              <div className="title">Filters (thumb-friendly)</div>
              <button className="btn" onClick={() => setFiltersOpen((v) => !v)}>
                {filtersOpen ? 'Collapse' : 'Expand'}
              </button>
            </div>

            {filtersOpen && (
              <>
                <div className="section">
                  <div className="sectionTitle">Attribution</div>
                  <div className="pillRow">
                    {[
                      { id: 'both', label: 'Direct+Statistical' },
                      { id: 'direct', label: 'Direct' },
                      { id: 'statistical', label: 'Statistical' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        className="chip"
                        aria-pressed={filters.attribution === opt.id}
                        onClick={() => setFilters((f) => ({ ...f, attribution: opt.id }))}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="section">
                  <div className="sectionTitle">Count type</div>
                  <div className="pillRow">
                    {[
                      { id: 'both', label: 'Actual+Projected' },
                      { id: 'actual', label: 'Actual' },
                      { id: 'projected', label: 'Projected' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        className="chip"
                        aria-pressed={filters.count === opt.id}
                        onClick={() => setFilters((f) => ({ ...f, count: opt.id }))}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="section">
                  <div className="sectionTitle">Topics</div>
                  <div className="pillRow">
                    {availableTopicIds.map((id) => (
                      <button
                        key={id}
                        className="chip"
                        aria-pressed={filters.topic.includes(id)}
                        onClick={() => setFilters((f) => ({ ...f, topic: toggleInList(f.topic, id) }))}
                      >
                        {byId.topicsById[id]?.name || id}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="section">
                  <div className="sectionTitle">Politicians</div>
                  <div className="pillRow">
                    {availablePoliticianIds.map((id) => (
                      <button
                        key={id}
                        className="chip"
                        aria-pressed={filters.politician.includes(id)}
                        onClick={() => setFilters((f) => ({ ...f, politician: toggleInList(f.politician, id) }))}
                      >
                        {byId.politiciansById[id]?.name || id}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pillRow" style={{ marginTop: 10 }}>
                  <button className="btn" onClick={resetFilters} disabled={filterSummary.length === 0}>
                    Reset filters
                  </button>
                  <button className="btn btnPrimary" onClick={onShare}>
                    Share link
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

