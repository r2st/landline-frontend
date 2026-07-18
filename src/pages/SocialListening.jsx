import { useEffect, useMemo, useState } from 'react';
import {
  Ban, Building2, CheckCircle2, ExternalLink, Ear, Eye, KeyRound, Loader2,
  Plus, RefreshCw, Save, Sparkles, TrendingUp, Trash2, X,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import toast from 'react-hot-toast';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import {
  LLM_MODELS, SIGNAL_TYPES,
  useActionSignal, useAddMonitoredCompany, useAgentConfig, useDismissSignal,
  useMonitoredCompanies, useRemoveMonitoredCompany, useScanNow, useSignals,
  useSignalStats, useUpdateAgentConfig,
} from '../hooks/useSocialListening';
import {
  relevanceTone, signalTypeMeta, sourceLabel, STATUS_LABELS,
} from '../lib/socialListening';
import { cn, timeAgo } from '../lib/utils';

/**
 * Social Listening Agent — watches public buying-intent signals (company news,
 * funding, expansions, leadership changes, product launches, hiring) and turns
 * high-relevance hits into warm lead cards, optionally auto-enrolling the
 * hottest into Dialtone.
 *
 * The page: a prominent ON/OFF toggle, the agent configuration (LLM + what to
 * watch + automation thresholds), the live signal feed with Create Lead /
 * Dismiss actions, the monitored-company list, and a signal-type breakdown.
 * Config + monitoring writes require org_admin; everyone can triage the feed.
 */
export default function SocialListening() {
  const { isAdmin } = useAuth();
  const { data: config, isLoading: configLoading, isError: configError } = useAgentConfig();
  const scanNow = useScanNow();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900">
            <Ear className="h-6 w-6 text-indigo-500" />
            Social Listening Agent
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Monitors public signals — funding, expansions, leadership changes, product launches,
            and hiring — for buying intent, then surfaces warm leads for your team.
          </p>
        </div>
        <button
          type="button"
          onClick={() => scanNow.mutate()}
          disabled={!isAdmin || !config?.is_active || scanNow.isLoading}
          title={!config?.is_active ? 'Turn the agent on to scan' : undefined}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', scanNow.isLoading && 'animate-spin')} />
          Scan now
        </button>
      </header>

      {configLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : configError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Could not load the agent configuration. Try again shortly.
        </div>
      ) : (
        <>
          <PowerToggle config={config} canEdit={isAdmin} />
          <StatsRow />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <SignalFeed canEdit={isAdmin} agentActive={config?.is_active} />
            </div>
            <div className="space-y-6">
              <ConfigCard config={config} canEdit={isAdmin} />
              <MonitoredCompanies canEdit={isAdmin} />
              <SignalTypeChart />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── ON/OFF toggle ─────────────────────────────────────────────────────────────

function PowerToggle({ config, canEdit }) {
  const update = useUpdateAgentConfig();
  const on = !!config?.is_active;
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-xl border p-5 shadow-sm transition-colors',
        on ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white'
      )}
    >
      <div className="flex items-center gap-3">
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-full', on ? 'bg-emerald-100' : 'bg-gray-100')}>
          <Ear className={cn('h-5 w-5', on ? 'text-emerald-600' : 'text-gray-400')} />
        </span>
        <div>
          <p className="text-sm font-semibold text-gray-900">
            Agent is {on ? 'listening' : 'off'}
          </p>
          <p className="text-xs text-gray-500">
            {on
              ? 'Scanning public signals on your configured cadence.'
              : 'Turn on to start discovering buying-intent signals.'}
          </p>
        </div>
      </div>
      <Switch
        checked={on}
        disabled={!canEdit || update.isLoading}
        onChange={(next) => update.mutate({ is_active: next })}
        size="lg"
      />
    </div>
  );
}

