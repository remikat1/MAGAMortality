const DEFAULTS = {
  topic: [],
  politician: [],
  attribution: 'both', // direct|statistical|both
  count: 'both' // actual|projected|both
};

function toArrayParam(values) {
  return values.join(',');
}

function fromArrayParam(value) {
  if (!value) return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

export function readFiltersFromUrl(locationLike) {
  const url = new URL(locationLike?.href ?? window.location.href);
  const topic = fromArrayParam(url.searchParams.get('topic'));
  const politician = fromArrayParam(url.searchParams.get('politician'));
  const attribution = url.searchParams.get('attribution') || DEFAULTS.attribution;
  const count = url.searchParams.get('count') || DEFAULTS.count;

  return {
    topic,
    politician,
    attribution: ['direct', 'statistical', 'both'].includes(attribution) ? attribution : DEFAULTS.attribution,
    count: ['actual', 'projected', 'both'].includes(count) ? count : DEFAULTS.count
  };
}

export function writeFiltersToUrl(filters) {
  const url = new URL(window.location.href);

  if (filters.topic?.length) url.searchParams.set('topic', toArrayParam(filters.topic));
  else url.searchParams.delete('topic');

  if (filters.politician?.length) url.searchParams.set('politician', toArrayParam(filters.politician));
  else url.searchParams.delete('politician');

  if (filters.attribution && filters.attribution !== DEFAULTS.attribution) url.searchParams.set('attribution', filters.attribution);
  else url.searchParams.delete('attribution');

  if (filters.count && filters.count !== DEFAULTS.count) url.searchParams.set('count', filters.count);
  else url.searchParams.delete('count');

  window.history.replaceState({}, '', url);
}

