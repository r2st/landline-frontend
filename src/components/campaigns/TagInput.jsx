import { useState } from 'react';
import { X } from 'lucide-react';

// Chips for a list field. Enter or comma adds what's typed; Backspace on an
// empty box removes the last chip.
export default function TagInput({ id, label, value, onChange, placeholder, hint }) {
  const [draft, setDraft] = useState('');

  const add = (text) => {
    const parts = text.split(',').map((t) => t.trim()).filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    parts.forEach((p) => {
      if (!next.some((v) => v.toLowerCase() === p.toLowerCase())) next.push(p);
    });
    onChange(next);
    setDraft('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      <div className="mt-1 flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2 py-1.5 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
            {v}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== v))}
              aria-label={`Remove ${v} from ${label}`}
              className="rounded-full text-indigo-400 hover:text-indigo-700"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => add(draft)}
          placeholder={value.length ? '' : placeholder}
          className="min-w-[8rem] flex-1 border-0 bg-transparent p-1 text-sm focus:outline-none focus:ring-0"
        />
      </div>
    </div>
  );
}
