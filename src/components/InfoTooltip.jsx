import { useId, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { cn } from '../lib/utils';

// Field-level help. A small "?" icon that reveals a short explanation on hover
// or focus (and toggles on click for touch). Use it next to a label or setting
// whose meaning isn't obvious from its name.
//
//   <label>Throttle factor <InfoTooltip text="How much Dialtone slows this account when its reputation slips." /></label>
//
// Keep `text` to a sentence or two — for anything longer, link to a help
// article with a <HelpIcon> instead.
export default function InfoTooltip({ text, label = 'More information', className = '', side = 'top' }) {
  const [open, setOpen] = useState(false);
  const id = useId();

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <span className={cn('relative inline-flex align-middle', className)}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        // Focus covers both keyboard users and touch taps (a tap focuses the
        // button, revealing the tooltip; tapping away blurs it and hides it).
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        // Don't navigate or submit if this sits inside a link/form.
        onClick={(e) => e.preventDefault()}
        className="inline-flex text-gray-400 transition-colors hover:text-gray-600 focus:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-full"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            'absolute z-50 w-56 rounded-lg bg-gray-900 px-3 py-2 text-xs font-normal leading-relaxed text-gray-100 shadow-lg',
            positions[side] || positions.top
          )}
        >
          {text}
        </span>
      )}
    </span>
  );
}
