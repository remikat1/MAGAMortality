export function formatInt(n) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

export function formatDeaths(estimate) {
  if (typeof estimate?.value === 'number') return formatInt(estimate.value);
  if (typeof estimate?.rangeMin === 'number' && typeof estimate?.rangeMax === 'number') {
    return `${formatInt(estimate.rangeMin)}–${formatInt(estimate.rangeMax)}`;
  }
  return '—';
}

export function sumEstimate(estimate) {
  if (typeof estimate?.value === 'number') return estimate.value;
  if (typeof estimate?.rangeMin === 'number' && typeof estimate?.rangeMax === 'number') {
    // For totals, use midpoint to avoid double-reporting a range.
    return Math.round((estimate.rangeMin + estimate.rangeMax) / 2);
  }
  return 0;
}

