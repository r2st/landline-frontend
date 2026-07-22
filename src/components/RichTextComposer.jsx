import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Bold, Italic, Link2 } from 'lucide-react';
import { cn } from '../lib/utils';

// Scoped styles: the empty-state placeholder and basic rich formatting so the
// WYSIWYG surface reads like the email it will send.
const COMPOSER_STYLES = `
  .rt-editor:empty:before {
    content: attr(data-placeholder);
    color: #9ca3af;
    pointer-events: none;
  }
  .rt-editor a { color: #4f46e5; text-decoration: underline; }
  .rt-editor strong, .rt-editor b { font-weight: 600; }
  .rt-editor em, .rt-editor i { font-style: italic; }
  .rt-editor p { margin: 0 0 0.5rem; }
`;

// Guarded document.execCommand — jsdom (tests) and some browsers may not
// implement it; formatting is a progressive enhancement, never a hard dep.
function exec(command, value = null) {
  try {
    if (typeof document !== 'undefined' && document.execCommand) {
      document.execCommand(command, false, value);
      return true;
    }
  } catch {
    /* no-op */
  }
  return false;
}

/**
 * A minimal rich-text email composer built on `contentEditable`, with a
 * bold / italic / link toolbar. Emits `{ html, text }` on every edit so the
 * caller can persist a draft and build the send payload.
 *
 * The surface is uncontrolled internally (so the caret never jumps mid-type)
 * but re-syncs from `value` whenever the caller changes it out-of-band —
 * switching threads, or inserting a template / signature / AI draft.
 */
const RichTextComposer = forwardRef(function RichTextComposer(
  { value = '', onChange, onSend, placeholder = 'Write your reply…', ariaLabel = 'Reply body', className, disabled = false },
  ref
) {
  const editorRef = useRef(null);
  // The last HTML we emitted, so an echo of our own onChange doesn't trigger a
  // disruptive innerHTML reset (which would move the caret to the start). Seeded
  // with null (not `value`) so the initial value is written to the DOM on mount.
  const lastEmitted = useRef(null);

  const emit = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const html = el.innerHTML;
    const text = el.innerText ?? el.textContent ?? '';
    lastEmitted.current = html;
    onChange?.({ html, text });
  }, [onChange]);

  // Sync external value changes (thread switch, template/AI insert) into the DOM.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (value !== lastEmitted.current && value !== el.innerHTML) {
      el.innerHTML = value || '';
      lastEmitted.current = value || '';
    }
  }, [value]);

  useImperativeHandle(ref, () => ({
    focus: () => editorRef.current?.focus(),
    clear: () => {
      const el = editorRef.current;
      if (el) el.innerHTML = '';
      lastEmitted.current = '';
      onChange?.({ html: '', text: '' });
    },
  }), [onChange]);

  const runCommand = (command) => {
    if (disabled) return;
    editorRef.current?.focus();
    if (command === 'createLink') {
      // eslint-disable-next-line no-alert
      const url = typeof window !== 'undefined' ? window.prompt('Link URL', 'https://') : null;
      if (url) exec('createLink', url);
    } else {
      exec(command);
    }
    emit();
  };

  const handleKeyDown = (e) => {
    // ⌘/Ctrl+Enter sends. Bold/italic keep their native contentEditable bindings.
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      onSend?.();
    }
  };

  const TOOLBAR = [
    { icon: Bold, command: 'bold', label: 'Bold' },
    { icon: Italic, command: 'italic', label: 'Italic' },
    { icon: Link2, command: 'createLink', label: 'Insert link' },
  ];

  return (
    <div className={cn('rounded-lg border border-gray-300 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500', className)}>
      <style>{COMPOSER_STYLES}</style>
      <div className="flex items-center gap-0.5 border-b border-gray-200 px-2 py-1.5">
        {TOOLBAR.map((btn) => (
          <button
            key={btn.command}
            type="button"
            title={btn.label}
            aria-label={btn.label}
            onMouseDown={(e) => e.preventDefault() /* keep selection */}
            onClick={() => runCommand(btn.command)}
            disabled={disabled}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
          >
            <btn.icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        role="textbox"
        aria-label={ariaLabel}
        aria-multiline="true"
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        onKeyDown={handleKeyDown}
        className="rt-editor min-h-[6rem] max-h-72 overflow-y-auto px-3 py-2 text-sm text-gray-800 focus:outline-none"
      />
    </div>
  );
});

export default RichTextComposer;
