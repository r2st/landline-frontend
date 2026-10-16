// Vocabulary and formatting for the auto-pause rail (Feature 2).
//
// The metrics are not the same kind of number: bounce_rate and complaint_rate
// are fractions 0..1, hard_bounce_count is a plain count. Rendering a count as
// "1200%" or a rate as "0.03" are both nonsense, so formatting keys off the
// metric rather than the value.

export const METRIC_LABELS = {
  bounce_rate: 'Bounce rate',
  complaint_rate: 'Complaint rate',
  hard_bounce_count: 'Hard bounces',
};

export const RATE_METRICS = new Set(['bounce_rate', 'complaint_rate']);

export function isRateMetric(metric) {
  return RATE_METRICS.has(metric);
}

// A rate as a percentage with one decimal (0.043 → "4.3%"); a count as itself.
export function formatMetricValue(metric, value) {
  if (value == null) return '—';
  if (!isRateMetric(metric)) return String(value);
  return `${(value * 100).toFixed(1)}%`;
}

// pass | warn | breach — the per-metric verdict.
export const STATUS_TONE = {
  pass: 'bg-green-50 text-green-700 ring-green-600/20',
  warn: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  breach: 'bg-red-50 text-red-700 ring-red-600/20',
};

// healthy | watch | breach | paused — the rail's overall verdict.
export const OVERALL = {
  healthy: {
    label: 'Healthy',
    tone: 'bg-green-50 text-green-700 ring-green-600/20',
    blurb: 'Every signal is inside its threshold.',
  },
  watch: {
    label: 'Watch',
    tone: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    blurb: 'A signal has crossed its warning line but has not tripped the pause.',
  },
  breach: {
    label: 'Breach',
    tone: 'bg-red-50 text-red-700 ring-red-600/20',
    blurb: 'A signal is over its threshold.',
  },
  paused: {
    label: 'Paused',
    tone: 'bg-red-50 text-red-700 ring-red-600/20',
    blurb: 'Autopilot has halted its own sending.',
  },
};

// How far a metric has travelled toward its threshold, as a 0..100 bar. Counts
// and rates both work because it's a ratio against that metric's own threshold.
export function thresholdProgress(observed, threshold) {
  if (!threshold || observed == null) return 0;
  return Math.max(0, Math.min(100, (observed / threshold) * 100));
}
