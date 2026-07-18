import { useMemo, useState } from 'react';
import {
  ArrowRight, CheckCircle2, ChevronDown, ChevronRight, Gift, Loader2, Mail,
  Plus, RefreshCw, Send, Settings2, Share2, Sparkles, TrendingUp, Trophy,
  UserPlus, Users, X, XCircle,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { hasRole, ROLES } from '../lib/roles';
import {
  REFERRAL_LLM_MODELS, REFERRAL_STAGES, useApproveAction, useCreateReferral,
  useDismissAction, useReferralActions, useReferralConfig, useReferralStats,
  useReferrals, useUpdateReferral, useUpdateReferralConfig,
} from '../hooks/useReferralAgent';
import { cn, timeAgo } from '../lib/utils';

/**
 * Referral & Warm-Intro Agent dashboard (/agents/referrals).
 *
 * The autonomous agent watches for happy, long-tenured clients and drafts
 * personalized referral asks, follows up on unanswered ones, and thanks clients
 * whose referrals convert. This screen is the operator's cockpit: a prominent
 * ON/OFF toggle, the agent's configuration (LLM model + key, candidate
 * thresholds, templates), the referral pipeline, the pending-action queue with
 * email previews + approve/dismiss, a who-referred-whom chain view, and headline
 * stats.
 */

// Paise (INR subunit) → a readable ₹ amount.
function formatPaise(paise) {
  if (!paise) return '₹0';
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
}

const STAGE_META = {
  identified: { label: 'Identified', tone: 'gray', hint: 'Happy client spotted' },
  asked: { label: 'Asked', tone: 'blue', hint: 'Ask sent' },
  pending: { label: 'Pending', tone: 'amber', hint: 'Awaiting the intro' },
  received: { label: 'Received', tone: 'indigo', hint: 'A referral landed' },
  converted: { label: 'Converted', tone: 'green', hint: 'Closed a deal' },
  declined: { label: 'Declined', tone: 'rose', hint: 'Dead end' },
};

const TONE_CLASSES = {
  gray: 'bg-gray-100 text-gray-600 ring-gray-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  green: 'bg-green-50 text-green-700 ring-green-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const ACTION_META = {
  initial_ask: { label: 'Initial ask', icon: Mail },
  followup: { label: 'Follow-up', icon: RefreshCw },
  thank_you: { label: 'Thank-you', icon: Gift },
};

export default function ReferralAgent() {
  const { data: user } = useCurrentUser();
  const canManage = !user || hasRole(user.role, ROLES.ORG_ADMIN);

  const { data: config, isLoading: configLoading } = useReferralConfig();
  const [showConfig, setShowConfig] = useState(false);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-6">
      <Header
        config={config}
        canManage={canManage}
        onToggleConfig={() => setShowConfig((s) => !s)}
        showConfig={showConfig}
      />

      <StatsRow />

      {configLoading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        showConfig && <ConfigPanel config={config} canManage={canManage} />
      )}

      <ActionQueue canManage={canManage} />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Pipeline onAdd={() => setAdding(true)} canManage={canManage} />
        <ReferralChain />
      </div>

      {adding && <AddReferralModal onClose={() => setAdding(false)} />}
    </div>
  );
}

// ── Header + master toggle ────────────────────────────────────────────────────
function Header({ config, canManage, onToggleConfig, showConfig }) {
  const update = useUpdateReferralConfig();
  const isActive = Boolean(config?.is_active);

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900">
          <UserPlus className="h-6 w-6 text-indigo-500" />
          Referral Agent
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Finds happy, long-tenured clients and autonomously crafts warm referral asks —
          then follows up and thanks them when a referral converts.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleConfig}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50"
        >
          <Settings2 className="h-4 w-4" />
          Configure
          <ChevronDown className={cn('h-3.5 w-3.5 transition', showConfig && 'rotate-180')} />
        </button>

        <PowerToggle
          active={isActive}
          disabled={!canManage || update.isPending}
          pending={update.isPending}
          onToggle={() => update.mutate({ is_active: !isActive })}
        />
      </div>
    </div>
  );
}

