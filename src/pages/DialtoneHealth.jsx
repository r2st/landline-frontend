import { useState } from 'react';
import {
  Activity, AlertTriangle, CheckCircle2, History, Loader2, RefreshCw,
  ShieldAlert, ShieldCheck, Stethoscope,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import ResumeDialog from '../components/ResumeDialog';
import {
  errorMessage, useDangerEvents, useDangerSignals, useTestDangerSignals,
} from '../hooks/useDangerSignals';
import {
  formatMetricValue, METRIC_LABELS, OVERALL, STATUS_TONE, thresholdProgress,
} from '../lib/dangerSignals';
import { cn, timeAgo } from '../lib/utils';

/**
 * Deliverability Health — the auto-pause rail (Feature 2).
 *
 * Dialtone can halt all outbound email on its own when bounce or complaint
 * rates breach their thresholds. Before this page the entire operator
 * experience of that was "sending quietly stopped": no screen said it had
 * happened, what tripped, or how to get back. This is that screen.
 */
export default function DialtoneHealth() {
  const { data, isLoading, isError, error, refetch, isFetching } = useDangerSignals();
  const [resuming, setResuming] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  // A failed fetch must never render as a clean bill of health. This page's one
  // job is to say whether sending is halted; "I don't know" is the honest answer
  // and it looks nothing like "healthy".
  if (isError) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            Can't read the danger signals
          </h2>
          <p className="mt-1.5 text-sm text-amber-800">
            {errorMessage(error, 'The health endpoint did not respond.')}
          </p>
          <p className="mt-1.5 text-xs text-amber-700">
            This is not the same as “everything is fine” — sending may or may not be paused, and the
            thresholds below cannot be checked right now.
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

  const trip = data?.active_trip || null;
  const overall = OVERALL[data?.overall_status] || OVERALL.healthy;
  const breaches = data?.breaches || [];
  const warnings = data?.warnings || [];

  return (
    <div className="space-y-6">
      <Header onRefresh={() => refetch()} refreshing={isFetching} />

      {/* Verdict */}
      <div
        className={cn(
          'rounded-xl border-2 bg-white p-6 shadow-sm',
          data?.sending_enabled ? 'border-gray-200' : 'border-red-300'
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {data?.sending_enabled ? (
              <ShieldCheck className="mt-0.5 h-6 w-6 text-green-600" />
            ) : (
              <ShieldAlert className="mt-0.5 h-6 w-6 text-red-600" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
                    overall.tone
                  )}
                >
                  {overall.label}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {data?.sending_enabled ? 'Autopilot is sending' : 'Autopilot is not sending'}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">{overall.blurb}</p>
              <p className="mt-0.5 text-xs text-gray-400">
                Measured over the last {data?.window_hours ?? 24}h
                {data?.generated_at ? ` · checked ${timeAgo(data.generated_at)}` : ''}
              </p>
            </div>
          </div>

          {trip && (
            <button
              type="button"
              onClick={() => setResuming(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700"
            >
              <ShieldCheck className="h-4 w-4" />
              Review &amp; resume
            </button>
          )}
        </div>

        {trip && (
          <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
              Dialtone paused itself {timeAgo(trip.triggered_at)}
            </p>
            <p className="mt-1 text-sm text-red-900">
              {METRIC_LABELS[trip.metric] || trip.metric} reached{' '}
              <span className="font-semibold">{formatMetricValue(trip.metric, trip.observed_value)}</span>{' '}
              against a threshold of{' '}
              <span className="font-semibold">{formatMetricValue(trip.metric, trip.threshold)}</span>
              {trip.scope === 'account' && trip.account_email
                ? ` on ${trip.account_email}`
                : ' across all senders'}
              {trip.sample_size != null ? ` over ${trip.sample_size} sends` : ''}.
            </p>
            {trip.reason && <p className="mt-1.5 text-xs text-red-700">{trip.reason}</p>}
          </div>
        )}
      </div>

      {(breaches.length > 0 || warnings.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {breaches.length > 0 && (
            <MetricList title="Over threshold" tone="breach" metrics={breaches} />
          )}
          {warnings.length > 0 && (
            <MetricList title="Approaching threshold" tone="warn" metrics={warnings} />
          )}
        </div>
      )}

      <Thresholds thresholds={data?.thresholds} />

      <MetricSection
        title="All senders"
        description="The global numbers the rail actually pauses on."
        metrics={data?.global_metrics || []}
      />
      <MetricSection
        title="Per sending account"
        description="One bad mailbox can trip the rail on its own, before the global rate moves."
        metrics={data?.account_metrics || []}
        showAccount
      />

      <TestThresholds />
      <TripHistory />

      <ResumeDialog trip={trip} open={resuming} onClose={() => setResuming(false)} />
    </div>
  );
}

function Header({ onRefresh, refreshing }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900">
          <Stethoscope className="h-6 w-6 text-indigo-500" />
          Deliverability Health
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          The rail that stops Dialtone sending when bounces or complaints spike — what it sees now,
          what would trip it, and every time it has fired.
        </p>
      </div>
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 shadow-sm hover:bg-gray-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          Refresh
        </button>
      )}
    </div>
  );
}

function MetricList({ title, tone, metrics }) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        tone === 'breach' ? 'border-red-200 bg-red-50/60' : 'border-amber-200 bg-amber-50/60'
      )}
    >
      <h2
        className={cn(
          'flex items-center gap-1.5 text-sm font-semibold',
          tone === 'breach' ? 'text-red-900' : 'text-amber-900'
        )}
      >
        <AlertTriangle className="h-4 w-4" />
        {title}
      </h2>
      <ul className="mt-2 space-y-1.5">
        {metrics.map((m, i) => (
          <li key={`${m.metric}-${m.account_id || 'global'}-${i}`} className="text-sm text-gray-700">
            <span className="font-medium">{METRIC_LABELS[m.metric] || m.metric}</span>
            {' — '}
            {formatMetricValue(m.metric, m.observed_value)} vs{' '}
            {formatMetricValue(m.metric, tone === 'breach' ? m.threshold : m.warn_threshold)}
            {m.account_email ? ` · ${m.account_email}` : ' · all senders'}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Thresholds({ thresholds }) {
  if (!thresholds) return null;
  const rows = [
    { label: 'Bounce rate', warn: thresholds.bounce_rate_warn, trip: thresholds.bounce_rate, rate: true },
    { label: 'Complaint rate', warn: thresholds.complaint_rate_warn, trip: thresholds.complaint_rate, rate: true },
    { label: 'Hard bounces', warn: thresholds.hard_bounce_count_warn, trip: thresholds.hard_bounce_count, rate: false },
  ];
  const pct = (v) => `${(v * 100).toFixed(1)}%`;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900">Active thresholds</h2>
      <p className="mt-0.5 text-xs text-gray-500">
        Nothing is evaluated until a scope has at least {thresholds.min_sample_size} sends in the
        window — below that, rates are too noisy to act on.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead>
            <tr className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              <th scope="col" className="pb-2">Signal</th>
              <th scope="col" className="pb-2">Warn at</th>
              <th scope="col" className="pb-2">Pause at</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.label}>
                <td className="py-2 font-medium text-gray-700">{r.label}</td>
                <td className="py-2 text-amber-700">{r.rate ? pct(r.warn) : r.warn}</td>
                <td className="py-2 text-red-700">{r.rate ? pct(r.trip) : r.trip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricSection({ title, description, metrics, showAccount = false }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      <p className="mt-0.5 text-xs text-gray-500">{description}</p>
      {metrics.length === 0 ? (
        <p className="mt-3 text-sm text-gray-400">
          Nothing measured yet — not enough sends in the window to evaluate.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {metrics.map((m, i) => (
            <MetricRow key={`${m.metric}-${m.account_id || 'global'}-${i}`} metric={m} showAccount={showAccount} />
          ))}
        </ul>
      )}
    </div>
  );
}

function MetricRow({ metric: m, showAccount }) {
  const progress = thresholdProgress(m.observed_value, m.threshold);
  const barTone =
    m.status === 'breach' ? 'bg-red-500' : m.status === 'warn' ? 'bg-amber-500' : 'bg-green-500';

  return (
    <li>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            {METRIC_LABELS[m.metric] || m.metric}
          </span>
          {showAccount && m.account_email && (
            <span className="truncate text-xs text-gray-400">{m.account_email}</span>
          )}
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ring-inset',
              STATUS_TONE[m.status] || STATUS_TONE.pass
            )}
          >
            {m.status}
          </span>
        </div>
        <div className="text-xs text-gray-500">
          <span className="font-semibold text-gray-900">
            {formatMetricValue(m.metric, m.observed_value)}
          </span>
          {' of '}
          {formatMetricValue(m.metric, m.threshold)}
          {m.sample_size != null && ` · ${m.sample_size} sends`}
        </div>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div className={cn('h-full rounded-full', barTone)} style={{ width: `${progress}%` }} />
      </div>
    </li>
  );
}

// Dry-run: what would trip right now. Answers "am I about to get paused?"
// without waiting to find out the hard way.
function TestThresholds() {
  const test = useTestDangerSignals();
  const result = test.data;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Dry-run the thresholds</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Evaluates the live numbers and reports what would trip. Pauses nothing.
          </p>
        </div>
        <button
          type="button"
          disabled={test.isPending}
          onClick={() => test.mutate()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {test.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5" />}
          Run test
        </button>
      </div>

      {result && (
        <div
          className={cn(
            'mt-3 rounded-lg px-4 py-3 text-sm',
            result.would_pause ? 'bg-red-50 text-red-900' : 'bg-green-50 text-green-900'
          )}
        >
          <p className="flex items-center gap-1.5 font-semibold">
            {result.would_pause ? (
              <><AlertTriangle className="h-4 w-4" /> This would pause Dialtone now</>
            ) : (
              <><CheckCircle2 className="h-4 w-4" /> Nothing would trip</>
            )}
          </p>
          {result.would_pause_reason && <p className="mt-1 text-xs">{result.would_pause_reason}</p>}
          {(result.breaches || []).length > 0 && (
            <ul className="mt-1.5 space-y-0.5 text-xs">
              {result.breaches.map((b, i) => (
                <li key={i}>
                  {METRIC_LABELS[b.metric] || b.metric}: {formatMetricValue(b.metric, b.observed_value)}{' '}
                  over {formatMetricValue(b.metric, b.threshold)}
                  {b.account_email ? ` (${b.account_email})` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function TripHistory() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error } = useDangerEvents({ page, pageSize: 10 });
  const items = data?.items || [];
  const total = data?.total || 0;
  const pages = Math.max(1, Math.ceil(total / (data?.page_size || 10)));

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-4">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
          <History className="h-4 w-4 text-gray-400" />
          Trip history
        </h2>
        <p className="mt-0.5 text-xs text-gray-500">Every time the rail has fired, and who cleared it.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : isError ? (
        <p className="px-5 py-6 text-sm text-amber-700">
          Couldn't load trip history — {errorMessage(error, 'the endpoint did not respond')}.
        </p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="The rail has never fired"
          description="Autopilot has not had to pause itself. Trips land here with the metric that caused them."
        />
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((e) => (
            <li key={e.id} className="px-5 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
                    e.resolved_at ? STATUS_TONE.pass : STATUS_TONE.breach
                  )}
                >
                  {e.resolved_at ? 'Resolved' : 'Unresolved'}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {METRIC_LABELS[e.metric] || e.metric}{' '}
                  {formatMetricValue(e.metric, e.observed_value)} over{' '}
                  {formatMetricValue(e.metric, e.threshold)}
                </span>
                <span className="text-xs text-gray-400">
                  {e.account_email || 'all senders'} · {timeAgo(e.triggered_at)}
                </span>
              </div>
              {e.resolved_at && (
                <p className="mt-1 text-xs text-gray-500">
                  Cleared by {e.resolved_by || 'unknown'} {timeAgo(e.resolved_at)}
                  {e.resolve_note ? ` — “${e.resolve_note}”` : ''}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
          <span>Page {page} of {pages} · {total} trip{total === 1 ? '' : 's'}</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-gray-200 px-2.5 py-1 font-medium disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-gray-200 px-2.5 py-1 font-medium disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
