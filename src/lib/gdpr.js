// Helpers for the GDPR data-subject console. Kept pure so the summary rules are
// unit-testable independent of the network and React.

// A loose email check — enough to stop obviously-empty or malformed lookups
// from hitting the server, not a validity guarantee.
export function isLikelyEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

export function humanizeKey(key) {
  return String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Turn an export payload of unknown shape into a list of display sections, so
// the UI can render "Companies — 3 records", "Contact — object", etc. without
// knowing the backend's exact schema.
export function summarizeExport(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
  return Object.entries(data).map(([key, value]) => {
    if (Array.isArray(value)) {
      return { key, label: humanizeKey(key), kind: 'array', count: value.length };
    }
    if (value && typeof value === 'object') {
      return { key, label: humanizeKey(key), kind: 'object', count: Object.keys(value).length };
    }
    return { key, label: humanizeKey(key), kind: 'scalar', value };
  });
}
