import { useEffect, useState } from 'react';
import {
  ArrowLeft, Ban, CheckCircle2, ChevronRight, Clock, Gauge, Globe, Loader2,
  Pause, Pencil, Play, Plus, RefreshCw, ShieldAlert, SlidersHorizontal, Trash2,
  User, Users, X,
} from 'lucide-react';
import HelpIcon from '../components/HelpIcon';
import InfoTooltip from '../components/InfoTooltip';
import EmptyState from '../components/EmptyState';
import {
  HUMAN_REVIEW_TRIGGERS, ORCHESTRATION_CHANNELS, ORCHESTRATION_MODES,
  useCreatePolicy, useDeletePolicy, usePolicies, useSetEnrollmentMode,
  useTogglePolicy, useUpdatePolicy,
} from '../hooks/useOrchestration';
import { cn, timeAgo } from '../lib/utils';

/**
 * Orchestration Policy Management — the guardrails the autonomous engine
 * (Dialtone's multi-channel orchestrator, feature 2.2) runs within.
 *
 * A policy bounds how aggressively the agent may act: how many touches per day
 * and in total, how long to wait between them, which channels it may use, which
 * channels a full cadence must attempt, and which situations force a hand-off to
 * a human. Policies are either global (the default fallback) or scoped to one
 * rep. This screen lists them, creates and edits them, toggles them
 * active/paused, and — because orchestration mode lives on the enrollment, not
 * the policy — switches a single enrollment between manual / assisted /
 * autonomous.
 */

// Human-readable labels for the fixed vocabularies.
const CHANNEL_LABELS = { email: 'Email', linkedin: 'LinkedIn', phone: 'Phone' };
const TRIGGER_LABELS = {
  pricing_request: 'Pricing request',
  complex_objection: 'Complex objection',
  referral: 'Referral',
  legal: 'Legal',
};
const MODE_META = {
  manual: { label: 'Manual', hint: 'A human sends every touch.' },
  assisted: { label: 'Assisted', hint: 'The agent drafts; a human approves.' },
  autonomous: { label: 'Autonomous', hint: 'The agent sends within the policy.' },
};

const humanize = (v) => String(v).replace(/_/g, ' ');

export default function DialtonePolicies() {
  const [selectedId, setSelectedId] = useState(null);
  const [creating, setCreating] = useState(false);

  if (selectedId) {
    return <PolicyDetail policyId={selectedId} onBack={() => setSelectedId(null)} />;
  }
  return (
    <>
      <PolicyList onSelect={setSelectedId} onCreate={() => setCreating(true)} />
      {creating && (
        <PolicyFormModal
          onClose={() => setCreating(false)}
          onSaved={(p) => {
            setCreating(false);
            if (p?.id) setSelectedId(p.id);
          }}
        />
      )}
    </>
  );
}

// ── List ────────────────────────────────────────────────────────────────────

const FILTERS = [
  { key: 'all', label: 'All', activeOnly: false },
  { key: 'active', label: 'Active', activeOnly: true },
];

function PolicyList({ onSelect, onCreate }) {
  const [filter, setFilter] = useState('all');
  const active = FILTERS.find((f) => f.key === filter) || FILTERS[0];
  const { data: policies = [], isLoading, isError, refetch, isFetching } = usePolicies(
    active.activeOnly
  );
  // The "Paused" tab is a client-side narrowing of the full list (the backend
  // only exposes active_only), so it stays honest even without a status enum.
  const shown = filter === 'paused' ? policies.filter((p) => !p.is_active) : policies;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900">
            <SlidersHorizontal className="h-6 w-6 text-indigo-500" />
            Orchestration Policies
            <HelpIcon articleId="orchestration-policies" />
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            The guardrails Dialtone's autonomous orchestrator runs within — cadence limits,
            allowed and required channels, and the situations that force a hand-off to a human.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 shadow-sm hover:bg-gray-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
            Refresh
          </button>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            New policy
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[...FILTERS, { key: 'paused', label: 'Paused' }].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition',
              filter === f.key
                ? 'bg-indigo-600 text-white ring-indigo-600'
                : 'bg-white text-gray-600 ring-gray-200 hover:bg-gray-50'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          Couldn't load orchestration policies right now. The endpoint did not respond.
        </div>
      ) : shown.length === 0 ? (
        <EmptyState
          icon={SlidersHorizontal}
          title={filter === 'all' ? 'No policies yet' : 'Nothing in this state'}
          description={
            filter === 'all'
              ? 'Create a policy to bound how the autonomous orchestrator paces touches and picks channels.'
              : 'No policies match this filter. Try another tab.'
          }
          action={filter === 'all' ? { label: 'New policy', onClick: onCreate } : undefined}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {shown.map((p) => (
            <PolicyCard key={p.id} policy={p} onSelect={() => onSelect(p.id)} />
          ))}
        </ul>
      )}

      <EnrollmentModePanel />
    </div>
  );
}

