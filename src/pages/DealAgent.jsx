import { useState } from 'react';
import {
  AlertTriangle, ArrowUpRight, Bot, Check, CheckCircle2, ChevronUp, Clock,
  Cpu, KeyRound, Loader2, Mail, Power, Sparkles, TrendingUp, X,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import {
  ACTION_TYPE_META, DEAL_STAGES, LLM_MODELS, llmModelLabel,
  useApproveAction, useDealActions, useDealAgentConfig, useDealAgentStats,
  useDismissAction, useUpdateDealAgentConfig,
} from '../hooks/useDealAgent';
import { cn, timeAgo } from '../lib/utils';

/**
 * Deal Progression Agent — the dashboard for the autonomous pipeline nudger.
 *
 * The agent watches every open deal and, when one goes quiet past its stage's
 * threshold, records an action: a drafted follow-up, a next-best-step
 * suggestion, an at-risk flag, or an escalation to a manager. This screen is
 * where an operator tunes those thresholds, works the resulting queue
 * (approve / dismiss), and watches what the agent has been doing.
 */

const STAGE_LABEL = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const TYPE_TONE = {
  auto_followup: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  suggestion: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  stage_change: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  at_risk_flag: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  escalation: 'bg-red-50 text-red-700 ring-red-600/20',
};

const TYPE_ICON = {
  auto_followup: Mail,
  suggestion: Sparkles,
  stage_change: ArrowUpRight,
  at_risk_flag: AlertTriangle,
  escalation: TrendingUp,
};

export default function DealAgent() {
  const { data: config, isLoading: configLoading } = useDealAgentConfig();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex items-start gap-3">
        <div className="rounded-xl bg-indigo-50 p-2.5">
          <Bot className="h-6 w-6 text-indigo-600" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-gray-900">Deal Progression Agent</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Monitors the pipeline and nudges stalled deals — drafts follow-ups,
            suggests next steps, advances stages off signals, and escalates the
            ones going cold.
          </p>
        </div>
        {config && <StatusToggle config={config} />}
      </header>

      <StatsRow />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActionQueue />
          <div className="mt-6">
            <ActivityFeed />
          </div>
        </div>
        <div className="lg:col-span-1">
          {configLoading ? (
            <PanelSkeleton />
          ) : config ? (
            <ConfigPanel config={config} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Status toggle ─────────────────────────────────────────────────────────────

function StatusToggle({ config }) {
  const update = useUpdateDealAgentConfig();
  const active = config.is_active;
  return (
    <button
      type="button"
      onClick={() => update.mutate({ is_active: !active })}
      disabled={update.isPending}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ring-1 ring-inset transition-colors',
        active
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 hover:bg-emerald-100'
          : 'bg-gray-100 text-gray-600 ring-gray-300 hover:bg-gray-200',
      )}
      aria-pressed={active}
    >
      {update.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Power className="h-4 w-4" />
      )}
      {active ? 'Agent active' : 'Agent paused'}
    </button>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────

const STAT_CARDS = [
  { key: 'deals_nudged', label: 'Deals nudged', icon: Bot },
  { key: 'followups_sent', label: 'Follow-ups sent', icon: Mail },
  { key: 'stage_advances', label: 'Stage advances', icon: ArrowUpRight },
  { key: 'at_risk_count', label: 'At risk', icon: AlertTriangle, tone: 'amber' },
];

function StatsRow() {
  const { data: stats } = useDealAgentStats();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {STAT_CARDS.map(({ key, label, icon: Icon, tone }) => (
        <div
          key={key}
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 text-gray-500">
            <Icon className={cn('h-4 w-4', tone === 'amber' && 'text-amber-500')} />
            <span className="text-xs font-medium">{label}</span>
          </div>
          <div className="mt-1.5 text-2xl font-semibold text-gray-900">
            {stats?.[key] ?? '—'}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Action queue (pending) ────────────────────────────────────────────────────

function ActionQueue() {
  const { data: actions, isLoading } = useDealActions({ status: 'pending' });
  const approve = useApproveAction();
  const dismiss = useDismissAction();

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Clock className="h-4 w-4 text-gray-400" />
          Action queue
          {actions?.length > 0 && (
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
              {actions.length}
            </span>
          )}
        </h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : !actions?.length ? (
        <EmptyState
          icon={CheckCircle2}
          title="Nothing waiting on you"
          description="When the agent finds a stalled deal, its suggestion shows up here for you to approve or dismiss."
        />
      ) : (
        <ul className="divide-y divide-gray-100">
          {actions.map((a) => (
            <ActionRow
              key={a.id}
              action={a}
              onApprove={() => approve.mutate(a.id)}
              onDismiss={() => dismiss.mutate(a.id)}
              busy={
                (approve.isPending && approve.variables === a.id) ||
                (dismiss.isPending && dismiss.variables === a.id)
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function ActionRow({ action, onApprove, onDismiss, busy }) {
  const meta = ACTION_TYPE_META[action.action_type] || { label: action.action_type };
  const Icon = TYPE_ICON[action.action_type] || Sparkles;
  const [showEmail, setShowEmail] = useState(false);
  const hasEmail = Boolean(action.email_body);

  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'mt-0.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset',
            TYPE_TONE[action.action_type] || 'bg-gray-50 text-gray-600 ring-gray-300',
          )}
        >
          <Icon className="h-3 w-3" />
          {meta.label}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900">
            {action.deal_title || 'Deal'}
            {action.company_name && (
              <span className="font-normal text-gray-500"> · {action.company_name}</span>
            )}
          </p>
          {action.suggested_action && (
            <p className="mt-0.5 text-sm text-gray-600">{action.suggested_action}</p>
          )}
          {action.ai_reasoning && (
            <p className="mt-0.5 text-xs text-gray-400">{action.ai_reasoning}</p>
          )}

          {hasEmail && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowEmail((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
              >
                {showEmail ? <ChevronUp className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                {showEmail ? 'Hide draft' : 'Preview draft'}
              </button>
              {showEmail && (
                <div className="mt-2 rounded-lg bg-gray-50 p-3 text-sm">
                  <p className="font-medium text-gray-900">{action.email_subject}</p>
                  <p className="mt-1 whitespace-pre-wrap text-gray-600">{action.email_body}</p>
                </div>
              )}
            </div>
          )}

          <p className="mt-1 text-xs text-gray-400">{timeAgo(action.created_at)}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onApprove}
            disabled={busy}
            title={hasEmail ? 'Approve & send' : 'Approve'}
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {hasEmail ? 'Send' : 'Approve'}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            disabled={busy}
            title="Dismiss"
            className="inline-flex items-center rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </li>
  );
}

// ── Recent activity ───────────────────────────────────────────────────────────

function ActivityFeed() {
  // Everything the agent has actioned (executed / dismissed / expired), newest
  // first. Pending items live in the queue above, so exclude them here.
  const { data: all, isLoading } = useDealActions({ limit: 50 });
  const done = (all || []).filter((a) => a.status !== 'pending' && a.status !== 'approved');

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Recent activity</h2>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : !done.length ? (
        <EmptyState icon={Bot} title="No agent activity yet" description="Actions the agent takes will appear here." />
      ) : (
        <ul className="divide-y divide-gray-100">
          {done.map((a) => {
            const meta = ACTION_TYPE_META[a.action_type] || { label: a.action_type };
            const Icon = TYPE_ICON[a.action_type] || Sparkles;
            return (
              <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                <Icon className="h-4 w-4 shrink-0 text-gray-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-700">
                    <span className="font-medium">{meta.label}</span>
                    {' · '}
                    {a.deal_title || 'Deal'}
                    {a.company_name && <span className="text-gray-400"> ({a.company_name})</span>}
                  </p>
                </div>
                <StatusBadge status={a.status} />
                <span className="shrink-0 text-xs text-gray-400">
                  {timeAgo(a.executed_at || a.dismissed_at || a.created_at)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function StatusBadge({ status }) {
  const tone = {
    executed: 'bg-emerald-50 text-emerald-700',
    dismissed: 'bg-gray-100 text-gray-500',
    expired: 'bg-gray-100 text-gray-400',
  }[status] || 'bg-gray-100 text-gray-500';
  return (
    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', tone)}>
      {status}
    </span>
  );
}

// ── Config panel ──────────────────────────────────────────────────────────────

function ConfigPanel({ config }) {
  const update = useUpdateDealAgentConfig();
  const [thresholds, setThresholds] = useState(() => ({ ...(config.stale_thresholds || {}) }));
  const [autoAdvance, setAutoAdvance] = useState(config.auto_advance_enabled);
  const [autoFollowup, setAutoFollowup] = useState(config.auto_followup_enabled);
  const [maxFollowups, setMaxFollowups] = useState(config.max_auto_followups_per_deal);
  const [escalationDays, setEscalationDays] = useState(config.escalation_threshold_days);
  const [llmModel, setLlmModel] = useState(config.llm_model || LLM_MODELS[0].id);
  // The stored key is never returned — track only whether one exists, and the
  // new value the user is typing (blank = leave unchanged, unless they clear).
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [clearKey, setClearKey] = useState(false);

  // The backend's own model list wins when present, so a new model added
  // server-side shows up without a frontend deploy.
  const modelOptions = (config.llm_model_choices?.length
    ? config.llm_model_choices.map((id) => ({ id, label: llmModelLabel(id) }))
    : LLM_MODELS);

  const save = () => {
    const payload = {
      stale_thresholds: thresholds,
      auto_advance_enabled: autoAdvance,
      auto_followup_enabled: autoFollowup,
      max_auto_followups_per_deal: Number(maxFollowups),
      escalation_threshold_days: Number(escalationDays),
      llm_model: llmModel,
    };
    // Only send the key when the user typed a new one, or explicitly cleared it.
    if (apiKeyInput.trim()) payload.llm_api_key = apiKeyInput.trim();
    else if (clearKey) payload.llm_api_key = '';
    update.mutate(payload, {
      onSuccess: () => {
        setApiKeyInput('');
        setClearKey(false);
      },
    });
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900">Configuration</h2>

      <div className="mt-4">
        <p className="text-xs font-medium text-gray-500">
          Stale thresholds <span className="font-normal">(days with no activity, per stage)</span>
        </p>
        <div className="mt-2 space-y-1.5">
          {DEAL_STAGES.map((stage) => (
            <label key={stage} className="flex items-center justify-between gap-2">
              <span className="text-sm text-gray-700">{STAGE_LABEL(stage)}</span>
              <input
                type="number"
                min={0}
                max={365}
                aria-label={`${stage} stale threshold in days`}
                value={thresholds[stage] ?? ''}
                onChange={(e) =>
                  setThresholds((t) => ({
                    ...t,
                    [stage]: e.target.value === '' ? '' : Number(e.target.value),
                  }))
                }
                className="w-20 rounded-md border border-gray-300 px-2 py-1 text-right text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
        <ToggleRow
          label="Auto-advance stages"
          hint="Move a deal forward off signals (reply, booked meeting)."
          checked={autoAdvance}
          onChange={setAutoAdvance}
        />
        <ToggleRow
          label="Auto-draft follow-ups"
          hint="Draft a follow-up email for each stalled deal."
          checked={autoFollowup}
          onChange={setAutoFollowup}
        />
      </div>

      <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
        <label className="flex items-center justify-between gap-2">
          <span className="text-sm text-gray-700">Max follow-ups / deal</span>
          <input
            type="number"
            min={0}
            max={50}
            aria-label="Max follow-ups per deal"
            value={maxFollowups}
            onChange={(e) => setMaxFollowups(e.target.value)}
            className="w-20 rounded-md border border-gray-300 px-2 py-1 text-right text-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </label>
        <label className="flex items-center justify-between gap-2">
          <span className="text-sm text-gray-700">Escalate after (days)</span>
          <input
            type="number"
            min={1}
            max={365}
            aria-label="Escalation threshold in days"
            value={escalationDays}
            onChange={(e) => setEscalationDays(e.target.value)}
            className="w-20 rounded-md border border-gray-300 px-2 py-1 text-right text-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </label>
      </div>

      <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
          <Cpu className="h-3.5 w-3.5" />
          AI model
        </div>
        <label className="block">
          <span className="text-sm text-gray-700">OpenRouter model</span>
          <select
            aria-label="AI model"
            value={llmModel}
            onChange={(e) => setLlmModel(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {modelOptions.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="flex items-center gap-2 text-sm text-gray-700">
            <KeyRound className="h-3.5 w-3.5 text-gray-400" />
            OpenRouter API key
            {config.has_llm_api_key && !clearKey && (
              <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700">
                key set
              </span>
            )}
          </span>
          <input
            type="password"
            autoComplete="off"
            aria-label="OpenRouter API key"
            placeholder={config.has_llm_api_key ? 'Leave blank to keep current key' : 'sk-or-…'}
            value={apiKeyInput}
            onChange={(e) => {
              setApiKeyInput(e.target.value);
              if (e.target.value) setClearKey(false);
            }}
            className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <span className="mt-1 block text-xs text-gray-400">
            Stored encrypted. Falls back to the org OpenRouter key when empty.
          </span>
          {config.has_llm_api_key && (
            <label className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
              <input
                type="checkbox"
                checked={clearKey}
                onChange={(e) => {
                  setClearKey(e.target.checked);
                  if (e.target.checked) setApiKeyInput('');
                }}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Remove the saved key
            </label>
          )}
        </label>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={update.isPending}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        Save settings
      </button>
    </section>
  );
}

function ToggleRow({ label, hint, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm text-gray-700">{label}</p>
        {hint && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
          checked ? 'bg-indigo-600' : 'bg-gray-300',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 animate-pulse rounded bg-gray-100" />
        ))}
      </div>
    </div>
  );
}
