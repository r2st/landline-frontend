import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe,
  History,
  LayoutGrid,
  LayoutList,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { discoveryApi, queryClient } from '../../api/client';
import { useSearchCompanies } from '../../hooks/useDiscovery';
import { errMsg } from '../../hooks/useDiscoveryDocuments';
import { useOptionalAuth } from '../../context/AuthContext';
import { isPlatformAdmin } from '../../lib/roles';
import { cn, formatNumber } from '../../lib/utils';
import { usePersistedState } from '../../lib/persistedState';
import Skeleton from '../Skeleton';

const MANUFACTURING_INDUSTRIES = [
  'Injection Molding',
  'CNC Machining',
  'Metal Stamping',
  'Die Casting',
  'Sheet Metal Fabrication',
  'Plastic Extrusion',
  'Powder Coating',
  '3D Printing / Additive Manufacturing',
  'Welding & Assembly',
  'Surface Finishing',
  'Precision Machining',
  'Tool & Die Making',
  'Metal Forging',
  'Wire EDM',
  'Laser Cutting',
  'Rubber & Silicone Molding',
  'PCB Manufacturing',
  'Packaging Manufacturing',
  'Textile Manufacturing',
  'Food Processing Equipment',
];

const EMPTY_FORM = {
  industry_keyword: '',
  location: '',
  min_employees: '',
  max_employees: '',
  keywords: '',
  num_results: 10,
};

// Existing keys — renaming them would drop users' saved searches.
const SAVED_KEY = 'landline_saved_searches';
const HISTORY_KEY = 'landline_search_history';
const SESSION_KEY = 'prospect.discovery.search';

const inputCls =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

function getRelativeDate(dateStr) {
  const diffMins = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}

// The API's field names (`industry`, `per_page`) — the form's names are older.
// Sending the form names silently dropped the industry and result count.
export function toSearchPayload(form) {
  const keywords = form.keywords
    ? form.keywords.split(',').map((k) => k.trim()).filter(Boolean)
    : [];
  return {
    industry: form.industry_keyword.trim(),
    location: form.location.trim(),
    keywords,
    min_employees: form.min_employees ? Number(form.min_employees) : null,
    max_employees: form.max_employees ? Number(form.max_employees) : null,
    per_page: Number(form.num_results) || 10,
  };
}

function SearchStatusNotice({ status, canFix }) {
  if (!status || status === 'ok') return null;
  const copy = {
    rate_limited: {
      title: 'Apollo is rate-limiting searches right now',
      body: 'Wait a minute, then search again. Nothing was charged for this attempt.',
    },
    budget_exhausted: {
      title: 'The Apollo credit budget is used up for now',
      body: 'Searches resume when the budget resets. Companies already found stay in your pipeline.',
    },
    skipped: {
      title: 'Apollo isn’t connected yet',
      body: canFix
        ? 'Add the Apollo API key in Platform credentials to start searching.'
        : 'Ask a platform admin to add the Apollo API key for this deployment.',
    },
    error: {
      title: 'Apollo returned an error',
      body: 'Try again in a moment, or loosen your filters.',
    },
  }[status] || { title: 'The search didn’t complete', body: 'Try again in a moment.' };
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
      <div className="text-sm">
        <p className="font-medium text-amber-900">{copy.title}</p>
        <p className="mt-1 text-amber-800">
          {copy.body}{' '}
          {status === 'skipped' && canFix && (
            <Link to="/platform/credentials" className="font-medium underline hover:text-amber-900">
              Open Platform credentials
            </Link>
          )}
        </p>
      </div>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div data-testid="results-skeleton" className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <Skeleton className="h-3 w-40" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-gray-100 px-4 py-4 last:border-0">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="hidden h-4 w-1/6 sm:block" />
          <Skeleton className="ml-auto h-7 w-28 rounded-lg" />
        </div>
      ))}
      <p className="px-4 py-3 text-xs text-gray-500">Searching Apollo — this usually takes a few seconds…</p>
    </div>
  );
}

