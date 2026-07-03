import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Landmark,
  Plus,
  Search,
  X,
  Building2,
  Mail,
  MapPin,
  Target,
  DollarSign,
  ChevronRight,
  Filter,
  TrendingUp,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { cn, formatCurrency } from '../lib/utils';
import {
  INVESTOR_STATUSES,
  INVESTOR_STAGES,
  statusMeta,
  stageMeta,
} from '../lib/investors';
import { useInvestors, useInvestorPipeline, useSaveInvestor } from '../hooks/useInvestors';

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
    </div>
  );
}

// ─── Pipeline funnel ────────────────────────────────────────────────────────
// Tapering horizontal bars, one per pipeline status (excluding the "passed"
// off-ramp), widths scaled to the largest cohort so the funnel shape reads at a
// glance. Clicking a band filters the list below.
function PipelineFunnel({ counts, total, onSelect, activeStatus }) {
  const stages = INVESTOR_STATUSES.filter((s) => s.value !== 'passed');
  const max = Math.max(1, ...stages.map((s) => counts[s.value] || 0));
  const passed = counts.passed || 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <TrendingUp className="h-4 w-4 text-indigo-600" /> Pipeline Funnel
        </h2>
        <span className="text-xs text-gray-500">{total} investors tracked</span>
      </div>
      <div className="space-y-1.5">
        {stages.map((s) => {
          const n = counts[s.value] || 0;
          const pct = Math.round((n / max) * 100);
          const isActive = activeStatus === s.value;
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => onSelect(isActive ? '' : s.value)}
              className="group flex w-full items-center gap-3 text-left"
            >
              <span className="w-32 flex-shrink-0 truncate text-xs font-medium text-gray-600">{s.label}</span>
              <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-gray-100">
                <div
                  className={cn(
                    'flex h-full items-center rounded-md transition-all duration-500',
                    s.color,
                    isActive ? 'opacity-100 ring-2 ring-indigo-400 ring-offset-1' : 'opacity-85 group-hover:opacity-100'
                  )}
                  style={{ width: `${Math.max(pct, n > 0 ? 8 : 0)}%` }}
                />
                <span className="absolute inset-y-0 left-2 flex items-center text-xs font-semibold text-gray-700">
                  {n}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      {passed > 0 && (
        <p className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-400">
          <span className="font-semibold text-rose-500">{passed}</span> passed / declined
        </p>
      )}
    </div>
  );
}

// ─── Investor row ───────────────────────────────────────────────────────────
function InvestorRow({ investor, onOpen }) {
  const sMeta = statusMeta(investor.status);
  const stMeta = stageMeta(investor.stage);
  const focus = Array.isArray(investor.focus)
    ? investor.focus.join(', ')
    : investor.investment_focus || investor.focus;

  return (
    <button
      type="button"
      onClick={() => onOpen(investor)}
      className="group flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
    >
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-sm font-bold text-indigo-600">
        {(investor.firm || investor.name || '?').slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-gray-900">{investor.firm || investor.name || 'Unknown firm'}</p>
          <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1', sMeta.badge)}>
            {sMeta.label}
          </span>
          {investor.stage && (
            <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1', stMeta.badge)}>
              {stMeta.label}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
          {investor.name && investor.firm && (
            <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5 text-gray-400" />{investor.name}</span>
          )}
          {focus && <span className="inline-flex items-center gap-1"><Target className="h-3.5 w-3.5 text-gray-400" />{focus}</span>}
          {(investor.check_size || investor.check_size_max) && (
            <span className="inline-flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5 text-gray-400" />
              {investor.check_size || `${formatCurrency(investor.check_size_min, { compact: true })}–${formatCurrency(investor.check_size_max, { compact: true })}`}
            </span>
          )}
          {investor.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-gray-400" />{investor.location}</span>}
        </div>
      </div>
      <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-300 group-hover:text-indigo-400" />
    </button>
  );
}

// ─── Add / edit modal ───────────────────────────────────────────────────────
const EMPTY = {
  firm: '', name: '', email: '', phone: '', linkedin: '',
  status: 'researching', stage: 'seed', investment_focus: '',
  check_size: '', location: '', website: '', notes: '',
};

export function InvestorModal({ investor, onClose }) {
  const save = useSaveInvestor();
  const [form, setForm] = useState(() => ({ ...EMPTY, ...(investor || {}) }));
  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));
  const input = 'h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';
  const label = 'mb-1 block text-xs font-medium text-gray-500';

  const submit = (e) => {
    e.preventDefault();
    if (!form.firm.trim()) return;
    save.mutate({ id: investor?.id, data: form }, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-3.5">
          <h2 className="text-sm font-semibold text-gray-900">{investor ? 'Edit Investor' : 'Add Investor'}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3 p-5">
          <div className="col-span-2">
            <label className={label}>Firm *</label>
            <input className={input} value={form.firm} onChange={set('firm')} placeholder="Sequoia Capital" />
          </div>
          <div>
            <label className={label}>Contact Name</label>
            <input className={input} value={form.name} onChange={set('name')} placeholder="Jane Partner" />
          </div>
          <div>
            <label className={label}>Email</label>
            <input type="email" className={input} value={form.email} onChange={set('email')} />
          </div>
          <div>
            <label className={label}>Phone</label>
            <input className={input} value={form.phone} onChange={set('phone')} />
          </div>
          <div>
            <label className={label}>LinkedIn</label>
            <input className={input} value={form.linkedin} onChange={set('linkedin')} />
          </div>
          <div>
            <label className={label}>Status</label>
            <select className={input} value={form.status} onChange={set('status')}>
              {INVESTOR_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Stage</label>
            <select className={input} value={form.stage} onChange={set('stage')}>
              {INVESTOR_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Check Size</label>
            <input className={input} value={form.check_size} onChange={set('check_size')} placeholder="$1M–$5M" />
          </div>
          <div>
            <label className={label}>Location</label>
            <input className={input} value={form.location} onChange={set('location')} placeholder="San Francisco, CA" />
          </div>
          <div className="col-span-2">
            <label className={label}>Investment Focus</label>
            <input className={input} value={form.investment_focus} onChange={set('investment_focus')} placeholder="B2B SaaS, AI, fintech" />
          </div>
          <div className="col-span-2">
            <label className={label}>Website</label>
            <input className={input} value={form.website} onChange={set('website')} placeholder="https://" />
          </div>
          <div className="col-span-2">
            <label className={label}>Notes</label>
            <textarea rows={3} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" value={form.notes} onChange={set('notes')} />
          </div>
        </div>
        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-gray-100 bg-white px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={save.isPending} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
            {save.isPending ? 'Saving…' : investor ? 'Save Changes' : 'Add Investor'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────
export default function Investors() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [stage, setStage] = useState('');
  const [showModal, setShowModal] = useState(false);

  const { data: pipeline } = useInvestorPipeline();
  const { data: investorsData, isLoading } = useInvestors();
  const investors = investorsData?.items || [];

  // Derive funnel counts from the pipeline endpoint if present, else from the
  // loaded list so the funnel still renders before the stats endpoint ships.
  const counts = useMemo(() => {
    if (pipeline?.by_status) return pipeline.by_status;
    if (Array.isArray(pipeline?.stages)) {
      return Object.fromEntries(pipeline.stages.map((s) => [s.status || s.value, s.count]));
    }
    const c = {};
    investors.forEach((i) => { const k = (i.status || 'researching').toLowerCase(); c[k] = (c[k] || 0) + 1; });
    return c;
  }, [pipeline, investors]);

  const total = pipeline?.total ?? investorsData?.total ?? investors.length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return investors.filter((i) => {
      if (status && (i.status || '').toLowerCase() !== status) return false;
      if (stage && (i.stage || '').toLowerCase().replace(/\s+/g, '-') !== stage) return false;
      if (!q) return true;
      const hay = [i.firm, i.name, i.email, i.investment_focus, i.location].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [investors, search, status, stage]);

  const open = (inv) => navigate(`/investors/${inv.id}`);
  const activeFilters = !!(status || stage || search);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <Landmark className="h-7 w-7 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">Investors</h1>
          </div>
          <p className="ml-10 text-sm text-gray-500">Track your fundraising pipeline from first touch to committed capital.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Add Investor
        </button>
      </div>

      {/* Funnel */}
      <PipelineFunnel counts={counts} total={total} onSelect={setStatus} activeStatus={status} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search firm, contact, focus…"
            className="h-9 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All statuses</option>
          {INVESTOR_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All stages</option>
          {INVESTOR_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {activeFilters && (
          <button
            type="button"
            onClick={() => { setSearch(''); setStatus(''); setStage(''); }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={activeFilters ? Filter : Landmark}
          title={activeFilters ? 'No investors match your filters' : 'No investors yet'}
          description={activeFilters ? 'Try clearing the search or filters.' : 'Add your first investor to start building the pipeline.'}
          action={activeFilters ? undefined : { label: 'Add Investor', onClick: () => setShowModal(true) }}
        />
      ) : (
        <div className="space-y-2.5">
          <p className="text-xs text-gray-400">{filtered.length} {filtered.length === 1 ? 'investor' : 'investors'}</p>
          {filtered.map((inv) => <InvestorRow key={inv.id} investor={inv} onOpen={open} />)}
        </div>
      )}

      {showModal && <InvestorModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
