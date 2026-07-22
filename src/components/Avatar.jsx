import { cn } from '../lib/utils';

// A stable palette of tinted avatar colors. The index is derived from the seed
// so the same person always gets the same color across the app.
const PALETTE = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-teal-100 text-teal-700',
  'bg-fuchsia-100 text-fuchsia-700',
  'bg-cyan-100 text-cyan-700',
  'bg-orange-100 text-orange-700',
];

const SIZE = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-11 w-11 text-base',
};

// Derive up to two initials from a name, or fall back to the first character of
// an email local-part. Returns '?' when there's nothing usable.
export function initialsFor(name, email) {
  const n = (name || '').trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  const local = (email || '').trim().split('@')[0];
  if (local) return local.slice(0, 2).toUpperCase();
  return '?';
}

// Deterministic palette index from a seed string (djb2-ish hash).
export function colorFor(seed) {
  const s = (seed || '').toLowerCase();
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

/**
 * Circular initials avatar with a stable, seed-derived color. Used on inbox
 * thread rows and message bubbles so "who" is scannable at a glance.
 */
export default function Avatar({ name, email, size = 'md', className, title }) {
  const seed = email || name || '';
  return (
    <span
      className={cn(
        'inline-flex flex-shrink-0 select-none items-center justify-center rounded-full font-semibold uppercase',
        SIZE[size] || SIZE.md,
        colorFor(seed),
        className
      )}
      title={title ?? (name || email || undefined)}
      aria-hidden="true"
    >
      {initialsFor(name, email)}
    </span>
  );
}