function Switch({ checked, onChange, disabled, size = 'md' }) {
  const dims = size === 'lg'
    ? { track: 'h-7 w-12', knob: 'h-5 w-5', on: 'translate-x-5' }
    : { track: 'h-5 w-9', knob: 'h-3.5 w-3.5', on: 'translate-x-4' };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        dims.track,
        checked ? 'bg-emerald-500' : 'bg-gray-300'
      )}
    >
      <span
        className={cn(
          'inline-block transform rounded-full bg-white shadow transition-transform',
          dims.knob,
          checked ? dims.on : 'translate-x-1'
        )}
      />
    </button>
  );
}

// ── Stats ──────────────────────────────────────────────────────────────────

function StatsRow() {
  const { data: stats } = useSignalStats();
  const cards = [
    { label: 'Signals this week', value: stats?.signals_this_week ?? '—', icon: Sparkles, tone: 'text-indigo-500' },
    { label: 'Total signals', value: stats?.total_signals ?? '—', icon: Ear, tone: 'text-blue-500' },
    { label: 'Leads created', value: stats?.leads_created ?? '—', icon: CheckCircle2, tone: 'text-emerald-500' },
    { label: 'Conversion', value: stats ? `${stats.conversion_rate}%` : '—', icon: TrendingUp, tone: 'text-violet-500' },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{c.label}</p>
            <c.icon className={cn('h-4 w-4', c.tone)} />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Configuration ────────────────────────────────────────────────────────────

const FREQUENCY_OPTIONS = [
  { value: 6, label: 'Every 6 hours' },
  { value: 12, label: 'Every 12 hours' },
  { value: 24, label: 'Daily' },
  { value: 48, label: 'Every 2 days' },
  { value: 168, label: 'Weekly' },
];

function ConfigCard({ config, canEdit }) {
  const update = useUpdateAgentConfig();
  const models = config?.available_models?.length ? config.available_models : LLM_MODELS;

  const [form, setForm] = useState(() => toForm(config));
  const [apiKey, setApiKey] = useState('');
  const [apiKeyTouched, setApiKeyTouched] = useState(false);

  // Re-sync when the server config changes (e.g. after a save elsewhere).
  useEffect(() => { setForm(toForm(config)); }, [config]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const onSave = () => {
    const payload = { ...form };
    // Only send the key when the operator actually edited the field, so an
    // untouched masked field never clobbers the stored key.
    if (apiKeyTouched) payload.llm_api_key = apiKey;
    update.mutate(payload, {
      onSuccess: () => { setApiKeyTouched(false); setApiKey(''); },
    });
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">Configuration</h2>
      <fieldset disabled={!canEdit} className="space-y-4 disabled:opacity-60">
        {/* LLM model */}
        <Field label="LLM model">
          <select
            value={form.llm_model}
            onChange={(e) => set({ llm_model: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            {models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>

        {/* API key */}
        <Field label="API key" hint="Leave blank to use organization default">
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              value={apiKeyTouched ? apiKey : ''}
              placeholder={config?.has_api_key ? '•••••••• (saved — leave blank to keep)' : 'sk-or-...'}
              onChange={(e) => { setApiKey(e.target.value); setApiKeyTouched(true); }}
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>
        </Field>

        {/* Keywords */}
        <Field label="Monitored keywords">
          <TagInput
            values={form.monitored_keywords}
            onChange={(v) => set({ monitored_keywords: v })}
            placeholder="funding, expansion, new office…"
          />
        </Field>

        {/* Industries */}
        <Field label="Monitored industries">
          <TagInput
            values={form.monitored_industries}
            onChange={(v) => set({ monitored_industries: v })}
            placeholder="cnc_machining, injection_molding…"
          />
        </Field>

        {/* News sources */}
        <Field label="News sources (RSS)" hint="Extra RSS feed URLs to poll">
          <TagInput
            values={form.news_sources}
            onChange={(v) => set({ news_sources: v })}
            placeholder="https://example.com/feed.xml"
          />
        </Field>

        {/* Relevance threshold */}
        <Field label={`Relevance threshold — ${form.min_relevance_score}`}>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={form.min_relevance_score}
            onChange={(e) => set({ min_relevance_score: Number(e.target.value) })}
            className="w-full accent-indigo-600"
          />
          <p className="mt-1 text-xs text-gray-500">
            Signals scoring below this are shown but never auto-actioned.
          </p>
        </Field>

        {/* Automation toggles */}
        <ToggleRow
          label="Auto-create leads"
          hint="Turn qualifying signals into warm lead cards automatically."
          checked={form.auto_create_leads}
          onChange={(v) => set({ auto_create_leads: v })}
        />
        <ToggleRow
          label="Auto-enroll in Dialtone"
          hint="Enroll the hottest auto-created leads into a sequence."
          checked={form.auto_enroll_dialtone}
          onChange={(v) => set({ auto_enroll_dialtone: v })}
        />

        {/* Scan frequency */}
        <Field label="Scan frequency">
          <select
            value={form.scan_frequency_hours}
            onChange={(e) => set({ scan_frequency_hours: Number(e.target.value) })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            {FREQUENCY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>

        {canEdit && (
          <button
            type="button"
            onClick={onSave}
            disabled={update.isLoading}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {update.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save settings
          </button>
        )}
      </fieldset>
      {!canEdit && (
        <p className="mt-3 text-xs text-gray-400">Only an org admin can change these settings.</p>
      )}
    </section>
  );
}

function toForm(config) {
  return {
    is_active: !!config?.is_active,
    llm_model: config?.llm_model || LLM_MODELS[0],
    monitored_keywords: config?.monitored_keywords || [],
    monitored_industries: config?.monitored_industries || [],
    news_sources: config?.news_sources || [],
    min_relevance_score: config?.min_relevance_score ?? 70,
    auto_create_leads: !!config?.auto_create_leads,
    auto_enroll_dialtone: !!config?.auto_enroll_dialtone,
    scan_frequency_hours: config?.scan_frequency_hours ?? 24,
  };
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-400">{hint}</span>}
    </label>
  );
}

function ToggleRow({ label, hint, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-medium text-gray-700">{label}</p>
        {hint && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}

function TagInput({ values, onChange, placeholder }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft('');
  };
  const remove = (v) => onChange(values.filter((x) => x !== v));
  return (
    <div className="rounded-lg border border-gray-200 p-2 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400">
      {values.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
              {v}
              <button type="button" onClick={() => remove(v)} className="text-indigo-400 hover:text-indigo-700">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
          }}
          placeholder={placeholder}
          className="min-w-0 flex-1 border-0 px-1 py-1 text-sm focus:outline-none focus:ring-0"
        />
        <button type="button" onClick={add} className="rounded p-1 text-gray-400 hover:text-indigo-600">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Signal feed ──────────────────────────────────────────────────────────────

const STATUS_FILTERS = ['', 'new', 'reviewed', 'actioned', 'dismissed'];

function SignalFeed({ canEdit, agentActive }) {
  const [filters, setFilters] = useState({ signal_type: '', status: '', min_relevance: 0 });
  const { data: signals = [], isLoading } = useSignals(filters);

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4">
        <h2 className="text-sm font-semibold text-gray-900">Signal feed</h2>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filters.signal_type}
            onChange={(e) => setFilters((f) => ({ ...f, signal_type: e.target.value }))}
            className="rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none"
          >
            <option value="">All types</option>
            {SIGNAL_TYPES.map((t) => (
              <option key={t} value={t}>{signalTypeMeta(t).label}</option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s || 'all'} value={s}>{s ? STATUS_LABELS[s] : 'All statuses'}</option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-xs text-gray-500">
            ≥
            <input
              type="number"
              min={0}
              max={100}
              value={filters.min_relevance}
              onChange={(e) => setFilters((f) => ({ ...f, min_relevance: Number(e.target.value) || 0 }))}
              className="w-14 rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none"
            />
          </label>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : signals.length === 0 ? (
        <EmptyState
          icon={Ear}
          title="No signals yet"
          description={
            agentActive
              ? 'The agent is on. Signals appear here as they’re discovered on your scan cadence.'
              : 'Turn the agent on and configure keywords or monitored companies to start listening.'
          }
        />
      ) : (
        <ul className="divide-y divide-gray-100">
          {signals.map((s) => (
            <SignalCard key={s.id} signal={s} canEdit={canEdit} />
          ))}
        </ul>
      )}
    </section>
  );
}

function SignalCard({ signal, canEdit }) {
  const action = useActionSignal();
  const dismiss = useDismissSignal();
  const type = signalTypeMeta(signal.signal_type);
  const dismissed = signal.status === 'dismissed';
  const actioned = signal.status === 'actioned' || signal.lead_created;

  return (
    <li className={cn('p-4', dismissed && 'opacity-60')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset', type.tone)}>
              {type.label}
            </span>
            <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset', relevanceTone(signal.relevance_score))}>
              {signal.relevance_score}
            </span>
            <span className="text-xs text-gray-400">{sourceLabel(signal.source_type)}</span>
            <span className="text-xs text-gray-300">·</span>
            <span className="text-xs text-gray-400">{timeAgo(signal.created_at)}</span>
          </div>
          <p className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
            <Building2 className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
            {signal.company_name}
          </p>
          <p className="mt-0.5 text-sm text-gray-700">{signal.headline}</p>
          {signal.summary && signal.summary !== signal.headline && (
            <p className="mt-1 text-xs text-gray-500">{signal.summary}</p>
          )}
          {signal.source_url && (
            <a
              href={signal.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
            >
              Source <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        {canEdit && (
          <div className="flex flex-shrink-0 flex-col gap-1.5">
            {actioned ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Lead
              </span>
            ) : (
              <button
                type="button"
                onClick={() => action.mutate(signal.id)}
                disabled={action.isLoading || dismissed}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Create lead
              </button>
            )}
            {!dismissed && (
              <button
                type="button"
                onClick={() => dismiss.mutate(signal.id)}
                disabled={dismiss.isLoading}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                <Ban className="h-3.5 w-3.5" />
                Dismiss
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

// ── Monitored companies ──────────────────────────────────────────────────────

function MonitoredCompanies({ canEdit }) {
  const { data: companies = [], isLoading } = useMonitoredCompanies();
  const add = useAddMonitoredCompany();
  const remove = useRemoveMonitoredCompany();
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');

  const submit = () => {
    const n = name.trim();
    if (!n) { toast.error('Company name is required'); return; }
    add.mutate(
      { company_name: n, domain: domain.trim() || undefined },
      { onSuccess: () => { setName(''); setDomain(''); } }
    );
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
        <Eye className="h-4 w-4 text-indigo-500" />
        Monitored companies
      </h2>

      {canEdit && (
        <div className="mb-3 space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Company name"
            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <div className="flex gap-2">
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="domain.com (optional)"
              className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <button
              type="button"
              onClick={submit}
              disabled={add.isLoading}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-4 text-center text-gray-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
      ) : companies.length === 0 ? (
        <p className="py-2 text-xs text-gray-400">No companies monitored yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {companies.map((c) => (
            <li key={c.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5">
              <div className="min-w-0">
                <p className="truncate text-sm text-gray-800">{c.company_name}</p>
                <p className="flex gap-2 text-[11px] text-gray-400">
                  {c.domain && <span className="truncate">{c.domain}</span>}
                  <span>{[c.monitor_news && 'news', c.monitor_jobs && 'jobs'].filter(Boolean).join(' · ') || 'paused'}</span>
                </p>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => remove.mutate(c.id)}
                  className="flex-shrink-0 rounded p-1 text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Signal type breakdown ────────────────────────────────────────────────────

function SignalTypeChart() {
  const { data: stats } = useSignalStats();
  const data = useMemo(
    () => (stats?.by_signal_type || [])
      .filter((d) => d.count > 0)
      .map((d) => ({
        name: signalTypeMeta(d.signal_type).label,
        count: d.count,
        fill: signalTypeMeta(d.signal_type).fill,
      })),
    [stats]
  );

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-gray-900">Signal types</h2>
      {data.length === 0 ? (
        <p className="py-4 text-xs text-gray-400">No signals to chart yet.</p>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={92} tick={{ fontSize: 11 }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {data.map((d) => <Cell key={d.name} fill={d.fill} />)}
                <LabelList dataKey="count" position="right" style={{ fontSize: 11, fill: '#6b7280' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
