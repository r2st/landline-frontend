export const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1';

export const STAGES = ['new', 'researched', 'scored', 'contacted', 'engaged', 'qualified', 'opportunity'];

export const STAGE_LABELS = {
  new: 'New',
  researched: 'Researched',
  scored: 'Scored',
  contacted: 'Contacted',
  engaged: 'Engaged',
  qualified: 'Qualified',
  opportunity: 'Opportunity',
};

export const STAGE_COLORS = {
  new: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', hex: '#6b7280' },
  researched: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', hex: '#3b82f6' },
  scored: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', hex: '#eab308' },
  contacted: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', hex: '#f97316' },
  engaged: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', hex: '#a855f7' },
  qualified: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', hex: '#22c55e' },
  opportunity: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', hex: '#10b981' },
};

export const COUNTRIES = ['US', 'CA'];
export const SOURCES = ['csv_import', 'manual', 'web_scrape', 'referral', 'linkedin'];
export const SOURCE_LABELS = {
  csv_import: 'CSV Import',
  manual: 'Manual',
  web_scrape: 'Web Scrape',
  referral: 'Referral',
  linkedin: 'LinkedIn',
};
