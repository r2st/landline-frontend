import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, Building2, Download, Globe, Loader2, MapPin, Phone, Play, Plus,
  RefreshCw, Search, Star, Trash2,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import {
  useCreateSearch, useDeleteSearch, useDiscoveryResults, useDiscoveryStats,
  useImportBusiness, useRunSavedSearch, useRunSearch, useSavedSearches,
} from '../hooks/usePlacesDiscovery';
import { cn, timeAgo } from '../lib/utils';

/**
 * Google Places SMB discovery — the long tail Apollo's B2B database misses.
 *
 * Distinct from Discovery.jsx, which is the Apollo-backed `/discovery/*`
 * feature. This one sources small businesses by category × location.
 *
 * Be honest about the funnel: Places returns *business* data, never people. No
 * emails, no named contacts. Reaching someone emailable means
 * website → Hunter/scrape → verify, and every hop loses volume. The stats here
 * report that funnel rather than a flattering total.
 */

const STATUSES = [
  { key: '', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'enriched', label: 'Enriched' },
  { key: 'imported', label: 'Imported' },
  { key: 'skipped', label: 'Skipped' },
];

const STATUS_TONE = {
  new: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  enriched: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  imported: 'bg-green-50 text-green-700 ring-green-600/20',
  skipped: 'bg-gray-100 text-gray-500 ring-gray-500/20',
};

const SCHEDULES = ['one_time', 'daily', 'weekly'];

export default function PlacesDiscovery() {
  const [view, setView] = useState('results');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900">
            <MapPin className="h-6 w-6 text-indigo-500" />
            Places Discovery
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Find small businesses by category and location — the long tail Apollo doesn't cover.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
          {[
            { key: 'results', label: 'Results', icon: Building2 },
            { key: 'searches', label: 'Saved searches', icon: Search },
          ].map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => setView(v.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                view === v.key ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-900'
              )}
            >
              <v.icon className="h-4 w-4" />
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <Funnel />
      <SearchBar />
      {view === 'results' ? <Results /> : <SavedSearches />}
    </div>
  );
}

// The ratios, not the totals. "1,200 discovered" means nothing if 40 have an
// email — email_yield is the number that decides whether this channel works.
function Funnel() {
  const { data, isError } = useDiscoveryStats();
  if (isError || !data) return null;

  const pct = (v) => `${Math.round((v || 0) * 100)}%`;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900">The funnel</h2>
        <p className="text-xs text-gray-400">
          Places gives businesses, not people — expect a low single-digit percentage to reach an
          emailable contact.
        </p>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Discovered', value: data.total },
          { label: 'With a website', value: data.with_website },
          { label: 'With an email', value: data.with_email },
          { label: 'Imported', value: data.imported },
          { label: 'Email yield', value: pct(data.email_yield), accent: true },
          { label: 'Import yield', value: pct(data.import_yield), accent: true },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2">
            <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{s.label}</dt>
            <dd className={cn('mt-0.5 text-xl font-bold', s.accent ? 'text-indigo-700' : 'text-gray-900')}>
              {s.value ?? 0}
            </dd>
          </div>
        ))}
      </dl>
      {data.credits_spent_today != null && (
        <p className="mt-2 text-xs text-gray-400">
          {data.credits_spent_today} API credit{data.credits_spent_today === 1 ? '' : 's'} spent today
          {data.searches_active != null ? ` · ${data.searches_active} saved search(es) active` : ''}
        </p>
      )}
    </div>
  );
}

