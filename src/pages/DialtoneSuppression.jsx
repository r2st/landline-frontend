import { useRef, useState } from 'react';
import {
  AlertTriangle, Loader2, Plus, Search, ShieldOff, Trash2, Upload,
} from 'lucide-react';
import HelpIcon from '../components/HelpIcon';
import EmptyState from '../components/EmptyState';
import {
  useAddSuppression, useDeleteSuppression, useImportSuppression, useSuppressionList,
} from '../hooks/useSuppression';
import { cn, formatDate } from '../lib/utils';

const PAGE_SIZE = 25;

// Reason → chip styling. Unknown reasons fall back to neutral gray.
const REASON_TONE = {
  unsubscribe: 'bg-blue-50 text-blue-700 ring-blue-200',
  bounce: 'bg-amber-50 text-amber-700 ring-amber-200',
  complaint: 'bg-red-50 text-red-700 ring-red-200',
  manual: 'bg-gray-100 text-gray-600 ring-gray-200',
};

/**
 * Suppression list — the org's do-not-contact registry. Every outreach path
 * checks it before sending, so an address here never receives another email.
 * Compliance uploads (unsubscribes, complaints, bounced lists) land here.
 */
export default function DialtoneSuppression() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, isFetching } = useSuppressionList({ q, page, pageSize: PAGE_SIZE });

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const onSearch = (value) => {
    setQ(value);
    setPage(1); // a new query always resets to the first page
  };

  return (
    <div className="space-y-6">
      <Header total={total} />
      <ImportPanel />

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={q}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search by email…"
              aria-label="Search suppression list"
              className="w-full rounded-lg border border-gray-300 py-1.5 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <AddOne />
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : isError ? (
          <div className="m-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
              <AlertTriangle className="h-4 w-4" />
              Couldn't load the suppression list
            </h2>
            <p className="mt-1 text-sm text-amber-800">
              {error?.response?.data?.detail || error?.message || 'The endpoint did not respond.'}
            </p>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={ShieldOff}
            title={q ? 'No matches' : 'No suppressed addresses'}
            description={
              q
                ? 'No suppressed address matches your search.'
                : 'Upload a CSV of unsubscribes, complaints, or bounced addresses — or add one by hand. Suppressed addresses are never contacted again.'
            }
          />
        ) : (
          <>
            <SuppressionTable items={items} />
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
          </>
        )}
      </div>
    </div>
  );
}

function Header({ total }) {
  return (
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900">
        <ShieldOff className="h-6 w-6 text-indigo-500" />
        Suppression List
        <HelpIcon articleId="suppression" />
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        {total.toLocaleString()} address{total === 1 ? '' : 'es'} that Dialtone will never contact.
        Every send checks this list first.
      </p>
    </div>
  );
}

// CSV / text upload. Accepts a header row (email/reason columns), a headerless
// CSV, or one address per line. The default reason applies to rows without one.
function ImportPanel() {
  const fileRef = useRef(null);
  const [reason, setReason] = useState('unsubscribe');
  const importMut = useImportSuppression();

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (file) importMut.mutate({ file, reason });
    e.target.value = ''; // allow re-uploading the same file
  };

  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/60 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px]">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
            <Upload className="h-4 w-4 text-gray-400" />
            Bulk import
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            CSV or a plain list of emails. Rows may carry a <code>reason</code> column; those without
            one use the default below.
          </p>
        </div>

        <label className="text-xs font-medium text-gray-600">
          Default reason
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="ml-2 rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="unsubscribe">Unsubscribe</option>
            <option value="complaint">Complaint</option>
            <option value="bounce">Bounce</option>
            <option value="manual">Manual</option>
          </select>
        </label>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv,text/plain"
          onChange={onFile}
          className="hidden"
        />
        <button
          type="button"
          disabled={importMut.isPending}
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          {importMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Upload CSV
        </button>
      </div>
    </div>
  );
}

// Add a single address inline.
function AddOne() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const add = useAddSuppression();

  const submit = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    add.mutate(
      { email: email.trim(), reason: 'manual' },
      { onSuccess: () => { setEmail(''); setOpen(false); } }
    );
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50"
      >
        <Plus className="h-3.5 w-3.5" />
        Add address
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="name@company.com"
        aria-label="Email to suppress"
        autoFocus
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      <button
        type="submit"
        disabled={add.isPending}
        className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {add.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Add
      </button>
      <button
        type="button"
        onClick={() => { setOpen(false); setEmail(''); }}
        className="rounded-lg px-2 py-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        Cancel
      </button>
    </form>
  );
}

function SuppressionTable({ items }) {
  const del = useDeleteSuppression();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
            <th className="px-4 py-2 font-medium">Email</th>
            <th className="px-4 py-2 font-medium">Reason</th>
            <th className="px-4 py-2 font-medium">Source</th>
            <th className="px-4 py-2 font-medium">Added</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
              <td className="px-4 py-2.5 font-medium text-gray-900">{row.email}</td>
              <td className="px-4 py-2.5">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ring-inset',
                    REASON_TONE[row.reason] || REASON_TONE.manual
                  )}
                >
                  {row.reason}
                </span>
              </td>
              <td className="px-4 py-2.5 capitalize text-gray-500">{row.source}</td>
              <td className="px-4 py-2.5 text-gray-500">{formatDate(row.created_at)}</td>
              <td className="px-4 py-2.5 text-right">
                <button
                  type="button"
                  onClick={() => del.mutate(row.id)}
                  disabled={del.isPending}
                  aria-label={`Remove ${row.email} from suppression list`}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Pagination({ page, totalPages, total, onPrev, onNext }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5 text-sm text-gray-500">
      <span>
        Page {page} of {totalPages} · {total.toLocaleString()} total
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={page <= 1}
          className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={page >= totalPages}
          className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
