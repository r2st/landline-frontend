export const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1';

// Full lead→client pipeline. `customer` and `disqualified` are the won/lost
// terminal stages — both already permitted by the company.stage DB check
// constraint, so transitioning into them needs no backend change.
export const STAGES = ['new', 'researched', 'scored', 'contacted', 'engaged', 'qualified', 'opportunity', 'customer', 'disqualified'];

export const STAGE_LABELS = {
  new: 'New',
  researched: 'Researched',
  scored: 'Scored',
  contacted: 'Contacted',
  engaged: 'Engaged',
  qualified: 'Qualified',
  opportunity: 'Opportunity',
  customer: 'Client',
  disqualified: 'Churned',
};

export const STAGE_COLORS = {
  new: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', hex: '#6b7280' },
  researched: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', hex: '#3b82f6' },
  scored: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', hex: '#eab308' },
  contacted: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', hex: '#f97316' },
  engaged: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', hex: '#a855f7' },
  qualified: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', hex: '#22c55e' },
  opportunity: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', hex: '#10b981' },
  customer: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300', hex: '#14b8a6' },
  disqualified: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', hex: '#ef4444' },
};

// ─── Client management ──────────────────────────────────────────────────────

// Client health — a coarse RAG status derived from a 0-100 health score.
export const HEALTH_STATUSES = ['green', 'yellow', 'red'];
export const HEALTH_LABELS = {
  green: 'Healthy',
  yellow: 'At Watch',
  red: 'At Risk',
};
export const HEALTH_COLORS = {
  green: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', ring: 'ring-green-600/20', hex: '#22c55e', dot: 'bg-green-500' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', ring: 'ring-yellow-600/20', hex: '#eab308', dot: 'bg-yellow-500' },
  red: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', ring: 'ring-red-600/20', hex: '#ef4444', dot: 'bg-red-500' },
};

// Map a 0-100 health score to a RAG status.
export function healthStatusFromScore(score) {
  if (score == null) return null;
  if (score >= 70) return 'green';
  if (score >= 40) return 'yellow';
  return 'red';
}

// Deal pipeline statuses.
export const DEAL_STATUSES = ['pending', 'won', 'lost'];
export const DEAL_STATUS_LABELS = {
  pending: 'Pending',
  won: 'Won',
  lost: 'Lost',
};
export const DEAL_STATUS_COLORS = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', hex: '#f59e0b' },
  won: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', hex: '#22c55e' },
  lost: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', hex: '#ef4444' },
};

// Deal pipeline stages (kanban columns).
export const DEAL_STAGES = ['qualification', 'discovery', 'proposal', 'negotiation', 'closing'];
export const DEAL_STAGE_LABELS = {
  qualification: 'Qualification',
  discovery: 'Discovery',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  closing: 'Closing',
};
export const DEAL_STAGE_PROBABILITIES = {
  qualification: 10,
  discovery: 25,
  proposal: 50,
  negotiation: 75,
  closing: 90,
};
export const DEAL_STAGE_COLORS = {
  qualification: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-300', hex: '#0ea5e9', light: '#f0f9ff' },
  discovery: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', hex: '#3b82f6', light: '#eff6ff' },
  proposal: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-300', hex: '#8b5cf6', light: '#f5f3ff' },
  negotiation: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', hex: '#f59e0b', light: '#fffbeb' },
  closing: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300', hex: '#10b981', light: '#ecfdf5' },
};

export const LOST_REASONS = ['Budget', 'Timing', 'Competition', 'No Response', 'Other'];

// Task priority + status.
export const TASK_PRIORITIES = ['high', 'medium', 'low'];
export const TASK_PRIORITY_LABELS = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};
export const TASK_PRIORITY_COLORS = {
  high: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-400', dot: 'bg-red-500', accent: 'border-l-red-500' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-400', dot: 'bg-amber-500', accent: 'border-l-amber-500' },
  low: { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-400', dot: 'bg-sky-500', accent: 'border-l-sky-400' },
};

export const TASK_STATUSES = ['open', 'in_progress', 'completed'];
export const TASK_STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In Progress',
  completed: 'Completed',
};

// Interaction types — meetings, calls, notes logged against a client.
export const INTERACTION_TYPES = ['meeting', 'call', 'email', 'note'];
export const INTERACTION_TYPE_LABELS = {
  meeting: 'Meeting',
  call: 'Call',
  email: 'Email',
  note: 'Note',
};
export const INTERACTION_TYPE_COLORS = {
  meeting: { bg: 'bg-purple-50', text: 'text-purple-600' },
  call: { bg: 'bg-green-50', text: 'text-green-600' },
  email: { bg: 'bg-blue-50', text: 'text-blue-600' },
  note: { bg: 'bg-gray-100', text: 'text-gray-600' },
};

export const COUNTRIES = ['US', 'CA'];
// Values the backend actually stores on Company.source. The agent-sourced ones
// (google_places, apollo) are what the prospector writes, so they have to be
// selectable here for a "Leads found" drill-down to resolve to anything.
export const SOURCES = [
  'google_places',
  'apollo',
  'csv_import',
  'manual',
  'web_scrape',
  'referral',
  'linkedin',
];
export const SOURCE_LABELS = {
  google_places: 'Google Places',
  apollo: 'Apollo',
  csv_import: 'CSV Import',
  manual: 'Manual',
  web_scrape: 'Web Scrape',
  referral: 'Referral',
  linkedin: 'LinkedIn',
};
