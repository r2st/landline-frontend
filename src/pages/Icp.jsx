import { useState } from 'react';
import {
  AlertTriangle, Ban, Building2, Check, Loader2, Lock, MapPin, Pencil,
  RefreshCw, Sparkles, Target, Unlock, Users, X,
} from 'lucide-react';
import HelpIcon from '../components/HelpIcon';
import InfoTooltip from '../components/InfoTooltip';
import ConfirmDialog from '../components/ConfirmDialog';
import { useLearnIcp, useProspectingIcp, useUpdateIcp } from '../hooks/useProspecting';
import { cn, timeAgo } from '../lib/utils';

/**
 * The Ideal Customer Profile — what every fit score is judged against.
 *
 * It was invisible: the hook and the API client entry both existed, rendered by
 * no page. So the number deciding whether a real cold email goes to a real
 * business was scored against a rubric nobody could read, let alone correct.
 *
 * The central idea on this page is **pinned vs learned**. The profile refits
 * itself from won deals every Monday. A field you pin is yours and survives
 * that; a field you leave alone keeps tracking what actually closes. Every
 * control here says which state it's in, because "will Monday undo this?" is
 * the only question that matters when you're editing it.
 */

const FIELDS = [
  {
    key: 'industry_weights',
    label: 'Industry weights',
    icon: Building2,
    blurb: 'How much each segment counts toward fit. Worth up to 40 of the 100 points.',
  },
  {
    key: 'size_range',
    label: 'Company size',
    icon: Users,
    blurb: 'Headcount band that scores full marks. Worth up to 30 points.',
  },
  {
    key: 'location_preferences',
    label: 'Location',
    icon: MapPin,
    blurb: 'Preferred countries and states. Worth up to 20 points.',
  },
  {
    key: 'exclusion_criteria',
    label: 'Hard exclusions',
    icon: Ban,
    blurb: 'Disqualifiers. A match here zeroes the score outright — no email is ever sent.',
  },
  {
    key: 'technology_signals',
    label: 'Technology signals',
    icon: Sparkles,
    blurb: 'Systems that correlate with wins. Used when qualifying, not scored directly.',
  },
  {
    key: 'pain_point_indicators',
    label: 'Pain points',
    icon: Target,
    blurb: 'Phrases the AI looks for when qualifying a company.',
  },
];

export default function Icp() {
  const { data: icp, isLoading, isError, error, refetch } = useProspectingIcp();
  const learn = useLearnIcp();
  const [confirmingLearn, setConfirmingLearn] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  // A failed fetch must not render as "no ICP learned yet" — that would send an
  // operator to re-learn a profile that already exists and is working.
  if (isError) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            Couldn't load the ICP
          </h2>
          <p className="mt-1.5 text-sm text-amber-800">
            {error?.response?.data?.detail || error?.message || 'The endpoint did not respond.'}
          </p>
          <p className="mt-1 text-xs text-amber-700">
            This does not mean there's no ICP — only that we couldn't read it. The agent is still
            scoring against whatever it has.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Genuinely nothing learned yet — a real state on a fresh install.
  if (!icp) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <Target className="mx-auto h-8 w-8 text-gray-300" />
          <h2 className="mt-3 text-sm font-semibold text-gray-900">No ICP learned yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
            The agent fits a profile from your won deals. With no won history it falls back to
            sensible manufacturing defaults — you can learn one now and tune it from there.
          </p>
          <button
            type="button"
            disabled={learn.isPending}
            onClick={() => learn.mutate()}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {learn.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Learn my ICP
          </button>
        </div>
      </div>
    );
  }

  const overrides = icp.manual_overrides || {};
  const pinnedCount = Object.keys(overrides).length;

  return (
    <div className="space-y-6">
      <Header
        onLearn={() => setConfirmingLearn(true)}
        learning={learn.isPending}
      />

      {/* Provenance of the profile itself. "Learned from 14 won deals" and
          "Sam decided this in March" are different things to trust. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Fit from</div>
          <div className="mt-0.5 text-sm font-semibold text-gray-900">
            {icp.learned_from_deal_count
              ? `${icp.learned_from_deal_count} won deal${icp.learned_from_deal_count === 1 ? '' : 's'}`
              : 'Defaults — no won deals yet'}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Last refit</div>
          <div className="mt-0.5 text-sm text-gray-700">{timeAgo(icp.updated_at)}</div>
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Pinned by you</div>
          <div className="mt-0.5 text-sm text-gray-700">
            {pinnedCount ? `${pinnedCount} field${pinnedCount === 1 ? '' : 's'}` : 'None'}
            {icp.edited_by ? ` · last by ${icp.edited_by} ${timeAgo(icp.edited_at)}` : ''}
          </div>
        </div>
      </div>

      {/* The one thing an operator needs to believe before editing anything. */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-5 py-4 text-sm text-indigo-900">
        <p className="flex items-start gap-2">
          <Lock className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            The agent refits this from won deals every Monday. <strong>Anything you pin is yours</strong> —
            re-learning re-applies it rather than overwriting it. Fields you leave learned keep
            improving on their own.
          </span>
        </p>
      </div>

      <div className="space-y-4">
        {FIELDS.map((field) => (
          <FieldCard
            key={field.key}
            field={field}
            value={icp[field.key]}
            pinned={field.key in overrides}
          />
        ))}
      </div>

      <ConfirmDialog
        open={confirmingLearn}
        variant="warning"
        title="Refit the ICP from won deals?"
        message={
          pinnedCount
            ? `This recomputes every learned field from your won deals. Your ${pinnedCount} pinned ` +
              `field${pinnedCount === 1 ? '' : 's'} will be re-applied on top and will not change. ` +
              'Fit scores for future candidates will shift.'
            : 'This recomputes the whole profile from your won deals. Nothing is pinned, so every ' +
              'field may change, and fit scores for future candidates will shift with it.'
        }
        confirmLabel="Refit now"
        onConfirm={() => {
          learn.mutate();
          setConfirmingLearn(false);
        }}
        onCancel={() => setConfirmingLearn(false)}
      />
    </div>
  );
}

