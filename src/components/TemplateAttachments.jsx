import { useRef } from 'react';
import { Download, FileText, Loader2, Paperclip, X } from 'lucide-react';
import toast from 'react-hot-toast';

// Mirrors app/services/template_attachments.py. The server enforces these; they
// are checked here too so a 40 MB deck is refused before it is uploaded, not
// after.
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 15 * 1024 * 1024;
export const MAX_FILES = 10;
// Gmail's blocked attachment types — the receiving side refuses them anyway.
const BLOCKED_EXTENSIONS = new Set([
  'ade', 'adp', 'apk', 'appx', 'appxbundle', 'bat', 'cab', 'chm', 'cmd', 'com',
  'cpl', 'diagcab', 'diagcfg', 'diagpack', 'dll', 'dmg', 'ex', 'ex_', 'exe',
  'hta', 'img', 'ins', 'iso', 'isp', 'jar', 'jnlp', 'js', 'jse', 'lib', 'lnk',
  'mde', 'msc', 'msi', 'msix', 'msixbundle', 'msp', 'mst', 'nsh', 'pif', 'ps1',
  'scr', 'sct', 'shb', 'sys', 'vb', 'vbe', 'vbs', 'vhd', 'vxd', 'wsc', 'wsf',
  'wsh', 'xll',
]);

export function formatBytes(n) {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

/**
 * Split picked files into the ones that may be attached and the reasons the
 * rest may not. `existingSizes` is what the template already carries (saved
 * plus queued), so the caps apply to the template, not to one pick.
 */
export function checkFiles(files, existingSizes = []) {
  const accepted = [];
  const errors = [];
  let count = existingSizes.length;
  let total = existingSizes.reduce((a, b) => a + b, 0);
  for (const file of files) {
    const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
    if (BLOCKED_EXTENSIONS.has(ext)) {
      errors.push(`${file.name}: .${ext} files are blocked by Gmail`);
    } else if (file.size === 0) {
      errors.push(`${file.name} is empty`);
    } else if (file.size > MAX_FILE_BYTES) {
      errors.push(`${file.name} is over ${formatBytes(MAX_FILE_BYTES)}`);
    } else if (count >= MAX_FILES) {
      errors.push(`${file.name}: a template can carry at most ${MAX_FILES} files`);
    } else if (total + file.size > MAX_TOTAL_BYTES) {
      errors.push(`${file.name}: attachments can total at most ${formatBytes(MAX_TOTAL_BYTES)}`);
    } else {
      accepted.push(file);
      count += 1;
      total += file.size;
    }
  }
  return { accepted, errors };
}

/**
 * Files sent with every email rendered from a template.
 *
 * Works for a saved template (`saved`, uploaded at once by the parent) and a
 * new one (`pending`, queued `File`s the parent uploads after Create — the
 * upload endpoint needs a template id).
 */
export default function TemplateAttachments({
  saved = [],
  pending = [],
  onAddFiles,
  onRemoveSaved,
  onRemovePending,
  onDownload,
  uploading = false,
}) {
  const inputRef = useRef(null);

  const pick = (e) => {
    const files = Array.from(e.target.files || []);
    // Reset so picking the same file again (after removing it) fires change.
    e.target.value = '';
    if (!files.length) return;
    const sizes = [...saved.map((a) => a.size_bytes), ...pending.map((f) => f.size)];
    const { accepted, errors } = checkFiles(files, sizes);
    errors.forEach((msg) => toast.error(msg));
    if (accepted.length) onAddFiles(accepted);
  };

  const rows = [
    ...saved.map((a) => ({ key: a.id, name: a.filename, size: a.size_bytes, saved: a })),
    ...pending.map((f, i) => ({ key: `pending-${i}-${f.name}`, name: f.name, size: f.size, index: i })),
  ];
  const total = rows.reduce((sum, r) => sum + r.size, 0);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          Attachments
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || rows.length >= MAX_FILES}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {uploading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Paperclip className="h-3.5 w-3.5" />}
          {uploading ? 'Uploading…' : 'Add files'}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={pick}
          className="hidden"
          data-testid="template-attachment-input"
          aria-label="Attach files to this template"
        />
      </div>

      {rows.length > 0 && (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {rows.map((r) => (
            <li key={r.key} className="flex items-center gap-2 px-3 py-2 text-sm">
              <FileText className="h-4 w-4 flex-shrink-0 text-gray-400" />
              <span className="min-w-0 flex-1 truncate text-gray-700" title={r.name}>
                {r.name}
              </span>
              <span className="flex-shrink-0 text-xs text-gray-400">{formatBytes(r.size)}</span>
              {!r.saved && (
                <span className="flex-shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                  Uploads on create
                </span>
              )}
              {r.saved && onDownload && (
                <button
                  type="button"
                  onClick={() => onDownload(r.saved)}
                  aria-label={`Download ${r.name}`}
                  className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => (r.saved ? onRemoveSaved(r.saved) : onRemovePending(r.index))}
                aria-label={`Remove ${r.name}`}
                className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-xs text-gray-400">
        Sent with every email from this template.
        {rows.length > 0
          ? ` ${rows.length} of ${MAX_FILES} files, ${formatBytes(total)} of ${formatBytes(MAX_TOTAL_BYTES)}.`
          : ` Up to ${MAX_FILES} files, ${formatBytes(MAX_TOTAL_BYTES)} total.`}
      </p>
    </div>
  );
}
