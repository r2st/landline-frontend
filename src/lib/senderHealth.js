// Vocabulary, thresholds and formatting for the Sender Health dashboard.
//
// The backend already lands each account in one of four statuses
// (healthy | watch | throttled | critical). This module maps that status to
// tone, and — because the /senders payload does NOT ship the thresholds — mirrors
// the server's pause thresholds so the page can raise "approaching danger"
// callouts before an account actually gets throttled.
//
// Threshold source of truth (backend app/config.py):
//   sender_bounce_rate_throttle    = 0.05   (5%)
//   sender_complaint_rate_throttle = 0.003  (0.3%)
//   sender_min_reputation          = 40     (critical below)
// Keep these in sync if the backend defaults change.

export const THRESHOLDS = {
  bounceRate: 0.05,
  complaintRate: 0.003,
  minReputation: 40,
};

// We warn while still safe — at 80% of the throttle line — so an operator can
// act before Dialtone throttles the account out from under them.
const WARN_FRACTION = 0.8;

export const STATUS = {
  healthy: {
    label: 'Healthy',
    tone: 'bg-green-50 text-green-700 ring-green-600/20',
    dot: 'bg-green-500',
    bar: 'bg-green-500',
    blurb: 'Sending at full volume.',
  },
  watch: {
    label: 'Watch',
    tone: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    dot: 'bg-amber-500',
    bar: 'bg-amber-500',
    blurb: 'Reputation is soft — worth an eye, not throttled yet.',
  },
  throttled: {
    label: 'Throttled',
    tone: 'bg-orange-50 text-orange-700 ring-orange-600/20',
    dot: 'bg-orange-500',
    bar: 'bg-orange-500',
    blurb: 'Daily cap cut back; volume is shifting to healthier accounts.',
  },
  critical: {
    label: 'Critical',
    tone: 'bg-red-50 text-red-700 ring-red-600/20',
    dot: 'bg-red-500',
    bar: 'bg-red-500',
    blurb: 'All but stopped — reputation is too low to keep sending.',
  },
};

// An unrecognised status must never render as green. Fall back to a visibly
// neutral "unknown" rather than silently borrowing "healthy".
export const UNKNOWN_STATUS = {
  label: 'Unknown',
  tone: 'bg-gray-100 text-gray-500 ring-gray-500/20',
  dot: 'bg-gray-400',
  bar: 'bg-gray-400',
  blurb: 'Status not recognised.',
};

export function statusMeta(status) {
  return STATUS[status] || UNKNOWN_STATUS;
}

// The reputation band drives the big number's colour. Independent of `status`
// so the score reads correctly even if a future status value is unknown.
export function reputationTone(score) {
  if (score == null) return 'text-gray-400';
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-amber-600';
  if (score >= THRESHOLDS.minReputation) return 'text-orange-600';
  return 'text-red-600';
}

export const fmtPct = (v) => (v == null ? '—' : `${(v * 100).toFixed(2)}%`);
export const fmtRepDelta = (d) => (d == null || d === 0 ? null : `${d > 0 ? '+' : ''}${d}`);

// Throttle factor 0..1 → the account's share of its normal daily cap.
export function fmtThrottle(factor) {
  if (factor == null) return '—';
  return `${Math.round(factor * 100)}%`;
}

// Which metrics on this sender are approaching (but not yet over) a pause line.
// Returns [] for a clean account. A metric already over the line is reported as
// `severity: 'breach'` so the caller can style it red rather than amber.
export function senderWarnings(sender) {
  if (!sender) return [];
  const out = [];
  const check = (value, warnAt, breachAt, label, format) => {
    if (value == null) return;
    if (value >= breachAt) {
      out.push({ label, severity: 'breach', value, threshold: breachAt, format });
    } else if (value >= warnAt) {
      out.push({ label, severity: 'warn', value, threshold: breachAt, format });
    }
  };

  check(
    sender.bounce_rate_7d,
    THRESHOLDS.bounceRate * WARN_FRACTION,
    THRESHOLDS.bounceRate,
    'Bounce rate',
    fmtPct,
  );
  check(
    sender.complaint_rate_7d,
    THRESHOLDS.complaintRate * WARN_FRACTION,
    THRESHOLDS.complaintRate,
    'Complaint rate',
    fmtPct,
  );

  // Reputation nearing the critical floor is its own warning (higher = better,
  // so the direction is inverted).
  const repWarnAt = THRESHOLDS.minReputation / WARN_FRACTION; // 40 / 0.8 = 50
  if (sender.reputation_score != null && sender.reputation_score <= repWarnAt) {
    out.push({
      label: 'Reputation',
      severity: sender.reputation_score < THRESHOLDS.minReputation ? 'breach' : 'warn',
      value: sender.reputation_score,
      threshold: THRESHOLDS.minReputation,
      format: (v) => String(v),
    });
  }

  return out;
}