function PowerToggle({ active, disabled, pending, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-3 rounded-xl border px-4 py-2 shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60',
        active ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'
      )}
      title={active ? 'Agent is running — click to pause' : 'Agent is off — click to activate'}
    >
      <span className="text-left">
        <span className={cn('block text-sm font-semibold', active ? 'text-green-700' : 'text-gray-700')}>
          {pending ? 'Saving…' : active ? 'Agent ON' : 'Agent OFF'}
        </span>
        <span className="block text-[11px] text-gray-500">
          {active ? 'Scanning & drafting' : 'Not running'}
        </span>
      </span>
      <span
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition',
          active ? 'bg-green-500' : 'bg-gray-300'
        )}
      >
        <span
          className={cn(
            'inline-block h-5 w-5 transform rounded-full bg-white shadow transition',
            active ? 'translate-x-5' : 'translate-x-0.5'
          )}
        />
      </span>
    </button>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function StatsRow() {
  const { data: stats } = useReferralStats();
  const pct = (v) => `${Math.round((v || 0) * 100)}%`;

  const cards = [
    { label: 'Asks sent', value: (stats?.asked || 0) + (stats?.received || 0) + (stats?.converted || 0) + (stats?.declined || 0), icon: Send, tone: 'text-blue-500' },
    { label: 'Response rate', value: pct(stats?.response_rate), icon: TrendingUp, tone: 'text-indigo-500' },
    { label: 'Conversion rate', value: pct(stats?.conversion_rate), icon: Trophy, tone: 'text-green-500' },
    { label: 'Referral value', value: formatPaise(stats?.total_referral_value), icon: Gift, tone: 'text-amber-500' },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{c.label}</span>
            <c.icon className={cn('h-4 w-4', c.tone)} />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Configuration ──────────────────────────────────────────────────────────────
function ConfigPanel({ config, canManage }) {
  const update = useUpdateReferralConfig();
  const [form, setForm] = useState(() => ({
    llm_model: config?.llm_model || REFERRAL_LLM_MODELS[0].id,
    llm_api_key: '',
    min_health_score: config?.min_health_score ?? 80,
    min_relationship_days: config?.min_relationship_days ?? 90,
    max_asks_per_client: config?.max_asks_per_client ?? 2,
    followup_after_days: config?.followup_after_days ?? 7,
    auto_ask_enabled: Boolean(config?.auto_ask_enabled),
    referral_template: config?.referral_template || '',
    followup_template: config?.followup_template || '',
    thankyou_template: config?.thankyou_template || '',
  }));

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!canManage) return;
    // Only send the key when the operator typed a new one; "" left untouched
    // means "no change", so we omit it unless the field was edited.
    const { llm_api_key, ...rest } = form;
    const payload = { ...rest };
    if (llm_api_key !== '') payload.llm_api_key = llm_api_key;
    update.mutate(payload);
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* LLM */}
        <div className="space-y-4">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <Sparkles className="h-4 w-4 text-indigo-400" /> AI model
          </h3>
          <label className="block">
            <span className="block text-xs font-medium text-gray-500">LLM model</span>
            <select
              value={form.llm_model}
              disabled={!canManage}
              onChange={(e) => set('llm_model', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-gray-50"
            >
              {REFERRAL_LLM_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-gray-500">
              OpenRouter API key {config?.has_api_key && <span className="text-green-600">· key stored</span>}
            </span>
            <input
              type="password"
              value={form.llm_api_key}
              disabled={!canManage}
              onChange={(e) => set('llm_api_key', e.target.value)}
              placeholder={config?.has_api_key ? '•••••••• (leave blank to keep)' : 'Leave blank to use organization default'}
              autoComplete="new-password"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-gray-50"
            />
            <span className="mt-1 block text-[11px] text-gray-400">
              Falls back to the organization&apos;s OpenRouter key when blank.
            </span>
          </label>
        </div>

        {/* Thresholds */}
        <div className="space-y-4">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <Users className="h-4 w-4 text-indigo-400" /> Who to ask
          </h3>
          <Slider
            label="Minimum health score"
            value={form.min_health_score}
            min={0} max={100} step={5} suffix="/100"
            disabled={!canManage}
            onChange={(v) => set('min_health_score', v)}
          />
          <Slider
            label="Minimum relationship"
            value={form.min_relationship_days}
            min={0} max={365} step={15} suffix=" days"
            disabled={!canManage}
            onChange={(v) => set('min_relationship_days', v)}
          />
          <Slider
            label="Max asks per client"
            value={form.max_asks_per_client}
            min={1} max={10} step={1} suffix=""
            disabled={!canManage}
            onChange={(v) => set('max_asks_per_client', v)}
          />
          <Slider
            label="Follow up after"
            value={form.followup_after_days}
            min={1} max={60} step={1} suffix=" days"
            disabled={!canManage}
            onChange={(v) => set('followup_after_days', v)}
          />
        </div>
      </div>

      {/* Auto-ask */}
      <label aria-label="Auto-send asks" className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <input
          type="checkbox"
          checked={form.auto_ask_enabled}
          disabled={!canManage}
          onChange={(e) => set('auto_ask_enabled', e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span>
          <span className="block text-sm font-medium text-gray-800">Auto-send asks</span>
          <span className="block text-xs text-gray-500">
            When on, the agent sends drafted asks itself. When off (default), every ask waits in the
            action queue for your approval.
          </span>
        </span>
      </label>

      {/* Templates */}
      <div className="grid gap-4 md:grid-cols-3">
        <Template label="Referral ask" value={form.referral_template} disabled={!canManage} onChange={(v) => set('referral_template', v)} placeholder="Optional. Guides the AI. Tokens: {first_name}, {company}" />
        <Template label="Follow-up" value={form.followup_template} disabled={!canManage} onChange={(v) => set('followup_template', v)} placeholder="Optional. Tokens: {first_name}" />
        <Template label="Thank-you" value={form.thankyou_template} disabled={!canManage} onChange={(v) => set('thankyou_template', v)} placeholder="Optional. Tokens: {first_name}, {referred}" />
      </div>

      {canManage && (
        <div className="flex items-center justify-end border-t border-gray-100 pt-4">
          <button
            type="submit"
            disabled={update.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Save settings
          </button>
        </div>
      )}
    </form>
  );
}

function Slider({ label, value, min, max, step, suffix, disabled, onChange }) {
  return (
    <label aria-label={label} className="block">
      <span className="flex items-center justify-between text-xs font-medium text-gray-500">
        <span>{label}</span>
        <span className="font-semibold text-gray-900">{value}{suffix}</span>
      </span>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-indigo-600 disabled:opacity-50"
      />
    </label>
  );
}

function Template({ label, value, disabled, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-500">{label} template</span>
      <textarea
        rows={4}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-xs shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-gray-50"
      />
    </label>
  );
}

// ── Action queue ─────────────────────────────────────────────────────────────
function ActionQueue({ canManage }) {
  const { data: actions = [], isLoading } = useReferralActions({ status: 'pending' });
  const approve = useApproveAction();
  const dismiss = useDismissAction();
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Mail className="h-4 w-4 text-indigo-400" />
          Action queue
          {actions.length > 0 && (
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
              {actions.length} pending
            </span>
          )}
        </h2>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : actions.length === 0 ? (
        <div className="px-5 py-8">
          <EmptyState
            icon={CheckCircle2}
            title="Nothing waiting"
            description="When the agent drafts a referral ask, follow-up, or thank-you, it shows up here for your approval."
          />
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {actions.map((a) => {
            const meta = ACTION_META[a.action_type] || { label: a.action_type, icon: Mail };
            const open = expanded === a.id;
            return (
              <li key={a.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : a.id)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    <meta.icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{meta.label}</span>
                        <span className="text-xs text-gray-500">to {a.referrer_name || 'a client'}</span>
                        <span className="text-[11px] text-gray-400">· {timeAgo(a.created_at)}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-gray-500">
                        {a.ai_subject || '(no subject)'}
                      </span>
                    </span>
                    <ChevronRight className={cn('mt-1 h-4 w-4 shrink-0 text-gray-300 transition', open && 'rotate-90')} />
                  </button>

                  {canManage && (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        disabled={approve.isPending}
                        onClick={() => approve.mutate(a.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                      >
                        <Send className="h-3 w-3" /> Approve
                      </button>
                      <button
                        type="button"
                        disabled={dismiss.isPending}
                        onClick={() => dismiss.mutate(a.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50 disabled:opacity-50"
                      >
                        <X className="h-3 w-3" /> Dismiss
                      </button>
                    </div>
                  )}
                </div>

                {open && (
                  <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-4">
                    <p className="text-xs font-semibold text-gray-700">
                      Subject: <span className="font-normal">{a.ai_subject || '(none)'}</span>
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                      {a.ai_message || '(no message drafted)'}
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── Pipeline ─────────────────────────────────────────────────────────────────
function Pipeline({ onAdd, canManage }) {
  const { data: referrals = [], isLoading, refetch, isFetching } = useReferrals();

  const byStage = useMemo(() => {
    const groups = Object.fromEntries(REFERRAL_STAGES.map((s) => [s, []]));
    for (const r of referrals) (groups[r.status] || (groups[r.status] = [])).push(r);
    return groups;
  }, [referrals]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Share2 className="h-4 w-4 text-indigo-400" /> Referral pipeline
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-600 shadow-sm hover:bg-gray-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          </button>
          {canManage && (
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              <Plus className="h-3.5 w-3.5" /> Add referral
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : referrals.length === 0 ? (
        <div className="px-5 py-8">
          <EmptyState
            icon={Share2}
            title="No referrals yet"
            description="Turn the agent on to auto-identify happy clients, or add a referral you already have."
            action={canManage ? { label: 'Add referral', onClick: onAdd } : undefined}
          />
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto p-4">
          {REFERRAL_STAGES.map((stage) => (
            <StageColumn key={stage} stage={stage} items={byStage[stage] || []} canManage={canManage} />
          ))}
        </div>
      )}
    </div>
  );
}

function StageColumn({ stage, items, canManage }) {
  const meta = STAGE_META[stage];
  return (
    <div className="w-56 shrink-0">
      <div className="mb-2 flex items-center justify-between">
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', TONE_CLASSES[meta.tone])}>
          {meta.label}
        </span>
        <span className="text-xs text-gray-400">{items.length}</span>
      </div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 px-3 py-6 text-center text-[11px] text-gray-400">
            {meta.hint}
          </p>
        ) : (
          items.map((r) => <ReferralCard key={r.id} referral={r} canManage={canManage} />)
        )}
      </div>
    </div>
  );
}

function ReferralCard({ referral, canManage }) {
  const update = useUpdateReferral();
  const nextStage = {
    identified: 'asked', asked: 'pending', pending: 'received', received: 'converted',
  }[referral.status];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <p className="truncate text-sm font-medium text-gray-900">
        {referral.referred_name || 'Unnamed lead'}
      </p>
      {referral.referred_company && (
        <p className="truncate text-xs text-gray-500">{referral.referred_company}</p>
      )}
      {referral.referrer_name && (
        <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-gray-400">
          <UserPlus className="h-3 w-3" /> via {referral.referrer_name}
        </p>
      )}
      {referral.referral_value ? (
        <p className="mt-1 text-xs font-semibold text-green-600">{formatPaise(referral.referral_value)}</p>
      ) : null}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] text-gray-400">{timeAgo(referral.updated_at || referral.created_at)}</span>
        {canManage && nextStage && (
          <button
            type="button"
            disabled={update.isPending}
            onClick={() => update.mutate({ id: referral.id, data: { status: nextStage } })}
            className="inline-flex items-center gap-0.5 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"
            title={`Move to ${STAGE_META[nextStage].label}`}
          >
            {STAGE_META[nextStage].label} <ArrowRight className="h-2.5 w-2.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Referral chain (who referred whom) ─────────────────────────────────────────
function ReferralChain() {
  const { data: referrals = [], isLoading } = useReferrals();

  // Group referrals by referrer name → the people they introduced.
  const chains = useMemo(() => {
    const map = new Map();
    for (const r of referrals) {
      const key = r.referrer_name || 'Unknown referrer';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [referrals]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Users className="h-4 w-4 text-indigo-400" /> Referral chains
        </h2>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : chains.length === 0 ? (
        <div className="px-5 py-8">
          <EmptyState icon={Users} title="No chains yet" description="Who referred whom will map out here as referrals come in." />
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {chains.map(([referrer, refs]) => (
            <li key={referrer} className="px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                  {referrer.slice(0, 1).toUpperCase()}
                </span>
                <span className="text-sm font-medium text-gray-900">{referrer}</span>
                <span className="text-xs text-gray-400">referred {refs.length}</span>
              </div>
              <ul className="mt-2 space-y-1 pl-9">
                {refs.map((r) => {
                  const meta = STAGE_META[r.status];
                  return (
                    <li key={r.id} className="flex items-center gap-2 text-xs">
                      <ArrowRight className="h-3 w-3 text-gray-300" />
                      <span className="truncate text-gray-700">{r.referred_name || 'Unnamed'}</span>
                      <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset', TONE_CLASSES[meta.tone])}>
                        {meta.label}
                      </span>
                      {r.referral_value ? (
                        <span className="text-[10px] font-semibold text-green-600">{formatPaise(r.referral_value)}</span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Add referral modal ─────────────────────────────────────────────────────────
function AddReferralModal({ onClose }) {
  const create = useCreateReferral();
  const [form, setForm] = useState({
    referred_name: '', referred_company: '', referred_email: '', status: 'received', notes: '',
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSave = form.referred_name.trim() && !create.isPending;

  const submit = (e) => {
    e.preventDefault();
    if (!canSave) return;
    create.mutate(
      {
        referred_name: form.referred_name.trim(),
        referred_company: form.referred_company.trim() || undefined,
        referred_email: form.referred_email.trim() || undefined,
        status: form.status,
        notes: form.notes.trim() || undefined,
      },
      { onSuccess: onClose }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-900/40 p-4 sm:p-8">
      <div role="dialog" aria-modal="true" aria-label="Add referral" className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Add a referral</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 px-6 py-5">
          <TextField label="Referred person" value={form.referred_name} onChange={(v) => set('referred_name', v)} required placeholder="Jane Prospect" />
          <TextField label="Company" value={form.referred_company} onChange={(v) => set('referred_company', v)} placeholder="Prospect Inc" />
          <TextField label="Email" type="email" value={form.referred_email} onChange={(v) => set('referred_email', v)} placeholder="jane@prospect.io" />
          <label className="block">
            <span className="block text-sm font-medium text-gray-700">Status</span>
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            >
              {REFERRAL_STAGES.map((s) => (
                <option key={s} value={s}>{STAGE_META[s].label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700">Notes</span>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              className="mt-1 w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              placeholder="How this referral came in…"
            />
          </label>
          <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={!canSave} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add referral
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, type = 'text', required, placeholder }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
      />
    </label>
  );
}
