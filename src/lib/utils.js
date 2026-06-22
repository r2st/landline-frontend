export function getScoreColor(score) {
  if (score >= 81) return 'text-green-700 bg-green-100 border-green-300';
  if (score >= 61) return 'text-blue-700 bg-blue-100 border-blue-300';
  if (score >= 31) return 'text-yellow-700 bg-yellow-100 border-yellow-300';
  return 'text-red-700 bg-red-100 border-red-300';
}

export function getScoreLabel(score) {
  if (score >= 81) return 'Hot';
  if (score >= 61) return 'Warm';
  if (score >= 31) return 'Cool';
  return 'Cold';
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatNumber(num) {
  return new Intl.NumberFormat('en-US').format(num);
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function getInitials(first, last) {
  // Accepts either (first, last) or a single full-name string.
  if (last === undefined && typeof first === 'string' && first.includes(' ')) {
    return first.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  }
  const a = (first || '').trim();
  const b = (last || '').trim();
  const initials = ((a[0] || '') + (b[0] || '')).toUpperCase();
  return initials || '?';
}

/**
 * Build a de-duplicated, labelled list of all phone numbers on a contact,
 * merging the dedicated phone/mobile/fax columns with the additional_phones
 * JSON list. Returns [{ label, number }].
 */
export function contactPhones(contact) {
  if (!contact) return [];
  const out = [];
  const seen = new Set();
  const digits = (s) => String(s).replace(/\D/g, '');
  const add = (label, number) => {
    const num = (number == null ? '' : String(number)).trim();
    if (!num) return;
    const key = digits(num) || num.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ label: label || 'Phone', number: num });
  };
  add('Office', contact.phone);
  add('Mobile', contact.mobile);
  add('Fax', contact.fax);
  const extra = Array.isArray(contact.additional_phones) ? contact.additional_phones : [];
  for (const p of extra) {
    if (p && typeof p === 'object') add(p.label, p.number);
    else add(null, p);
  }
  return out;
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const then = new Date(dateStr);
  if (isNaN(then)) return '';
  const seconds = Math.floor((new Date() - then) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