function SearchBar() {
  const [form, setForm] = useState({ query: '', location: '', limit: 20, save: true });
  const [saveAs, setSaveAs] = useState('');
  const run = useRunSearch();
  const create = useCreateSearch();

  const submit = (e) => {
    e.preventDefault();
    if (form.query.trim().length < 2) return;
    run.mutate({
      query: form.query.trim(),
      location: form.location.trim() || undefined,
      limit: Number(form.limit),
      save: form.save,
    });
  };

  const saveSearch = () => {
    if (!saveAs.trim() || form.query.trim().length < 2) return;
    create.mutate(
      {
        name: saveAs.trim(),
        query: form.query.trim(),
        location_text: form.location.trim() || undefined,
        schedule: 'one_time',
        is_active: true,
      },
      { onSuccess: () => setSaveAs('') }
    );
  };

  return (
    <form onSubmit={submit} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <label htmlFor="places-query" className="block text-xs font-medium text-gray-500">
            What are you looking for?
          </label>
          <input
            id="places-query"
            value={form.query}
            onChange={(e) => setForm({ ...form, query: e.target.value })}
            placeholder="injection molding manufacturers"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="places-location" className="block text-xs font-medium text-gray-500">
            Where
          </label>
          <input
            id="places-location"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Pune, India"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="places-limit" className="block text-xs font-medium text-gray-500">
            Max results
          </label>
          {/* Places' own hard ceiling is 60 per query — asking for more just
              wastes the round trip. */}
          <input
            id="places-limit"
            type="number"
            min={1}
            max={60}
            value={form.limit}
            onChange={(e) => setForm({ ...form, limit: e.target.value })}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={run.isPending || form.query.trim().length < 2}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          {run.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Search Places
        </button>

        <label className="inline-flex items-center gap-1.5 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={form.save}
            onChange={(e) => setForm({ ...form, save: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          Stage the results
        </label>

        <div className="ml-auto flex items-center gap-2">
          <input
            value={saveAs}
            onChange={(e) => setSaveAs(e.target.value)}
            placeholder="Save this search as…"
            className="w-48 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="button"
            disabled={create.isPending || !saveAs.trim() || form.query.trim().length < 2}
            onClick={saveSearch}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Save
          </button>
        </div>
      </div>

      {/* Unticking "stage the results" still costs credits — the call is made
          either way, we just throw the answer away. Don't let it read as a
          free preview. */}
      {!form.save && (
        <p className="mt-2 text-xs text-amber-700">
          Preview mode still spends API credits — it just doesn't keep what it finds.
        </p>
      )}
    </form>
  );
}

function Results() {
  const [status, setStatus] = useState('');
  const [hasEmail, setHasEmail] = useState(false);
  const [q, setQ] = useState('');
  const { data, isLoading, isError, error, refetch, isFetching } = useDiscoveryResults({
    status: status || undefined,
    has_email: hasEmail || undefined,
    q: q.trim() || undefined,
    limit: 50,
  });

  const results = data?.results || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => (
          <button
            key={s.key || 'all'}
            type="button"
            onClick={() => setStatus(s.key)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              status === s.key ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-900'
            )}
          >
            {s.label}
          </button>
        ))}
        <label className="ml-2 inline-flex items-center gap-1.5 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={hasEmail}
            onChange={(e) => setHasEmail(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          Has an email
        </label>
        <div className="ml-auto flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by name…"
            aria-label="Filter by business name"
            className="w-48 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-gray-600 hover:bg-gray-50"
            aria-label="Refresh results"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : isError ? (
          <div className="px-5 py-10 text-center">
            <AlertTriangle className="mx-auto h-6 w-6 text-amber-500" />
            <p className="mt-2 text-sm font-medium text-gray-900">Couldn't load staged businesses</p>
            <p className="mt-1 text-sm text-gray-500">
              {error?.response?.data?.detail || error?.message || 'The endpoint did not respond.'}
            </p>
          </div>
        ) : results.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="Nothing staged yet"
            description="Run a search above. Businesses land here first, then you decide which to import."
          />
        ) : (
          <ul className="divide-y divide-gray-100">
            {results.map((b) => (
              <BusinessRow key={b.id} business={b} />
            ))}
          </ul>
        )}
      </div>

      {data?.total > results.length && (
        <p className="text-center text-xs text-gray-400">
          Showing {results.length} of {data.total}
        </p>
      )}
    </div>
  );
}