function StatusBadge({ active }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        active
          ? 'bg-green-50 text-green-700 ring-green-200'
          : 'bg-gray-100 text-gray-600 ring-gray-200'
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-green-500' : 'bg-gray-400')} />
      {active ? 'Active' : 'Paused'}
    </span>
  );
}

function ScopeBadge({ userId }) {
  const global = !userId;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200"
      title={global ? 'Default fallback for reps without their own policy' : `Scoped to user ${userId}`}
    >
      {global ? <Globe className="h-3 w-3" /> : <User className="h-3 w-3" />}
      {global ? 'Global' : 'Per-rep'}
    </span>
  );
}

function PolicyCard({ policy, onSelect }) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="group flex w-full flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-300 hover:shadow"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-semibold text-gray-900">{policy.name}</span>
              <StatusBadge active={policy.is_active} />
              <ScopeBadge userId={policy.user_id} />
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              Updated {timeAgo(policy.updated_at || policy.created_at)}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-indigo-400" />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1">
            <Gauge className="h-3.5 w-3.5 text-gray-400" />
            {policy.max_daily_touches}/day · {policy.max_total_touches} total
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-gray-400" />
            {policy.min_hours_between_touches}h apart
          </span>
        </div>

        <div className="flex flex-wrap gap-1">
          {(policy.allowed_channels || []).map((c) => (
            <span key={c} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
              {CHANNEL_LABELS[c] || humanize(c)}
            </span>
          ))}
          {(policy.allowed_channels || []).length === 0 && (
            <span className="text-[11px] text-gray-400">No channels allowed</span>
          )}
        </div>
      </button>
    </li>
  );
}

// ── Detail ───────────────────────────────────────────────────────────────────

function PolicyDetail({ policyId, onBack }) {
  const { data: policies = [], isLoading, isError } = usePolicies(false);
  const policy = policies.find((p) => p.id === policyId);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const toggle = useTogglePolicy();
  const del = useDeletePolicy();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <BackBar onBack={onBack} />
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </div>
    );
  }

  if (isError || !policy) {
    return (
      <div className="space-y-6">
        <BackBar onBack={onBack} />
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          Couldn't load this policy. It may have been removed, or the endpoint did not respond.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackBar onBack={onBack} />

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">{policy.name}</h2>
              <StatusBadge active={policy.is_active} />
              <ScopeBadge userId={policy.user_id} />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Created {timeAgo(policy.created_at)} · updated {timeAgo(policy.updated_at || policy.created_at)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={toggle.isPending}
              onClick={() => toggle.mutate({ id: policy.id, isActive: !policy.is_active })}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium shadow-sm disabled:opacity-50',
                policy.is_active
                  ? 'border-amber-200 bg-white text-amber-700 hover:bg-amber-50'
                  : 'border-green-200 bg-white text-green-700 hover:bg-green-50'
              )}
            >
              {toggle.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : policy.is_active ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {policy.is_active ? 'Pause' : 'Activate'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-sm font-medium text-indigo-700 shadow-sm hover:bg-indigo-50"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-500 shadow-sm hover:bg-gray-50 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Rules & conditions */}
      <div className="grid gap-4 md:grid-cols-2">
        <RulesCard title="Cadence guardrails" icon={Gauge}>
          <Rule
            label="Max touches per day"
            value={policy.max_daily_touches}
            tip="The most messages the agent may send one contact in a single day, across all channels."
          />
          <Rule
            label="Max touches total"
            value={policy.max_total_touches}
            tip="The lifetime cap on touches per contact before the agent stops reaching out."
          />
          <Rule
            label="Min hours between touches"
            value={`${policy.min_hours_between_touches}h`}
            tip="The minimum gap between two touches so a contact never gets messaged back to back."
          />
        </RulesCard>

        <RulesCard title="Channels" icon={Globe}>
          <ChipRow label="Allowed" items={policy.allowed_channels} labels={CHANNEL_LABELS} empty="No channels allowed" />
          <ChipRow
            label="Required for a full cadence"
            items={policy.required_channels}
            labels={CHANNEL_LABELS}
            empty="None required"
          />
        </RulesCard>

        <RulesCard title="Human-in-the-loop" icon={ShieldAlert} className="md:col-span-2">
          <p className="text-xs text-gray-500">
            Signals that force a flag-for-human decision rather than auto-executing a touch.
          </p>
          <ChipRow items={policy.human_review_triggers} labels={TRIGGER_LABELS} empty="No triggers — the agent never hands off" />
        </RulesCard>
      </div>

      {editing && (
        <PolicyFormModal
          policy={policy}
          onClose={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      )}
      {confirmDelete && (
        <ConfirmDelete
          name={policy.name}
          pending={del.isPending}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() =>
            del.mutate(policy.id, {
              onSuccess: () => {
                setConfirmDelete(false);
                onBack();
              },
            })
          }
        />
      )}
    </div>
  );
}

function BackBar({ onBack }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      All policies
    </button>
  );
}

