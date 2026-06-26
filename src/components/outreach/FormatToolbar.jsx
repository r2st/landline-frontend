import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Heading2,
  Pilcrow,
  Minus,
} from 'lucide-react';

export default function FormatToolbar({ textareaRef, value, onChange }) {
  const wrap = (tag, fallback) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    let snippet;
    if (tag === 'a') {
      const url = selected.startsWith('http') ? selected : 'https://';
      const linkText = selected.startsWith('http') ? 'link text' : (selected || 'link text');
      snippet = `<a href="${url}">${linkText}</a>`;
    } else if (tag === 'ul') {
      snippet = selected
        ? `<ul>\n${selected.split('\n').map(l => `  <li>${l.trim()}</li>`).join('\n')}\n</ul>`
        : '<ul>\n  <li>Item</li>\n</ul>';
    } else if (tag === 'ol') {
      snippet = selected
        ? `<ol>\n${selected.split('\n').map(l => `  <li>${l.trim()}</li>`).join('\n')}\n</ol>`
        : '<ol>\n  <li>Item</li>\n</ol>';
    } else if (tag === 'hr') {
      snippet = '\n<hr>\n';
    } else {
      snippet = `<${tag}>${selected || fallback || ''}</${tag}>`;
    }
    onChange(value.slice(0, start) + snippet + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = start;
      el.selectionEnd = start + snippet.length;
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-t-lg border border-b-0 border-gray-300 bg-gray-50 px-2 py-1.5">
      <span className="mr-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">Format:</span>
      {[
        { icon: Bold, tag: 'strong', label: 'Bold' },
        { icon: Italic, tag: 'em', label: 'Italic' },
        { icon: Heading2, tag: 'h2', label: 'Heading' },
        { icon: Link2, tag: 'a', label: 'Link' },
        { icon: List, tag: 'ul', label: 'Bullet List' },
        { icon: ListOrdered, tag: 'ol', label: 'Numbered List' },
        { icon: Pilcrow, tag: 'p', label: 'Paragraph' },
        { icon: Minus, tag: 'hr', label: 'Divider' },
      ].map((btn) => (
        <button
          key={btn.tag}
          type="button"
          title={btn.label}
          onClick={() => wrap(btn.tag)}
          className="rounded p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
        >
          <btn.icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
