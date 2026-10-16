import { useId } from 'react';
import { cn } from '../lib/utils';

/**
 * Landline brand mark — an abstract "connection" motif: two endpoints
 * linked by an arc with a transmission node, evoking a line that connects
 * two parties. Rendered inline so it stays crisp at any size and inherits
 * the surrounding layout.
 */
export function LogoMark({ className, size = 32, rounded = 9 }) {
  // Unique per instance so duplicate marks (e.g. sidebar + mobile bar) don't
  // collide on the gradient id — a collision lets one reference a paint server
  // inside a display:none subtree and render blank.
  const id = `landline-grad-${useId()}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="DoAide Prospect"
    >
      <defs>
        <linearGradient id={id} x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#4338CA" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx={rounded} fill={`url(#${id})`} />
      <path
        d="M12.5 25.5 Q20 13 27.5 25.5"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="12.5" cy="25.5" r="3.4" fill="#fff" />
      <circle cx="27.5" cy="25.5" r="3.4" fill="#fff" />
      <circle cx="20" cy="13.2" r="2.2" fill="#fff" fillOpacity="0.95" />
    </svg>
  );
}

/**
 * Full logo lockup: mark + "Landline" wordmark.
 */
export default function Logo({ className, markSize = 30, showWord = true, wordClassName }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark size={markSize} />
      {showWord && (
        <span
          className={cn(
            'text-[19px] font-bold tracking-tight text-gray-900',
            wordClassName
          )}
        >
          DoAide Prospect
        </span>
      )}
    </div>
  );
}
