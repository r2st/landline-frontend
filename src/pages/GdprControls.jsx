import { useState } from 'react';
import {
  AlertTriangle, Download, Loader2, Search, ShieldCheck, Trash2, X,
} from 'lucide-react';
import HelpIcon from '../components/HelpIcon';
import toast from 'react-hot-toast';
import { useGdprExport, useGdprErase } from '../hooks/useGdpr';
import { isLikelyEmail, summarizeExport } from '../lib/gdpr';
import { cn } from '../lib/utils';

/**
 * GDPR Data Requests — the right-to-access and right-to-erasure console.
 *
 * Under GDPR a data subject can demand a copy of everything held about them
 * (Art. 15) or its deletion (Art. 17). Both were previously back-office scripts;
 * this is the operator surface. Look a contact up by email, see what's held,
 * export it, or erase it — erasure gated behind a typed confirmation because it
 * is destructive and irreversible.
 */
export default function GdprControls() {
  const [emailInput, setEmailInput] = useState('');
  // The email an export was actually run for — pins downloads/erase to the
  // looked-up subject, not whatever is currently in the input box.
  const [subject, setSubject] = useState('');
  const [confirming, setConfirming] = useState(false);

  const exportReq = useGdprExport();
  const erase = useGdprErase();

  const trimmed = emailInput.trim();
  const canLookup = isLikelyEmail(trimmed) && !exportReq.isPending;

  const handleLookup = (e) => {
    e.preventDefault();
    if (!canLookup) return;
    exportReq.mutate(trimmed, {
      onSuccess: () => setSubject(trimmed),
      onError: () => setSubject(''),
    });
  };

  const data = exportReq.data;
  const sections = summarizeExport(data);

  const handleDownload = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gdpr-export-${subject || 'contact'}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success('Export downloaded');
  };

  const handleErase = () => {
    erase.mutate(subject, {
      onSuccess: () => {
        setConfirming(false);
        setSubject('');
        exportReq.reset();
        setEmailInput('');
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900">
          <ShieldCheck className="h-6 w-6 text-indigo-500" />
          GDPR Data Requests
          <HelpIcon articleId="gdpr" />
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Look up a contact by email to fulfil a right-to-access (export) or right-to-erasure request.
        </p>
      </div>

      {/* Lookup */}
      <form onSubmit={handleLookup} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="contact@example.com"
            aria-label="Contact email"
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <button
          type="submit"
          disabled={!canLookup}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          {exportReq.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Look up
        </button>
      </form>

      {exportReq.isError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="flex items-center gap-1.5 text-sm font-medium text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            Couldn't load this contact
          </p>
          <p className="mt-1 text-sm text-amber-700">
            {exportReq.error?.response?.data?.detail || exportReq.error?.message ||
              'No data was returned for that email.'}
          </p>
        </div>
      )}

      {/* Result */}
      {subject && data && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-gray-500">Data held for</p>
              <p className="text-lg font-semibold text-gray-900">{subject}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                Download export (JSON)
              </button>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Erase all data
              </button>
            </div>
          </div>

          {sections.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {sections.map((s) => (
                <div key={s.key} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{s.label}</div>
                  <div className="mt-0.5 text-xl font-bold text-gray-900">
                    {s.kind === 'array' ? s.count : s.kind === 'object' ? `${s.count} fields` : String(s.value)}
                  </div>
                  {s.kind === 'array' && (
                    <div className="text-[11px] text-gray-400">record{s.count === 1 ? '' : 's'}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No structured data was returned for this contact.</p>
          )}

          {/* Full payload, verbatim — the export they'd receive. */}
          <details className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-700">
              View full export
            </summary>
            <pre className="max-h-96 overflow-auto border-t border-gray-100 bg-gray-50 p-4 text-xs text-gray-700">
              {JSON.stringify(data, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {confirming && (
        <EraseConfirm
          email={subject}
          isPending={erase.isPending}
          onCancel={() => setConfirming(false)}
          onConfirm={handleErase}
        />
      )}
    </div>
  );
}

// Erasure is irreversible, so require the operator to retype the exact email
// before the destructive button unlocks.
function EraseConfirm({ email, isPending, onCancel, onConfirm }) {
  const [typed, setTyped] = useState('');
  const matches = typed.trim() === email;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
      <div role="dialog" aria-modal="true" aria-label="Confirm erasure" className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-red-700">
            <Trash2 className="h-5 w-5" />
            Erase all data
          </h2>
          <button type="button" onClick={onCancel} aria-label="Close" className="rounded text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 px-5 py-4">
          <p className="text-sm text-gray-600">
            This permanently erases every record held for <span className="font-medium text-gray-900">{email}</span>.
            This cannot be undone.
          </p>
          <label className="block text-sm">
            <span className="text-gray-600">Type the email to confirm</span>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              aria-label="Confirm email"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!matches || isPending}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm',
              matches && !isPending ? 'bg-red-600 hover:bg-red-700' : 'bg-red-300'
            )}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Erase permanently
          </button>
        </div>
      </div>
    </div>
  );
}
