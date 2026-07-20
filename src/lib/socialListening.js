// Vocabulary + formatting for the Social Listening Agent dashboard.
//
// The backend classifies each signal into one type (funding, hiring, …) and a
// source (news, job_posting, …), and scores relevance 0-100. This module maps
// those to labels + tones so the feed, filters, and chart read as one system.

export const SIGNAL_TYPE_META = {
  funding: { label: 'Funding', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', fill: '#059669' },
  hiring: { label: 'Hiring', tone: 'bg-blue-50 text-blue-700 ring-blue-600/20', fill: '#2563eb' },
  expansion: { label: 'Expansion', tone: 'bg-violet-50 text-violet-700 ring-violet-600/20', fill: '#7c3aed' },
  leadership_change: { label: 'Leadership change', tone: 'bg-amber-50 text-amber-700 ring-amber-600/20', fill: '#d97706' },
  product_launch: { label: 'Product launch', tone: 'bg-pink-50 text-pink-700 ring-pink-600/20', fill: '#db2777' },
  partnership: { label: 'Partnership', tone: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20', fill: '#0891b2' },
};

const UNKNOWN_TYPE = {
  label: 'Unclassified',
  tone: 'bg-gray-100 text-gray-600 ring-gray-500/20',
  fill: '#9ca3af',
};

export function signalTypeMeta(type) {
  return SIGNAL_TYPE_META[type] || UNKNOWN_TYPE;
}

export const SOURCE_TYPE_LABELS = {
  news: 'News',
  job_posting: 'Job posting',
  social: 'Social',
  funding: 'Funding',
  company_update: 'Company update',
};

export function sourceLabel(source) {
  return SOURCE_TYPE_LABELS[source] || 'Signal';
}

export const STATUS_LABELS = {
  new: 'New',
  reviewed: 'Reviewed',
  actioned: 'Actioned',
  dismissed: 'Dismissed',
};

// Relevance band → the badge colour on a signal card. High-intent reads green,
// mid amber, low neutral — so an operator scans the feed by colour.
export function relevanceTone(score) {
  if (score == null) return 'bg-gray-100 text-gray-500 ring-gray-500/20';
  if (score >= 80) return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
  if (score >= 60) return 'bg-amber-50 text-amber-700 ring-amber-600/20';
  return 'bg-gray-100 text-gray-600 ring-gray-500/20';
}
