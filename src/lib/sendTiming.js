// Shared formatting + derivation helpers for the Send-Time Optimization results
// page. Kept out of the component so the pure logic can be unit-tested without a
// DOM. Day-of-week convention is 0=Sunday..6=Saturday everywhere, matching the
// backend send-timing surface.

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_NAMES_FULL = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

// A 0-1 rate as a one-decimal percent. Null/undefined → an em dash.
export function pct(v) {
  if (v == null || Number.isNaN(v)) return '—';
  return `${(v * 100).toFixed(1)}%`;
}

// A signed 0-1 lift as percentage POINTS (the arms are already rates), e.g.
// +4.2 pts. Null → em dash.
export function ptsLabel(v) {
  if (v == null || Number.isNaN(v)) return '—';
  const p = v * 100;
  const sign = p > 0 ? '+' : '';
  return `${sign}${p.toFixed(1)} pts`;
}

// 24h hour → a compact clock label: 0 → 12a, 9 → 9a, 13 → 1p, 15 → 3p.
export function hourLabel(h) {
  const hr = ((h % 24) + 24) % 24;
  if (hr === 0) return '12a';
  if (hr === 12) return '12p';
  return hr < 12 ? `${hr}a` : `${hr - 12}p`;
}

// A local send window ("Tue–Thu, 9–11 AM") from an OptimalWindow object.
export function windowLabel(window) {
  if (!window) return '—';
  const dows = window.dow_preference || [];
  const days = dowRangeLabel(dows);
  const start = hour12(window.hour_start);
  const end = hour12(window.hour_end);
  return `${days}, ${start}–${end}`;
}

function hour12(h) {
  if (h == null) return '?';
  const hr = ((h % 24) + 24) % 24;
  const suffix = hr < 12 ? 'AM' : 'PM';
  const base = hr % 12 === 0 ? 12 : hr % 12;
  return `${base} ${suffix}`;
}

// Collapse a sorted day list into a compact label: [2,3,4] → "Tue–Thu",
// [1,3,5] → "Mon, Wed, Fri", [] → "Any day".
export function dowRangeLabel(dows) {
  const sorted = [...(dows || [])].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
  if (sorted.length === 0) return 'Any day';
  const contiguous = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (contiguous && sorted.length > 2) {
    return `${DAY_NAMES[sorted[0]]}–${DAY_NAMES[sorted[sorted.length - 1]]}`;
  }
  return sorted.map((d) => DAY_NAMES[d]).join(', ');
}

// Pull the optimized/control arms out of the experiment payload by name, so the
// UI never depends on array order.
export function splitArms(experiment) {
  const arms = experiment?.arms || [];
  return {
    optimized: arms.find((a) => a.arm === 'optimized') || null,
    control: arms.find((a) => a.arm === 'control') || null,
  };
}

// 0-1 open rate → a background/opacity class pair for a heatmap cell, normalized
// against the grid's peak so a low-volume list still shows contrast. Returns the
// inline opacity (0.08-1) for an indigo fill.
export function heatIntensity(rate, maxRate) {
  if (!rate || rate <= 0) return 0;
  const ceiling = maxRate && maxRate > 0 ? maxRate : 1;
  const ratio = Math.min(1, rate / ceiling);
  // Floor so any non-zero cell is visible, ramp to full at the peak.
  return 0.12 + ratio * 0.88;
}

// Index the heatmap cells by "dow_hour" for O(1) lookup while rendering the grid.
export function indexCells(cells) {
  const map = {};
  let maxRate = 0;
  for (const c of cells || []) {
    map[`${c.dow}_${c.hour}`] = c;
    if (c.sent >= 3 && c.open_rate > maxRate) maxRate = c.open_rate;
  }
  // If no cell cleared the sample floor, fall back to the raw peak so the grid
  // still has contrast.
  if (maxRate === 0) {
    for (const c of cells || []) {
      if (c.open_rate > maxRate) maxRate = c.open_rate;
    }
  }
  return { map, maxRate };
}

// The compact hour span actually worth showing: the min→max hour that has any
// data, clamped to a sensible business-ish default when the grid is empty.
export function activeHourRange(cells) {
  const hours = (cells || []).map((c) => c.hour);
  if (hours.length === 0) return { start: 6, end: 20 };
  const start = Math.max(0, Math.min(...hours));
  const end = Math.min(23, Math.max(...hours));
  return { start, end };
}