function Header({ onLearn, learning }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900">
          <Target className="h-6 w-6 text-indigo-500" />
          Ideal Customer Profile
          <HelpIcon articleId="icp-scoring" />
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          The rubric every fit score is judged against. The agent learns it from your won deals —
          you can correct any part of it, and your corrections stick.
        </p>
      </div>
      {onLearn && (
        <button
          type="button"
          disabled={learning}
          onClick={onLearn}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {learning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Re-learn from won deals
        </button>
      )}
    </div>
  );
}

function FieldCard({ field, value, pinned }) {
  const [editing, setEditing] = useState(false);
  const { icon: Icon } = field;

  return (
    <div className={cn('rounded-xl border bg-white shadow-sm', pinned ? 'border-indigo-200' : 'border-gray-200')}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-5 py-3">
        <div className="flex items-start gap-2.5">
          <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              {field.label}
              {pinned ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                  <Lock className="h-2.5 w-2.5" />
                  Pinned
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500 ring-1 ring-inset ring-gray-500/20">
                  <Sparkles className="h-2.5 w-2.5" />
                  Learned
                </span>
              )}
              <InfoTooltip
                text={
                  pinned
                    ? 'Pinned: locked to your value. The Monday relearn from won deals leaves it alone.'
                    : 'Learned: the weekly relearn from won deals can change this. Pin it to make it stick.'
                }
              />
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">{field.blurb}</p>
          </div>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <FieldEditor field={field} value={value} pinned={pinned} onDone={() => setEditing(false)} />
      ) : (
        <div className="px-5 py-4">
          <FieldPreview fieldKey={field.key} value={value} />
        </div>
      )}
    </div>
  );
}