function BusinessRow({ business: b }) {
  const importIt = useImportBusiness();
  const busy = importIt.isPending;
  const imported = b.status === 'imported';

  return (
    <li className="flex flex-wrap items-start gap-3 px-5 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-gray-900">{b.business_name}</span>
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ring-inset',
              STATUS_TONE[b.status] || STATUS_TONE.skipped
            )}
          >
            {b.status}
          </span>
          {b.rating != null && (
            <span className="inline-flex items-center gap-0.5 text-[11px] text-gray-400">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {b.rating}
              {b.review_count ? ` (${b.review_count})` : ''}
            </span>
          )}
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
          {b.category && <span>{b.category}</span>}
          {(b.city || b.country) && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3 text-gray-300" />
              {[b.city, b.state, b.country].filter(Boolean).join(', ')}
            </span>
          )}
          {/* Places' phone coverage is excellent while its email coverage is
              nil — for a lot of these the call queue is the realistic channel. */}
          {b.phone && (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3 text-gray-300" />
              {b.phone}
            </span>
          )}
          {b.website && (
            <a
              href={b.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:underline"
            >
              <Globe className="h-3 w-3" />
              {b.domain || 'website'}
            </a>
          )}
        </div>

        {b.email ? (
          <p className="mt-1 text-xs">
            <a href={`mailto:${b.email}`} className="text-blue-600 hover:underline">{b.email}</a>
            {b.email_source && (
              <span className="ml-1.5 text-gray-400">
                via {b.email_source}
                {b.email_confidence != null ? ` · ${b.email_confidence}% confidence` : ''}
              </span>
            )}
          </p>
        ) : (
          <p className="mt-1 text-xs text-gray-400">
            No email — Places never returns one. Import with enrichment to try Hunter and the site.
          </p>
        )}

        {b.status_reason && <p className="mt-1 text-xs text-amber-700">{b.status_reason}</p>}
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        {imported ? (
          b.company_id ? (
            <Link
              to={`/companies/${b.company_id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              <Building2 className="h-3.5 w-3.5" />
              View company
            </Link>
          ) : (
            <span className="text-xs text-gray-400">Imported</span>
          )
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => importIt.mutate({ businessId: b.id, enrich: false })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Import
            </button>
            {/* Enriching costs a Hunter credit and blocks on a scrape, so it's a
                separate, deliberate button rather than a default. */}
            {!b.email && b.website && (
              <button
                type="button"
                disabled={busy}
                onClick={() => importIt.mutate({ businessId: b.id, enrich: true })}
                title="Spends a Hunter credit and scrapes the site to look for an address"
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                Import &amp; find email
              </button>
            )}
          </>
        )}
      </div>
    </li>
  );
}

function SavedSearches() {
  const { data, isLoading, isError, error } = useSavedSearches();
  const run = useRunSavedSearch();
  const del = useDeleteSearch();
  const searches = Array.isArray(data) ? data : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        Couldn't load saved searches — {error?.response?.data?.detail || error?.message || 'no response'}.
      </div>
    );
  }
  if (searches.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <EmptyState
          icon={Search}
          title="No saved searches"
          description="Save a search above to re-run it later, or put it on a daily or weekly schedule."
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {searches.map((s) => (
        <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-gray-900">{s.name}</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium capitalize text-gray-600">
                {String(s.schedule).replace(/_/g, ' ')}
              </span>
              {!s.is_active && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                  Paused
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs text-gray-500">
              “{s.query}”{s.location_text ? ` · ${s.location_text}` : ''}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              {s.last_run_at ? `Last run ${timeAgo(s.last_run_at)}` : 'Never run'}
              {' · '}{s.results_count ?? 0} found
              {' · '}{s.credits_spent ?? 0} credit(s)
              {s.last_status && s.last_status !== 'ok' ? ` · last status: ${s.last_status}` : ''}
            </p>
            {s.last_error && <p className="mt-0.5 text-xs text-red-600">{s.last_error}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={run.isPending}
              onClick={() => run.mutate(s.id)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {run.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Run now
            </button>
            <button
              type="button"
              disabled={del.isPending}
              onClick={() => del.mutate(s.id)}
              aria-label={`Delete ${s.name}`}
              className="rounded-lg border border-gray-200 px-2 py-1.5 text-gray-400 hover:bg-gray-50 hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
