import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, CheckCircle2, ExternalLink, Mail, User } from 'lucide-react';
import { useImportCandidates } from '../../hooks/useDiscoveryDocuments';
import { cn } from '../../lib/utils';

function ConfidenceBadge({ value }) {
  const pct = Math.round((value ?? 0) * 100);
  const tone = pct >= 80 ? 'bg-green-50 text-green-700' : pct >= 50 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700';
  return <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', tone)}>{pct}%</span>;
}

function personName(p) {
  return [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || 'Unnamed';
}

export default function DocumentReview({ doc, canContinue, onContinue }) {
  const candidates = doc.candidates || [];
  const importable = useMemo(() => candidates.filter((c) => !c.imported_company_id), [candidates]);
  // Default selection: everything not yet imported that the model is reasonably sure of.
  const [selected, setSelected] = useState(
    () => new Set(importable.filter((c) => (c.confidence ?? 1) >= 0.5).map((c) => c.id))
  );
  const importMutation = useImportCandidates(doc.id);

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allSelected = importable.length > 0 && importable.every((c) => selected.has(c.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(importable.map((c) => c.id)));

  const selectedIds = importable.filter((c) => selected.has(c.id)).map((c) => c.id);
  const withEmail = candidates.reduce(
    (n, c) => n + (c.contacts || []).filter((p) => p.email).length,
    0
  );

  if (!candidates.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-16">
        <Building2 className="h-10 w-10 text-gray-300" />
        <p className="mt-3 text-sm font-medium text-gray-900">No companies found in this document</p>
        <p className="mt-1 text-sm text-gray-500">Try a file that lists company names, websites or contact emails.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          Review what was found, then import the companies you want.{' '}
          <span className="text-gray-500">{withEmail} contacts have an email address.</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!selectedIds.length || importMutation.isPending}
            onClick={() => importMutation.mutate(selectedIds, { onSuccess: () => setSelected(new Set()) })}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600 disabled:opacity-50"
          >
            {importMutation.isPending && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            Import selected ({selectedIds.length})
          </button>
          <button
            type="button"
            disabled={!canContinue}
            onClick={onContinue}
            title={canContinue ? '' : 'Import at least one contact with an email first'}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Draft emails
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={!importable.length}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Company</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Contacts</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Location</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Found in</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Confidence</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {candidates.map((c) => {
              const imported = Boolean(c.imported_company_id);
              return (
                <tr key={c.id} className={cn('align-top', !imported && 'hover:bg-gray-50')}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${c.name}`}
                      checked={imported || selected.has(c.id)}
                      disabled={imported}
                      onChange={() => toggle(c.id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                    {c.domain && <p className="text-xs text-gray-500">{c.domain}</p>}
                    {c.industry && <p className="text-xs text-gray-400">{c.industry}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {(c.contacts || []).length === 0 ? (
                      <span className="text-sm text-gray-400">--</span>
                    ) : (
                      <ul className="space-y-1">
                        {c.contacts.map((p) => (
                          <li key={p.id} className="text-xs text-gray-700">
                            <span className="inline-flex items-center gap-1">
                              <User className="h-3 w-3 text-gray-400" />
                              {personName(p)}
                              {p.title && <span className="text-gray-400">· {p.title}</span>}
                            </span>
                            {p.email ? (
                              <span className="ml-4 flex items-center gap-1 text-gray-500">
                                <Mail className="h-3 w-3" />
                                {p.email}
                              </span>
                            ) : (
                              <span className="ml-4 block text-gray-400">no email</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {[c.city, c.state, c.country].filter(Boolean).join(', ') || '--'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">{c.source_ref}</td>
                  <td className="px-4 py-3">
                    <ConfidenceBadge value={c.confidence} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {imported ? (
                      <Link
                        to={`/companies/${c.imported_company_id}`}
                        className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 hover:bg-green-100"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Imported
                      </Link>
                    ) : c.match ? (
                      <Link
                        to={`/companies/${c.match.matched_company_id}`}
                        className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
                        title="Importing merges into the existing company"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Already in Prospect
                      </Link>
                    ) : (
                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">New</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {doc.stats?.ungrounded_fields_dropped > 0 && (
        <p className="text-xs text-gray-500">
          {doc.stats.ungrounded_fields_dropped} email/website/phone value(s) the AI suggested weren&apos;t in the document
          and were left out.
        </p>
      )}
    </div>
  );
}