// Read-only rendering per shape. The ICP's fields are three different kinds of
// thing and a single JSON dump would make none of them scannable.
function FieldPreview({ fieldKey, value }) {
  if (fieldKey === 'industry_weights') {
    const entries = Object.entries(value || {}).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return <Empty>No industries weighted.</Empty>;
    return (
      <ul className="space-y-2">
        {entries.map(([segment, weight]) => (
          <li key={segment}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-gray-700">{segment}</span>
              <span className="font-medium text-gray-900">{Math.round(weight * 100)}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{ width: `${Math.max(0, Math.min(100, weight * 100))}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (fieldKey === 'size_range') {
    const v = value || {};
    return (
      <dl className="grid grid-cols-3 gap-3">
        {[
          { label: 'Min', v: v.min },
          { label: 'Ideal', v: v.ideal },
          { label: 'Max', v: v.max },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2">
            <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{s.label}</dt>
            <dd className="mt-0.5 text-lg font-bold text-gray-900">{s.v ?? '—'}</dd>
          </div>
        ))}
      </dl>
    );
  }

  if (fieldKey === 'location_preferences') {
    const v = value || {};
    const countries = v.countries || [];
    const states = v.states || [];
    if (!countries.length && !states.length) return <Empty>No location preference.</Empty>;
    return (
      <div className="space-y-2">
        {countries.length > 0 && <Chips label="Countries" items={countries} />}
        {states.length > 0 && <Chips label="States" items={states} />}
      </div>
    );
  }

  if (fieldKey === 'exclusion_criteria') {
    const v = value || {};
    const industries = v.industries || [];
    const countries = v.countries || [];
    const hasBounds = v.min_employees != null || v.max_employees != null;
    if (!industries.length && !countries.length && !hasBounds) {
      return <Empty>Nothing is excluded — every candidate is scored on merit alone.</Empty>;
    }
    return (
      <div className="space-y-2">
        {industries.length > 0 && <Chips label="Industries" items={industries} tone="red" />}
        {countries.length > 0 && <Chips label="Countries" items={countries} tone="red" />}
        {hasBounds && (
          <p className="text-sm text-gray-600">
            Headcount outside{' '}
            <span className="font-medium text-gray-900">
              {v.min_employees ?? '0'}–{v.max_employees ?? '∞'}
            </span>{' '}
            is disqualified.
          </p>
        )}
      </div>
    );
  }

  // technology_signals / pain_point_indicators — plain lists.
  const items = Array.isArray(value) ? value : [];
  if (!items.length) return <Empty>Nothing set.</Empty>;
  return <Chips items={items} />;
}

function Empty({ children }) {
  return <p className="text-sm text-gray-400">{children}</p>;
}

function Chips({ label, items, tone = 'gray' }) {
  return (
    <div>
      {label && <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</div>}
      <div className="mt-1 flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
              tone === 'red'
                ? 'bg-red-50 text-red-700 ring-red-600/20'
                : 'bg-gray-100 text-gray-700 ring-gray-500/20'
            )}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * JSON editing, deliberately.
 *
 * These fields are open-ended maps and lists whose keys are the user's own
 * industry names — a bespoke widget per shape would either constrain the
 * vocabulary (you couldn't add a segment the learner hasn't seen) or become a
 * worse JSON editor with extra steps. The read view above carries the everyday
 * legibility; this is the escape hatch, and it validates before it saves so a
 * typo can't blank a field the agent scores on.
 */
function FieldEditor({ field, value, pinned, onDone }) {
  const [text, setText] = useState(() => JSON.stringify(value ?? (field.key.endsWith('s') && Array.isArray(value) ? [] : {}), null, 2));
  const [parseError, setParseError] = useState(null);
  const update = useUpdateIcp();

  const save = () => {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      setParseError(e.message);
      return;
    }
    const wantsArray = Array.isArray(value);
    if (wantsArray !== Array.isArray(parsed)) {
      setParseError(
        wantsArray
          ? 'This field is a list — it must stay a JSON array.'
          : 'This field is an object — it must stay a JSON object.'
      );
      return;
    }
    setParseError(null);
    update.mutate({ [field.key]: parsed }, { onSuccess: onDone });
  };

  const release = () => update.mutate({ unpin: [field.key] }, { onSuccess: onDone });

  return (
    <div className="space-y-3 px-5 py-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={Math.min(16, Math.max(4, text.split('\n').length))}
        aria-label={`${field.label} as JSON`}
        spellCheck={false}
        className="w-full rounded-lg border border-gray-200 bg-gray-50/70 px-3 py-2 font-mono text-xs text-gray-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />

      {parseError && (
        <p role="alert" className="flex items-start gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          {parseError}
        </p>
      )}

      <p className="text-xs text-gray-500">
        Saving pins this field: the Monday re-learn will re-apply it instead of recomputing it.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={update.isPending}
          onClick={save}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save &amp; pin
        </button>
        <button
          type="button"
          onClick={onDone}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
        {/* Only offered when there's something to release. Releasing keeps the
            current value until the next refit — say so rather than implying the
            learned value snaps back now. */}
        {pinned && (
          <button
            type="button"
            disabled={update.isPending}
            onClick={release}
            title="Hand this field back to the learner. It keeps its current value until the next refit."
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
          >
            <Unlock className="h-3.5 w-3.5" />
            Unpin &amp; let it learn again
          </button>
        )}
      </div>
    </div>
  );
}