function StatusBadge({ company }) {
  if (company.status === 'imported') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
        <CheckCircle2 className="h-3 w-3" />
        Added
      </span>
    );
  }
  if (company.status === 'error') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700"
        title={company.error || undefined}
      >
        <AlertTriangle className="h-3 w-3" />
        Not added
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
      <CheckCircle2 className="h-3 w-3" />
      Already in Prospect
    </span>
  );
}

function RowAction({ company, enrich, onEnrich, block }) {
  if (!company.id) return <span className="text-xs text-gray-400">--</span>;
  const state = enrich[company.id];
  const base = cn(
    'inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50',
    block && 'w-full'
  );
  if (state?.state === 'done') {
    return (
      <Link
        to={`/companies/${company.id}`}
        className={cn(base, 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100')}
      >
        <Users className="h-3.5 w-3.5" />
        {state.contacts} contact{state.contacts === 1 ? '' : 's'} found
      </Link>
    );
  }
  return (
    <div className={cn('inline-flex items-center gap-2', block && 'w-full')}>
      <button
        type="button"
        onClick={() => onEnrich(company)}
        disabled={state?.state === 'running'}
        aria-label={`Find contacts at ${company.name}`}
        className={cn(base, 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100')}
      >
        {state?.state === 'running' ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : state?.state === 'failed' ? (
          <RefreshCw className="h-3.5 w-3.5" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        {state?.state === 'running' ? 'Finding…' : state?.state === 'failed' ? 'Retry' : 'Find contacts'}
      </button>
      <Link
        to={`/companies/${company.id}`}
        aria-label={`Open ${company.name}`}
        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

export default function ApolloSearch() {
  const user = useOptionalAuth()?.user;
  const canFixApollo = isPlatformAdmin(user?.role);
  const searchCompanies = useSearchCompanies();

  // Form + last results live in sessionStorage, so leaving the page (or the
  // tab) and coming back doesn't throw the search away.
  const [session, setSession] = usePersistedState(SESSION_KEY, { form: EMPTY_FORM, results: null }, 'session');
  const form = { ...EMPTY_FORM, ...session.form };
  const results = session.results;
  const setForm = (next) => setSession((s) => ({ ...s, form: next }));
  const setResults = (next) => setSession((s) => ({ ...s, results: next }));

  const [viewMode, setViewMode] = usePersistedState('prospect.discovery.view', 'table');
  const [savedSearches, setSavedSearches] = usePersistedState(SAVED_KEY, []);
  const [searchHistory, setSearchHistory] = usePersistedState(HISTORY_KEY, []);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [formError, setFormError] = useState(null);
  const [lastPayload, setLastPayload] = useState(null);

  const [showIndustrySuggestions, setShowIndustrySuggestions] = useState(false);
  const industryInputRef = useRef(null);
  const industryDropdownRef = useRef(null);

  // Per-company enrichment: { [id]: { state: 'running'|'done'|'failed', contacts } }
  const [enrich, setEnrich] = useState({});
  const [bulk, setBulk] = useState(null); // { current, total }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        industryInputRef.current && !industryInputRef.current.contains(e.target) &&
        industryDropdownRef.current && !industryDropdownRef.current.contains(e.target)
      ) {
        setShowIndustrySuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredIndustries = form.industry_keyword.trim()
    ? MANUFACTURING_INDUSTRIES.filter((ind) =>
        ind.toLowerCase().includes(form.industry_keyword.toLowerCase())
      ).slice(0, 6)
    : [];

  const handleSaveSearch = () => {
    if (!saveSearchName.trim()) return;
    setSavedSearches((prev) => [...prev, { id: Date.now(), name: saveSearchName.trim(), criteria: { ...form } }]);
    setSaveSearchName('');
    setShowSaveInput(false);
  };

  const runSearch = (payload) => {
    setLastPayload(payload);
    setEnrich({});
    searchCompanies.mutate(payload, { onSuccess: (data) => setResults(data) });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!form.industry_keyword.trim() && !form.location.trim() && !form.keywords.trim()) {
      setFormError('Enter an industry, a location or a keyword to search.');
      return;
    }
    const min = Number(form.min_employees);
    const max = Number(form.max_employees);
    if (form.min_employees && form.max_employees && min > max) {
      setFormError('Min employees can’t be more than max employees.');
      return;
    }
    setFormError(null);
    setSearchHistory((prev) => [{ criteria: { ...form }, date: new Date().toISOString() }, ...prev].slice(0, 5));
    runSearch(toSearchPayload(form));
  };

  const enrichOne = async (company) => {
    setEnrich((prev) => ({ ...prev, [company.id]: { state: 'running' } }));
    try {
      const res = await discoveryApi.enrichCompany(company.id, { find_contacts: true });
      const contacts = res?.contacts_count ?? 0;
      setEnrich((prev) => ({ ...prev, [company.id]: { state: 'done', contacts } }));
      return contacts;
    } catch (e) {
      setEnrich((prev) => ({ ...prev, [company.id]: { state: 'failed', error: errMsg(e, 'Enrichment failed') } }));
      throw e;
    }
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['companies'] });
    queryClient.invalidateQueries({ queryKey: ['contacts'] });
  };

  const handleEnrich = async (company) => {
    try {
      const n = await enrichOne(company);
      toast.success(n ? `Found ${n} contact${n === 1 ? '' : 's'} at ${company.name}` : `No new contacts found at ${company.name}`);
    } catch (e) {
      toast.error(errMsg(e, `Couldn't enrich ${company.name}`));
    } finally {
      invalidate();
    }
  };

  const pending = (results?.companies || []).filter((c) => c.id && enrich[c.id]?.state !== 'done');

  const handleBulkEnrich = async () => {
    if (!pending.length || bulk) return;
    setBulk({ current: 0, total: pending.length });
    let found = 0;
    let failed = 0;
    for (let i = 0; i < pending.length; i++) {
      setBulk({ current: i + 1, total: pending.length });
      try {
        found += await enrichOne(pending[i]);
      } catch {
        failed += 1;
      }
    }
    setBulk(null);
    invalidate();
    const msg = `Found ${found} contact${found === 1 ? '' : 's'} across ${pending.length - failed} compan${pending.length - failed === 1 ? 'y' : 'ies'}`;
    if (failed) toast.error(`${msg}; ${failed} couldn't be enriched`);
    else toast.success(msg);
  };

  const companies = results?.companies || [];
  const isPending = searchCompanies.isPending;

  return (
    <div className="space-y-6">
      {(savedSearches.length > 0 || searchHistory.length > 0) && (
        <div className="space-y-3">
          {savedSearches.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <BookmarkCheck className="h-3.5 w-3.5" />
                Saved searches
              </div>
              <div className="flex flex-wrap gap-2">
                {savedSearches.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 text-xs font-medium text-blue-700"
                  >
                    <button
                      type="button"
                      onClick={() => setForm({ ...EMPTY_FORM, ...s.criteria })}
                      className="inline-flex items-center gap-1.5 rounded-l-full py-1 pl-3 pr-1 hover:bg-blue-100"
                    >
                      <Bookmark className="h-3 w-3" />
                      {s.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSavedSearches((prev) => prev.filter((x) => x.id !== s.id))}
                      aria-label={`Delete saved search ${s.name}`}
                      className="rounded-r-full py-1 pl-1 pr-2 hover:bg-blue-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
          {searchHistory.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <History className="h-3.5 w-3.5" />
                Recent searches
              </div>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((h, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setForm({ ...EMPTY_FORM, ...h.criteria })}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs text-gray-600 hover:bg-gray-100"
                  >
                    <Clock className="h-3 w-3 text-gray-400" />
                    {[h.criteria.industry_keyword, h.criteria.location].filter(Boolean).join(' - ') || h.criteria.keywords || 'Search'}
                    <span className="text-gray-400">{getRelativeDate(h.date)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <form onSubmit={handleSearch} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-1">
              <label htmlFor="disc-industry" className="mb-1 block text-sm font-medium text-gray-700">Industry</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="disc-industry"
                  ref={industryInputRef}
                  type="text"
                  autoComplete="off"
                  value={form.industry_keyword}
                  onChange={(e) => {
                    setForm({ ...form, industry_keyword: e.target.value });
                    setShowIndustrySuggestions(true);
                  }}
                  onFocus={() => setShowIndustrySuggestions(true)}
                  className={cn(inputCls, 'pl-9')}
                  placeholder="e.g., injection molding, CNC machining"
                />
                {showIndustrySuggestions && filteredIndustries.length > 0 && (
                  <div
                    ref={industryDropdownRef}
                    className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
                  >
                    {filteredIndustries.map((ind) => (
                      <button
                        key={ind}
                        type="button"
                        onClick={() => {
                          setForm({ ...form, industry_keyword: ind });
                          setShowIndustrySuggestions(false);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Building2 className="h-3.5 w-3.5 text-gray-400" />
                        {ind}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="disc-location" className="mb-1 block text-sm font-medium text-gray-700">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="disc-location"
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className={cn(inputCls, 'pl-9')}
                  placeholder="e.g., Ohio, United States"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="disc-min" className="mb-1 block text-sm font-medium text-gray-700">Min employees</label>
                <input
                  id="disc-min"
                  type="number"
                  min="1"
                  value={form.min_employees}
                  onChange={(e) => setForm({ ...form, min_employees: e.target.value })}
                  className={inputCls}
                  placeholder="10"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="disc-max" className="mb-1 block text-sm font-medium text-gray-700">Max employees</label>
                <input
                  id="disc-max"
                  type="number"
                  min="1"
                  value={form.max_employees}
                  onChange={(e) => setForm({ ...form, max_employees: e.target.value })}
                  className={inputCls}
                  placeholder="500"
                />
              </div>
            </div>

            <div className="sm:col-span-2 lg:col-span-2">
              <label htmlFor="disc-keywords" className="mb-1 block text-sm font-medium text-gray-700">Additional keywords</label>
              <input
                id="disc-keywords"
                type="text"
                value={form.keywords}
                onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                className={inputCls}
                placeholder="Comma-separated, e.g., automotive, aerospace, precision"
              />
            </div>

            <div>
              <label htmlFor="disc-count" className="mb-1 block text-sm font-medium text-gray-700">Number of results</label>
              <select
                id="disc-count"
                value={form.num_results}
                onChange={(e) => setForm({ ...form, num_results: Number(e.target.value) })}
                className={inputCls}
              >
                {[5, 10, 15, 25].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          {formError && (
            <p role="alert" className="text-sm text-red-600">{formError}</p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">
              Each result uses Apollo credits. Matches are added to Companies straight away; duplicates merge.
            </p>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {showSaveInput ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={saveSearchName}
                    onChange={(e) => setSaveSearchName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveSearch();
                      }
                    }}
                    className={cn(inputCls, 'w-44')}
                    placeholder="Search name..."
                    aria-label="Saved search name"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSaveSearch}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-2 text-sm font-medium text-white hover:bg-green-600"
                  >
                    <BookmarkCheck className="h-4 w-4" />
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSaveInput(false);
                      setSaveSearchName('');
                    }}
                    aria-label="Cancel saving search"
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSaveInput(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  <Bookmark className="h-4 w-4" />
                  Save search
                </button>
              )}
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-600 disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                {isPending ? 'Searching…' : 'Search Apollo'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {isPending && <ResultsSkeleton />}

      {!isPending && searchCompanies.isError && (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
            <div className="text-sm text-red-800">
              <p className="font-medium">The search didn&apos;t go through</p>
              <p className="mt-1">{errMsg(searchCompanies.error, 'Something went wrong talking to Apollo.')}</p>
            </div>
          </div>
          {lastPayload && (
            <button
              type="button"
              onClick={() => runSearch(lastPayload)}
              className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </button>
          )}
        </div>
      )}

      {!isPending && results && (
        <div className="space-y-4">
          <SearchStatusNotice status={results.search_status} canFix={canFixApollo} />

          {companies.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {results.total || companies.length} compan{(results.total || companies.length) === 1 ? 'y' : 'ies'} found
                </h2>
                <p className="text-sm text-gray-500">
                  <span className="font-medium text-green-700">{results.imported || 0} added to your pipeline</span>
                  {' · '}
                  {results.already_existed || 0} already in Prospect
                  {' · '}
                  <Link to="/companies" className="font-medium text-blue-600 hover:text-blue-700">View in Companies</Link>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBulkEnrich}
                  disabled={Boolean(bulk) || !pending.length}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
                >
                  {bulk ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Enriching {bulk.current} of {bulk.total}…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      {pending.length ? `Find contacts for all (${pending.length})` : 'All enriched'}
                    </>
                  )}
                </button>
                <div className="flex items-center rounded-lg border border-gray-200 bg-white p-0.5">
                  {[
                    { mode: 'table', Icon: LayoutList, label: 'Table view' },
                    { mode: 'card', Icon: LayoutGrid, label: 'Card view' },
                  ].map(({ mode, Icon, label }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setViewMode(mode)}
                      aria-label={label}
                      aria-pressed={viewMode === mode}
                      className={cn(
                        'rounded-md p-1.5 transition-colors',
                        viewMode === mode ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {companies.length === 0 ? (
            (!results.search_status || results.search_status === 'ok') && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
                <Search className="h-10 w-10 text-gray-300" />
                <p className="mt-3 text-sm font-medium text-gray-900">No companies matched</p>
                <p className="mt-1 text-sm text-gray-500">
                  Try a broader industry term, a wider location (a state instead of a city), or drop the employee range.
                </p>
              </div>
            )
          ) : viewMode === 'table' ? (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Company', 'Industry', 'Employees', 'Location', 'Status'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{h}</th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Contacts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {companies.map((company, idx) => (
                    <tr key={company.id || idx} className="hover:bg-gray-50" data-testid="result-row">
                      <td className="px-4 py-3">
                        <p className="whitespace-nowrap text-sm font-medium text-gray-900">{company.name}</p>
                        {company.domain && (
                          <a
                            href={`https://${company.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                          >
                            {company.domain}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{company.industry || '--'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                        {company.employee_count ? formatNumber(company.employee_count) : '--'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                        {[company.city, company.state].filter(Boolean).join(', ') || '--'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge company={company} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <RowAction company={company} enrich={enrich} onEnrich={handleEnrich} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {companies.map((company, idx) => (
                <div
                  key={company.id || idx}
                  data-testid="result-card"
                  className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-gray-900">{company.name}</p>
                    <StatusBadge company={company} />
                  </div>
                  {company.domain && (
                    <a
                      href={`https://${company.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                    >
                      {company.domain}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  <div className="space-y-1.5 text-xs text-gray-600">
                    {company.industry && (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-gray-400" />
                        {company.industry}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      {[company.city, company.state].filter(Boolean).join(', ') || '--'}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      {company.employee_count ? `${formatNumber(company.employee_count)} employees` : 'Size unknown'}
                    </div>
                  </div>
                  <div className="mt-auto border-t border-gray-100 pt-3">
                    <RowAction company={company} enrich={enrich} onEnrich={handleEnrich} block />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!isPending && !results && !searchCompanies.isError && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
          <Globe className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-900">Find companies that fit your ideal customer</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
            Search Apollo&apos;s B2B database by industry, location and size. Matches go straight into Companies;
            then use <span className="font-medium text-gray-700">Find contacts</span> to pull the decision-makers.
          </p>
        </div>
      )}
    </div>
  );
}
