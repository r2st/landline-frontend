// Shared metadata for the investor CRM: the outreach pipeline (status) and the
// round the investor typically leads (stage). Kept in one place so the list,
// funnel, detail view, and modal all label + colour things identically.

// Ordered outreach pipeline — this is the funnel, top → bottom.
export const INVESTOR_STATUSES = [
  { value: 'researching', label: 'Researching', color: 'bg-slate-500', badge: 'bg-slate-100 text-slate-700 ring-slate-200', text: 'text-slate-600' },
  { value: 'contacted', label: 'Contacted', color: 'bg-sky-500', badge: 'bg-sky-100 text-sky-700 ring-sky-200', text: 'text-sky-600' },
  { value: 'interested', label: 'Interested', color: 'bg-indigo-500', badge: 'bg-indigo-100 text-indigo-700 ring-indigo-200', text: 'text-indigo-600' },
  { value: 'meeting_scheduled', label: 'Meeting Scheduled', color: 'bg-violet-500', badge: 'bg-violet-100 text-violet-700 ring-violet-200', text: 'text-violet-600' },
  { value: 'due_diligence', label: 'Due Diligence', color: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700 ring-amber-200', text: 'text-amber-600' },
  { value: 'committed', label: 'Committed', color: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700 ring-emerald-200', text: 'text-emerald-600' },
  { value: 'passed', label: 'Passed', color: 'bg-rose-500', badge: 'bg-rose-100 text-rose-700 ring-rose-200', text: 'text-rose-600' },
];

export const INVESTOR_STAGES = [
  { value: 'seed', label: 'Seed', badge: 'bg-green-100 text-green-700 ring-green-200' },
  { value: 'series-a', label: 'Series A', badge: 'bg-blue-100 text-blue-700 ring-blue-200' },
  { value: 'series-b', label: 'Series B', badge: 'bg-purple-100 text-purple-700 ring-purple-200' },
  { value: 'growth', label: 'Growth', badge: 'bg-orange-100 text-orange-700 ring-orange-200' },
];

const STATUS_MAP = Object.fromEntries(INVESTOR_STATUSES.map((s) => [s.value, s]));
const STAGE_MAP = Object.fromEntries(INVESTOR_STAGES.map((s) => [s.value, s]));

export function statusMeta(value) {
  return (
    STATUS_MAP[(value || '').toLowerCase()] || {
      value,
      label: value ? value.replace(/_/g, ' ') : 'Unknown',
      color: 'bg-gray-400',
      badge: 'bg-gray-100 text-gray-600 ring-gray-200',
      text: 'text-gray-500',
    }
  );
}

export function stageMeta(value) {
  const key = (value || '').toLowerCase().replace(/\s+/g, '-');
  return (
    STAGE_MAP[key] || {
      value,
      label: value ? value.replace(/-/g, ' ') : '—',
      badge: 'bg-gray-100 text-gray-600 ring-gray-200',
    }
  );
}

// The step in the pipeline the investor has reached (0-based). `passed` is a
// terminal "off-ramp" so it isn't counted as forward progress.
export function statusIndex(value) {
  const idx = INVESTOR_STATUSES.findIndex((s) => s.value === (value || '').toLowerCase());
  return idx < 0 ? 0 : idx;
}
