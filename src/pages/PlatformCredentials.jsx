import { useMemo, useState } from 'react';
import {
  KeyRound, Loader2, ShieldCheck, AlertTriangle, RotateCcw, Check, X, Info,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import {
  useCredentials, useSetCredential, useClearCredential,
} from '../hooks/usePlatform';
import { usePlatform } from '../context/PlatformContext';
import { cn } from '../lib/utils';

/**
 * Platform credential management — rotate API keys without SSH.
 *
 * Rotating the Google OAuth client used to mean a shell session, an edit to
 * .env.production and a stack restart, so a closed Google Cloud project took
 * Gmail connectivity down until someone with server access was free. This is
 * that, as a screen.
 *
 * Three things this page is careful about, because each is a way an operator
 * gets misled at exactly the wrong moment:
 *
 * - **Provenance is shown, not implied.** "database" means someone set it here;
 *   "environment" means the deploy supplied it; "unset" means the feature that
 *   needs it is dark. Without the distinction, a page listing a working value
 *   gives no way to tell whether clearing it is safe.
 * - **Propagation is stated.** A save applies immediately on the API worker
 *   that served it and reaches the others on a 5-minute refresh, so the copy
 *   says so rather than implying the rotation is complete.
 * - **Secrets are never rendered.** The API returns a mask; there is no reveal
 *   affordance, because the value cannot be fetched in full by design.
 */

const SOURCE_TONE = {
  database: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  environment: 'bg-gray-100 text-gray-600 ring-gray-200',
  unset: 'bg-amber-50 text-amber-700 ring-amber-200',
};

const SOURCE_LABEL = {
  database: 'Set here',
  environment: 'From deploy',
  unset: 'Not configured',
};

function fmtTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d) ? null : d.toLocaleString();
}

function CredentialRow({ cred, onSave, onClear, saving, clearing }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const busy = saving || clearing;

  function save() {
    const value = draft.trim();
    if (!value) return;
    onSave(cred.key, value);
    setDraft('');
    setEditing(false);
  }

  return (
    <div className="border-t border-gray-100 px-5 py-4 first:border-t-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{cred.label}</span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                SOURCE_TONE[cred.source] || SOURCE_TONE.unset
              )}
            >
              {SOURCE_LABEL[cred.source] || cred.source}
            </span>
          </div>
          <code className="mt-1 block truncate font-mono text-xs text-gray-500">
            {cred.key}
          </code>
          {cred.help ? (
            <p className="mt-1.5 max-w-xl text-xs text-gray-500">{cred.help}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={busy}
              // Named for the credential, not just "Set": nine of these buttons
              // share a screen and the visible label alone identifies none of
              // them to a screen reader (or to a test).
              aria-label={`${cred.source === 'database' ? 'Replace' : 'Set'} ${cred.label}`}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {cred.source === 'database' ? 'Replace' : 'Set'}
            </button>
          ) : null}
          {cred.source === 'database' ? (
            <button
              type="button"
              onClick={() => onClear(cred.key)}
              disabled={busy}
              aria-label={`Revert ${cred.label}`}
              title={
                cred.has_env_fallback
                  ? 'Remove the override and go back to the deployed value'
                  : 'Remove the override. Nothing is deployed for this key, so it will be unconfigured.'
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              {clearing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              Revert
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3">
        {editing ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type={cred.is_secret ? 'password' : 'text'}
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') save();
                if (e.key === 'Escape') { setEditing(false); setDraft(''); }
              }}
              placeholder={`New ${cred.label}`}
              aria-label={`New ${cred.label}`}
              className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-1.5 font-mono text-sm focus:border-indigo-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={save}
              disabled={!draft.trim() || saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Save
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setDraft(''); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <code className="font-mono text-sm text-gray-800">
              {cred.value || <span className="text-amber-700">nothing configured</span>}
            </code>
            {cred.updated_by ? (
              <span className="text-xs text-gray-400">
                set by {cred.updated_by}
                {fmtTime(cred.updated_at) ? ` · ${fmtTime(cred.updated_at)}` : ''}
              </span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlatformCredentials() {
  const { isPlatformAdmin } = usePlatform();
  const { data, isLoading, error } = useCredentials({ enabled: isPlatformAdmin });
  const setCred = useSetCredential();
  const clearCred = useClearCredential();

  const groups = useMemo(() => {
    const byCategory = new Map();
    for (const cred of data?.credentials || []) {
      if (!byCategory.has(cred.category)) byCategory.set(cred.category, []);
      byCategory.get(cred.category).push(cred);
    }
    return [...byCategory.entries()];
  }, [data]);

  if (!isPlatformAdmin) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Platform admins only"
        description="API credentials belong to the deployment, not to an organization, so only a platform admin can view or change them."
      />
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
          <KeyRound className="h-6 w-6 text-indigo-600" />
          API Credentials
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Rotate the keys this deployment uses without touching the server. A value
          set here overrides the one from the deploy; reverting restores it.
        </p>
      </header>

      <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-800 ring-1 ring-inset ring-blue-100">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Saving applies straight away on the worker that handles the request and
          reaches the rest within 5 minutes. Secrets are stored encrypted and are
          never shown again — only the last four characters, so you can tell which
          key is live.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading credentials…
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800 ring-1 ring-inset ring-red-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error?.response?.data?.detail || error?.message || 'Could not load credentials'}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(([category, creds]) => (
            <section
              key={category}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              <h2 className="border-b border-gray-100 bg-gray-50 px-5 py-2.5 text-sm font-semibold text-gray-700">
                {category}
              </h2>
              {creds.map((cred) => (
                <CredentialRow
                  key={cred.key}
                  cred={cred}
                  saving={setCred.isPending && setCred.variables?.key === cred.key}
                  clearing={clearCred.isPending && clearCred.variables === cred.key}
                  onSave={(key, value) => setCred.mutate({ key, value })}
                  onClear={(key) => clearCred.mutate(key)}
                />
              ))}
            </section>
          ))}
          {data?.applied_at ? (
            <p className="text-xs text-gray-400">
              This worker last applied stored credentials at {fmtTime(data.applied_at)}.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
