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

// Compact-ish USD formatting. Whole dollars by default; abbreviates large
// values (e.g. $1.2M) when `compact` is set — handy for dashboard cards.
export function formatCurrency(amount, { compact = false } = {}) {
  const n = Number(amount);
  if (amount == null || isNaN(n)) return '—';
  if (compact) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

// Whole-number days from now until a date (negative = overdue / in the past).
export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  const ms = d.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.round(ms / (1000 * 60 * 60 * 24));
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

/**
 * Turn an editable [{ label, number }] list into the contact payload shape the
 * backend expects: dedicated phone/mobile/fax slots (derived from labels for
 * back-compat) plus the full labelled list in `additional_phones`. The backend
 * merges + de-dupes everything, so nothing is lost. Used by the card scanner and
 * the contact editor so phone handling stays identical in both.
 */
export function phonesToPayload(phones) {
  const list = (Array.isArray(phones) ? phones : [])
    .map((p) => ({ label: (p.label || '').trim() || 'Phone', number: (p.number || '').trim() }))
    .filter((p) => p.number);
  const byLabel = (re) => list.find((p) => re.test(p.label.toLowerCase()))?.number || '';
  return {
    phone: byLabel(/office|main|phone|direct|tel|work/) || list[0]?.number || '',
    mobile: byLabel(/mobile|cell/),
    fax: byLabel(/fax/),
    additional_phones: list,
  };
}

/**
 * Pick the best contact to enroll in a sequence: an explicitly-primary contact
 * with an email wins, then any primary, then the first contact with an email
 * (sequences send email), then the first contact. Null if there are none.
 */
export function pickPrimaryContact(contacts) {
  const list = Array.isArray(contacts) ? contacts : [];
  if (list.length === 0) return null;
  return (
    list.find((c) => c.is_primary && c.email) ||
    list.find((c) => c.is_primary) ||
    list.find((c) => c.email) ||
    list[0]
  );
}

export function contactLabel(c) {
  if (!c) return '';
  return [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || 'Unnamed contact';
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
