import { useState } from 'react';
import {
  ArrowLeft, Award, BarChart3, Beaker, CheckCircle2, ChevronRight, Crown,
  Loader2, RefreshCw, ShieldCheck, Sparkles, TrendingUp,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import EmptyState from '../components/EmptyState';
import { useAbTest, useAbTests, useDeclareWinner } from '../hooks/useAbTests';
import { cn, timeAgo } from '../lib/utils';

/**
 * A/B Test Results — the results dashboard for Dialtone's subject/body
 * experiments (Feature 3).
 *
 * Dialtone can rotate several subject/body variants through a sequence step and
 * the backend tracks per-variant open/click/reply rates plus a chi-squared
 * significance test. Until now the only surface for any of that was a toggle on
 * the compose tab — there was nowhere to actually *read the results* or act on
 * them. This is that screen: list every test, drill into per-variant rates and
 * confidence, and declare a winner when the numbers earn it.
 */

// The backend statuses ('running' | 'insufficient_data' | 'completed') plus the
// declared-winner refinement, mapped to the operator-facing vocabulary the task
// asks for: running / completed / declared.
function statusMeta(test) {
  if (test.status === 'completed') {
    if (test.winner_label) {
      return { key: 'declared', label: 'Declared', tone: 'bg-indigo-50 text-indigo-700 ring-indigo-200' };
    }
    return { key: 'completed', label: 'Completed', tone: 'bg-gray-100 text-gray-600 ring-gray-200' };
  }
  if (test.status === 'insufficient_data') {
    return { key: 'gathering', label: 'Gathering data', tone: 'bg-amber-50 text-amber-700 ring-amber-200' };
  }
  return { key: 'running', label: 'Running', tone: 'bg-green-50 text-green-700 ring-green-200' };
}

const METRIC_LABELS = { replied: 'Reply rate', opened: 'Open rate', clicked: 'Click rate' };

const pct = (v) => `${((v || 0) * 100).toFixed(1)}%`;

// Variant colour ramp (A→D). Indigo leads to match the app accent; the winner
// is drawn in the same indigo regardless of slot.
const VARIANT_COLORS = ['#6366f1', '#0ea5e9', '#f59e0b', '#10b981'];

export default function DialtoneAbTests() {
  const [selectedId, setSelectedId] = useState(null);

  if (selectedId) {
    return <TestDetail testId={selectedId} onBack={() => setSelectedId(null)} />;
  }
  return <TestList onSelect={setSelectedId} />;
}

function Header({ onRefresh, refreshing }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900">
          <Beaker className="h-6 w-6 text-indigo-500" />
          A/B Test Results
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Every subject/body experiment Dialtone is running — per-variant open, click and reply
          rates, statistical confidence, and the winner once the numbers earn it.
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

const FILTERS = [
  { key: 'all', label: 'All', status: undefined },
  { key: 'running', label: 'Running', status: 'running' },
  { key: 'gathering', label: 'Gathering data', status: 'insufficient_data' },
  { key: 'completed', label: 'Completed', status: 'completed' },
];

function TestList({ onSelect }) {
  const [filter, setFilter] = useState('all');
  const active = FILTERS.find((f) => f.key === filter) || FILTERS[0];
  const { data, isLoading, isError, refetch, isFetching } = useAbTests(active.status);
  const items = data?.items || [];

  return (
    <div className="space-y-6">
      <Header onRefresh={() => refetch()} refreshing={isFetching} />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
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
          Couldn't load A/B tests right now. The results endpoint did not respond.
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Beaker}
          title={filter === 'all' ? 'No A/B tests yet' : 'Nothing in this state'}
          description={
            filter === 'all'
              ? 'Turn on A/B testing when composing a sequence step and Dialtone will rotate the variants here, then track which one wins.'
              : 'No tests match this filter. Try another tab.'
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((t) => (
            <TestCard key={t.id} test={t} onSelect={() => onSelect(t.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TestCard({ test, onSelect }) {
  const s = statusMeta(test);
  const metricLabel = METRIC_LABELS[test.metric] || test.metric;
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="group flex w-full flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-300 hover:shadow"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">
                {test.sequence_id ? 'Sequence step' : 'Step'}{' '}
                {test.step_number != null ? `#${test.step_number}` : ''}
              </span>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
                  s.tone
                )}
              >
                {s.label}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              {test.variant_count} variants · optimising {metricLabel.toLowerCase()}
              {test.created_at ? ` · started ${timeAgo(test.created_at)}` : ''}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-indigo-400" />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          {test.winner_label ? (
            <span className="inline-flex items-center gap-1 font-medium text-indigo-700">
              <Crown className="h-3.5 w-3.5" /> Variant {test.winner_label} won
            </span>
          ) : test.leader_label ? (
            <span className="inline-flex items-center gap-1 text-gray-600">
              <TrendingUp className="h-3.5 w-3.5 text-gray-400" /> Variant {test.leader_label} leading
            </span>
          ) : (
            <span className="text-gray-400">No leader yet</span>
          )}
          {test.confidence != null && (
            <span className="text-gray-500">{pct(test.confidence)} confidence</span>
          )}
          <span className="text-gray-500">{test.total_sent} sent</span>
        </div>
      </button>
    </li>
  );
}

function TestDetail({ testId, onBack }) {
  const { data: test, isLoading, isError, refetch, isFetching } = useAbTest(testId);

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

  if (isError || !test) {
    return (
      <div className="space-y-6">
        <BackBar onBack={onBack} />
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          Couldn't load this test. It may have been removed, or the results endpoint did not respond.
        </div>
      </div>
    );
  }

  const s = statusMeta(test);
  const metricLabel = METRIC_LABELS[test.metric] || test.metric;
  const variants = test.variants || [];
  const concluded = test.status === 'completed';

  return (
    <div className="space-y-6">
      <BackBar onBack={onBack} onRefresh={() => refetch()} refreshing={isFetching} />

      {/* Verdict header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">
                Step {test.step_number != null ? `#${test.step_number}` : ''} experiment
              </h2>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                  s.tone
                )}
              >
                {s.label}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Optimising <span className="font-medium text-gray-700">{metricLabel.toLowerCase()}</span>{' '}
              across {variants.length} variants · {test.strategy === 'bandit' ? 'multi-armed bandit' : 'even split'}
              {test.created_at ? ` · started ${timeAgo(test.created_at)}` : ''}
            </p>
          </div>
          <ConfidenceBadge test={test} />
        </div>

        <SampleProgress test={test} />

        {test.winner_label && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
            <Award className="h-4 w-4 text-indigo-600" />
            <span>
              <span className="font-semibold">Variant {test.winner_label}</span> was declared the winner
              {test.declared_at ? ` ${timeAgo(test.declared_at)}` : ''}.
            </span>
          </div>
        )}
      </div>

      {/* Visual comparison */}
      <VariantChart variants={variants} metric={test.metric} winnerLabel={test.winner_label} />

      {/* Per-variant detail + declare winner */}
      <VariantTable test={test} concluded={concluded} />
    </div>
  );
}

function BackBar({ onBack, onRefresh, refreshing }) {
  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All tests
      </button>
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

// The statistical-confidence indicator, driven by the backend chi-squared test.
// `is_significant` is the engine's own gate; `confidence` is the probability the
// leader really beats the field; `confidence_target` is the bar it must clear.
function ConfidenceBadge({ test }) {
  const target = test.confidence_target || 0.95;
  if (test.is_significant) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-right">
        <div className="flex items-center justify-end gap-1.5 text-sm font-semibold text-green-800">
          <ShieldCheck className="h-4 w-4" />
          Statistically significant
        </div>
        <p className="mt-0.5 text-xs text-green-700">
          {test.confidence != null ? `${pct(test.confidence)} confidence` : 'chi-squared'} · target {pct(target)}
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-right">
      <div className="flex items-center justify-end gap-1.5 text-sm font-semibold text-gray-600">
        <Sparkles className="h-4 w-4 text-gray-400" />
        Not yet significant
      </div>
      <p className="mt-0.5 text-xs text-gray-500">
        {test.confidence != null ? `${pct(test.confidence)} confidence` : 'gathering data'} · needs {pct(target)}
      </p>
    </div>
  );
}

function SampleProgress({ test }) {
  const progress = Math.max(0, Math.min(1, test.sample_progress || 0));
  const full = progress >= 1;
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Sample size · smallest active variant vs. minimum of {test.min_sample}</span>
        <span className={cn('font-medium', full ? 'text-green-700' : 'text-gray-600')}>
          {Math.round(progress * 100)}%
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn('h-full rounded-full', full ? 'bg-green-500' : 'bg-indigo-500')}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}

// Grouped bar chart comparing each variant across all three engagement rates,
// so a variant that wins on opens but loses on replies is obvious at a glance.
function VariantChart({ variants, metric, winnerLabel }) {
  const data = variants.map((v) => ({
    label: `Variant ${v.label}`,
    plainLabel: v.label,
    open: Number(((v.open_rate || 0) * 100).toFixed(1)),
    click: Number(((v.click_rate || 0) * 100).toFixed(1)),
    reply: Number(((v.reply_rate || 0) * 100).toFixed(1)),
  }));

  const series = [
    { key: 'open', name: 'Open rate', color: '#0ea5e9' },
    { key: 'click', name: 'Click rate', color: '#f59e0b' },
    { key: 'reply', name: 'Reply rate', color: '#6366f1' },
  ];
  const primaryKey = metric === 'opened' ? 'open' : metric === 'clicked' ? 'click' : 'reply';

  const hasData = data.length > 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
        <BarChart3 className="h-4 w-4 text-gray-400" />
        Variant comparison
      </h2>
      <p className="mt-0.5 text-xs text-gray-500">
        Engagement rate by variant. The winning metric for this test is{' '}
        <span className="font-medium text-gray-700">{METRIC_LABELS[metric]?.toLowerCase() || metric}</span>.
      </p>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-4">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span
              className={cn('inline-block h-2.5 w-2.5 rounded-sm', s.key === primaryKey && 'ring-2 ring-offset-1 ring-gray-300')}
              style={{ backgroundColor: s.color }}
            />
            {s.name}
            {s.key === primaryKey && <span className="text-gray-400">(primary)</span>}
          </span>
        ))}
      </div>

      {hasData ? (
        <div className="mt-3 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 16, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
              <YAxis
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                unit="%"
                width={44}
              />
              <Tooltip
                formatter={(value, name) => [`${value}%`, name]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                cursor={{ fill: 'rgba(99,102,241,0.06)' }}
              />
              {series.map((s) => (
                <Bar key={s.key} dataKey={s.key} name={s.name} radius={[3, 3, 0, 0]} maxBarSize={38}>
                  {data.map((d) => (
                    <Cell
                      key={`${s.key}-${d.plainLabel}`}
                      fill={s.color}
                      fillOpacity={winnerLabel && d.plainLabel === winnerLabel ? 1 : s.key === primaryKey ? 0.95 : 0.55}
                    />
                  ))}
                  {s.key === primaryKey && (
                    <LabelList dataKey={s.key} position="top" formatter={(v) => `${v}%`} style={{ fontSize: 11, fill: '#374151' }} />
                  )}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-4 text-sm text-gray-400">No variants to compare yet.</p>
      )}
    </div>
  );
}

function VariantTable({ test, concluded }) {
  const variants = test.variants || [];
  const declare = useDeclareWinner(test.id);
  const primaryRate =
    test.metric === 'opened' ? 'open_rate' : test.metric === 'clicked' ? 'click_rate' : 'reply_rate';
  // Highest primary-metric rate among active variants — the row we nudge the
  // operator toward when nothing has been declared yet.
  const leaderRate = variants
    .filter((v) => v.is_active)
    .reduce((max, v) => Math.max(max, v[primaryRate] || 0), -1);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-gray-900">Per-variant results</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Sends, engagement and rates for each variant.
          {!concluded && ' Declare a winner to stop the test and lock in one variant.'}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead>
            <tr className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              <th scope="col" className="px-5 py-2">Variant</th>
              <th scope="col" className="px-3 py-2">Sent</th>
              <th scope="col" className="px-3 py-2">Open rate</th>
              <th scope="col" className="px-3 py-2">Click rate</th>
              <th scope="col" className="px-3 py-2">Reply rate</th>
              <th scope="col" className="px-5 py-2 text-right">{concluded ? '' : 'Action'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {variants.map((v) => {
              const isWinner = test.winner_label && v.label === test.winner_label;
              const isLeader = !concluded && v.is_active && (v[primaryRate] || 0) === leaderRate && leaderRate > 0;
              return (
                <tr key={v.variant_id} className={cn(isWinner && 'bg-indigo-50/50')}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">Variant {v.label}</span>
                      {v.is_control && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">Control</span>
                      )}
                      {!v.is_active && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">Paused</span>
                      )}
                      {isWinner && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
                          <Crown className="h-3 w-3" /> Winner
                        </span>
                      )}
                      {isLeader && !isWinner && (
                        <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700">Leading</span>
                      )}
                    </div>
                    {v.subject_template && (
                      <p className="mt-0.5 max-w-xs truncate text-xs text-gray-400" title={v.subject_template}>
                        “{v.subject_template}”
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-gray-600">{v.sent}</td>
                  <RateCell value={v.open_rate} count={v.opened} highlight={test.metric === 'opened'} />
                  <RateCell value={v.click_rate} count={v.clicked} highlight={test.metric === 'clicked'} />
                  <RateCell value={v.reply_rate} count={v.replied} highlight={test.metric === 'replied'} />
                  <td className="px-5 py-3 text-right">
                    {concluded ? (
                      isWinner ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Selected
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )
                    ) : (
                      <button
                        type="button"
                        disabled={declare.isPending}
                        onClick={() => declare.mutate({ variantId: v.variant_id })}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-medium text-indigo-700 shadow-sm hover:bg-indigo-50 disabled:opacity-50"
                      >
                        {declare.isPending && declare.variables?.variantId === v.variant_id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Crown className="h-3.5 w-3.5" />
                        )}
                        Declare winner
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!concluded && (
        <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-400">
          The agent auto-declares a winner once a variant clears {pct(test.confidence_target || 0.95)} confidence.
          Declaring manually is an operator override that concludes the test immediately.
        </p>
      )}
    </div>
  );
}

function RateCell({ value, count, highlight }) {
  return (
    <td className={cn('px-3 py-3', highlight ? 'font-semibold text-gray-900' : 'text-gray-600')}>
      {pct(value)}
      {count != null && <span className="ml-1 text-xs font-normal text-gray-400">({count})</span>}
    </td>
  );
}