function RulesCard({ title, icon: Icon, className, children }) {
  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white p-5 shadow-sm', className)}>
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
        <Icon className="h-4 w-4 text-gray-400" />
        {title}
      </h3>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function Rule({ label, value, tip }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-1 text-gray-500">
        {label}
        {tip && <InfoTooltip text={tip} />}
      </span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

function ChipRow({ label, items, labels, empty }) {
  const list = items || [];
  return (
    <div>
      {label && <p className="mb-1 text-xs font-medium text-gray-500">{label}</p>}
      {list.length === 0 ? (
        <p className="text-xs text-gray-400">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {list.map((v) => (
            <span
              key={v}
              className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-100"
            >
              {labels[v] || humanize(v)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Create / edit form ───────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: 'Default policy',
  max_daily_touches: 2,
  max_total_touches: 12,
  min_hours_between_touches: 24,
  allowed_channels: [...ORCHESTRATION_CHANNELS],
  required_channels: [],
  human_review_triggers: [...HUMAN_REVIEW_TRIGGERS],
  is_active: true,
};

// Backend field bounds — mirrored so the form guides the operator instead of
// waiting for a 422.
const NUM_BOUNDS = {
  max_daily_touches: { min: 1, max: 20 },
  max_total_touches: { min: 1, max: 100 },
  min_hours_between_touches: { min: 1, max: 720 },
};

function toForm(policy) {
  if (!policy) return { ...EMPTY_FORM };
  return {
    name: policy.name ?? 'Default policy',
    max_daily_touches: policy.max_daily_touches ?? 2,
    max_total_touches: policy.max_total_touches ?? 12,
    min_hours_between_touches: policy.min_hours_between_touches ?? 24,
    allowed_channels: [...(policy.allowed_channels || [])],
    required_channels: [...(policy.required_channels || [])],
    human_review_triggers: [...(policy.human_review_triggers || [])],
    is_active: policy.is_active ?? true,
  };
}

function PolicyFormModal({ policy, onClose, onSaved }) {
  const isEdit = Boolean(policy);
  const [form, setForm] = useState(() => toForm(policy));
  const create = useCreatePolicy();
  const update = useUpdatePolicy();
  const pending = create.isPending || update.isPending;

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const toggleIn = (key, value) =>
    setForm((f) => {
      const has = f[key].includes(value);
      return { ...f, [key]: has ? f[key].filter((v) => v !== value) : [...f[key], value] };
    });

  const nameError = !form.name.trim() ? 'A name is required.' : null;
  // A required channel that isn't allowed can never be attempted.
  const badRequired = form.required_channels.filter((c) => !form.allowed_channels.includes(c));
  const requiredError =
    badRequired.length > 0
      ? `Required channel(s) must also be allowed: ${badRequired.join(', ')}.`
      : null;
  const canSave = !nameError && !requiredError && !pending;

  const submit = (e) => {
    e.preventDefault();
    if (!canSave) return;
    const payload = {
      name: form.name.trim(),
      max_daily_touches: Number(form.max_daily_touches),
      max_total_touches: Number(form.max_total_touches),
      min_hours_between_touches: Number(form.min_hours_between_touches),
      allowed_channels: form.allowed_channels,
      required_channels: form.required_channels,
      human_review_triggers: form.human_review_triggers,
      is_active: form.is_active,
    };
    const opts = { onSuccess: (p) => onSaved?.(p) };
    if (isEdit) update.mutate({ id: policy.id, data: payload }, opts);
    else create.mutate(payload, opts);
  };

  return (
    <Modal onClose={onClose} title={isEdit ? 'Edit policy' : 'New policy'}>
      <form onSubmit={submit} className="space-y-5">
        <Field label="Name" error={nameError}>
          <input
            type="text"
            value={form.name}
            maxLength={120}
            onChange={(e) => set('name', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            placeholder="e.g. Conservative outbound"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField
            label="Max / day"
            value={form.max_daily_touches}
            bounds={NUM_BOUNDS.max_daily_touches}
            onChange={(v) => set('max_daily_touches', v)}
          />
          <NumberField
            label="Max total"
            value={form.max_total_touches}
            bounds={NUM_BOUNDS.max_total_touches}
            onChange={(v) => set('max_total_touches', v)}
          />
          <NumberField
            label="Hours apart"
            value={form.min_hours_between_touches}
            bounds={NUM_BOUNDS.min_hours_between_touches}
            onChange={(v) => set('min_hours_between_touches', v)}
          />
        </div>

        <Field label="Allowed channels">
          <CheckRow
            options={ORCHESTRATION_CHANNELS}
            labels={CHANNEL_LABELS}
            selected={form.allowed_channels}
            onToggle={(v) => toggleIn('allowed_channels', v)}
          />
        </Field>

        <Field label="Required channels" error={requiredError} hint="A full cadence must attempt these before giving up.">
          <CheckRow
            options={ORCHESTRATION_CHANNELS}
            labels={CHANNEL_LABELS}
            selected={form.required_channels}
            onToggle={(v) => toggleIn('required_channels', v)}
          />
        </Field>

        <Field label="Human-review triggers" hint="Signals that force a hand-off to a human.">
          <CheckRow
            options={HUMAN_REVIEW_TRIGGERS}
            labels={TRIGGER_LABELS}
            selected={form.human_review_triggers}
            onToggle={(v) => toggleIn('human_review_triggers', v)}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => set('is_active', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          Active (the orchestrator may resolve to this policy)
        </label>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSave}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {isEdit ? 'Save changes' : 'Create policy'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, hint, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
      <div className="mt-1.5">{children}</div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function NumberField({ label, value, bounds, onChange }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-500">{label}</span>
      <input
        type="number"
        min={bounds.min}
        max={bounds.max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
      />
      <span className="mt-0.5 block text-[10px] text-gray-400">
        {bounds.min}–{bounds.max}
      </span>
    </label>
  );
}

function CheckRow({ options, labels, selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            aria-pressed={on}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition',
              on
                ? 'bg-indigo-600 text-white ring-indigo-600'
                : 'bg-white text-gray-600 ring-gray-200 hover:bg-gray-50'
            )}
          >
            {labels[o] || humanize(o)}
          </button>
        );
      })}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  // Close on Escape for keyboard users.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-900/40 p-4 sm:p-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function ConfirmDelete({ name, pending, onCancel, onConfirm }) {
  return (
    <Modal title="Delete policy" onClose={onCancel}>
      <p className="text-sm text-gray-600">
        Delete <span className="font-semibold text-gray-900">“{name}”</span>? Enrollments that
        resolved to it will fall back to the next matching policy. This can't be undone.
      </p>
      <div className="mt-6 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onConfirm}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Delete policy
        </button>
      </div>
    </Modal>
  );
}

// ── Enrollment mode switching ────────────────────────────────────────────────
// Orchestration mode lives on the enrollment, not the policy, so it gets its own
// small utility: enter an enrollment id and pick how autonomously the agent may
// act on it.

function EnrollmentModePanel() {
  const [enrollmentId, setEnrollmentId] = useState('');
  const [mode, setMode] = useState('assisted');
  const setEnrollmentMode = useSetEnrollmentMode();
  const idValid = enrollmentId.trim().length > 0;

  const submit = (e) => {
    e.preventDefault();
    if (!idValid) return;
    setEnrollmentMode.mutate({ enrollmentId: enrollmentId.trim(), mode });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
        <Users className="h-4 w-4 text-gray-400" />
        Enrollment orchestration mode
      </h3>
      <p className="mt-0.5 text-xs text-gray-500">
        Mode is set per enrollment, not per policy. Switch a single enrollment between manual,
        assisted, and autonomous.
      </p>

      <form onSubmit={submit} className="mt-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="block text-xs font-medium text-gray-500">Enrollment ID</span>
            <input
              type="text"
              value={enrollmentId}
              onChange={(e) => setEnrollmentId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              aria-label="Enrollment ID"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </label>
          <button
            type="submit"
            disabled={!idValid || setEnrollmentMode.isPending}
            className="inline-flex items-center justify-center gap-1.5 self-end rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {setEnrollmentMode.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Apply
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {ORCHESTRATION_MODES.map((m) => {
            const meta = MODE_META[m];
            const on = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={on}
                className={cn(
                  'rounded-lg border p-3 text-left transition',
                  on
                    ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-400'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn('text-sm font-medium', on ? 'text-indigo-700' : 'text-gray-800')}>
                    {meta.label}
                  </span>
                  {m === 'manual' && <Ban className="h-3.5 w-3.5 text-gray-400" />}
                  {m === 'assisted' && <Pencil className="h-3.5 w-3.5 text-gray-400" />}
                  {m === 'autonomous' && <Play className="h-3.5 w-3.5 text-gray-400" />}
                </div>
                <p className="mt-0.5 text-[11px] text-gray-500">{meta.hint}</p>
              </button>
            );
          })}
        </div>
      </form>
    </div>
  );
}
