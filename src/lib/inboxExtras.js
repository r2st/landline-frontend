// Presentation + scheduling helpers for the Inbox labels and snooze features.
// Kept separate from Inbox.jsx so the colour map and snooze math are
// unit-testable in isolation.

// Label colour token → Tailwind chip classes. The backend stores a free-form
// token; anything unknown falls back to gray so a new colour never renders
// unstyled.
export const LABEL_COLORS = {
  gray:   'bg-gray-100 text-gray-700 ring-gray-500/20',
  red:    'bg-red-50 text-red-700 ring-red-600/20',
  orange: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  amber:  'bg-amber-50 text-amber-700 ring-amber-600/20',
  green:  'bg-green-50 text-green-700 ring-green-600/20',
  teal:   'bg-teal-50 text-teal-700 ring-teal-600/20',
  blue:   'bg-blue-50 text-blue-700 ring-blue-600/20',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  purple: 'bg-purple-50 text-purple-700 ring-purple-600/20',
  pink:   'bg-pink-50 text-pink-700 ring-pink-600/20',
};

// Solid dot swatch per token — used in the colour picker and the tiny chip dot.
export const LABEL_DOTS = {
  gray: 'bg-gray-400', red: 'bg-red-500', orange: 'bg-orange-500',
  amber: 'bg-amber-500', green: 'bg-green-500', teal: 'bg-teal-500',
  blue: 'bg-blue-500', indigo: 'bg-indigo-500', purple: 'bg-purple-500',
  pink: 'bg-pink-500',
};

export const LABEL_COLOR_TOKENS = Object.keys(LABEL_DOTS);

export function labelChipClasses(color) {
  return LABEL_COLORS[color] || LABEL_COLORS.gray;
}

export function labelDotClass(color) {
  return LABEL_DOTS[color] || LABEL_DOTS.gray;
}

// Snooze presets relative to `now`. Each entry's `date` is a concrete Date the
// caller turns into an ISO string. "Later" = +3h; "Tomorrow"/"Next week" land
// at 9am local so a thread comes back at the start of a working block, not the
// middle of the night.
export function snoozePresets(now = new Date()) {
  const later = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const nextWeek = new Date(now);
  // Days until next Monday (1..7). If today is Monday, jump a full week.
  const daysUntilMonday = ((8 - nextWeek.getDay()) % 7) || 7;
  nextWeek.setDate(nextWeek.getDate() + daysUntilMonday);
  nextWeek.setHours(9, 0, 0, 0);

  return [
    { key: 'later', label: 'Later today', sub: '+3 hours', date: later },
    { key: 'tomorrow', label: 'Tomorrow', sub: '9:00 AM', date: tomorrow },
    { key: 'next_week', label: 'Next week', sub: 'Mon 9:00 AM', date: nextWeek },
  ];
}

// Compact "until" label for a snoozed-thread badge (e.g. "Jul 24, 9:00 AM").
export function formatSnoozeUntil(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}
