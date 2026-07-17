import {
  ArrowDownRight, ArrowRight, ArrowUpRight, Clock, Loader2, Power,
  RefreshCw, Sparkles, TrendingUp, Users,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import {
  useSendTimingContacts, useSendTimingExperiment, useSendTimingHeatmap,
  useSendTimingStatus,
} from '../hooks/useDialtone';
import {
  DAY_NAMES, DAY_NAMES_FULL, activeHourRange, dowRangeLabel, heatIntensity,
  hourLabel, indexCells, ptsLabel, pct, splitArms, windowLabel,
} from '../lib/sendTiming';
import { cn, timeAgo } from '../lib/utils';

/**
 * Send-Time Optimization Results (Feature 6).
 *
 * The optimizer holds each cold-email step until the recipient's best local
 * moment and splits enrollments into an `optimized` and a naive `control` arm so
 * the lift is measurable. Analytics already had a raw volume heatmap; nothing
 * said whether the optimizer was actually beating random sends. This page is
 * that scoreboard: the experiment result and its statistical confidence, when
 * emails land best, the windows the optimizer has learned per contact, and
 * whether the optimizer is even on.
 */
export default function DialtoneSendTiming() {
  const status = useSendTimingStatus();
  const experiment = useSendTimingExperiment();
  const heatmap = useSendTimingHeatmap();
  const contacts = useSendTimingContacts(20);

  const refetchAll = () => {
    status.refetch();
    experiment.refetch();
    heatmap.refetch();
    contacts.refetch();
  };
  const refreshing =
    status.isFetching || experiment.isFetching || heatmap.isFetching || contacts.isFetching;

  return (
    <div className="space-y-6">
      <Header onRefresh={refetchAll} refreshing={refreshing} />

      <OptimizerStatus status={status.data} loading={status.isLoading} />

      <ExperimentResults data={experiment.data} loading={experiment.isLoading} />

      <Heatmap data={heatmap.data} loading={heatmap.isLoading} />

      <ContactWindows data={contacts.data} loading={contacts.isLoading} />
    </div>
  );
}

function Header({ onRefresh, refreshing }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900">
          <Clock className="h-6 w-6 text-indigo-500" />
          Send-Time Optimization
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Whether holding each email for the recipient's best local moment beats sending on the
          naive schedule — the measured lift, when opens actually happen, and the windows the
          optimizer has learned.
        </p>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 shadow-sm hover:bg-gray-50"
      >
        <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
        Refresh
      </button>
    </div>
  );
}

// ── Overall optimizer status (Requirement 5) ─────────────────────────────────
function OptimizerStatus({ status, loading }) {
  if (loading) return <CardSkeleton lines={2} />;
  if (!status) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
        Couldn't read the optimizer status — it may or may not be running. The results below still
        reflect whatever data has landed.
      </div>
    );
  }

  const on = status.enabled;
  const learned = status.profiles_with_signal || 0;
  const total = status.profiles_total || 0;

  return (
    <div
      className={cn(
        'rounded-xl border-2 bg-white p-5 shadow-sm',
        on ? 'border-gray-200' : 'border-gray-300'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Power className={cn('mt-0.5 h-6 w-6', on ? 'text-green-600' : 'text-gray-400')} />
          <div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
                  on
                    ? 'bg-green-50 text-green-700 ring-green-600/20'
                    : 'bg-gray-100 text-gray-600 ring-gray-500/20'
                )}
              >
                {on ? 'Optimizer on' : 'Optimizer off'}
              </span>
              <span className="text-sm font-medium text-gray-900">
                {on
                  ? `Splitting ${Math.round((status.optimized_fraction ?? 0.5) * 100)}% of enrollments into the optimized arm`
                  : 'Every enrollment uses naive next-window timing'}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              A contact's personal pattern is trusted after {status.min_opens} opens; below that the
              optimizer blends to the best-practice default window ({dowRangeLabel(status.default_dows)},{' '}
              {hourLabel(status.default_hour_start)}–{hourLabel(status.default_hour_end)}). Sends stay
              inside the {hourLabel(status.business_hour_start)}–{hourLabel(status.business_hour_end)}{' '}
              business window{status.weekdays_only ? ', weekdays only' : ''}.
            </p>
            {status.last_computed && (
              <p className="mt-0.5 text-xs text-gray-400">
                Profiles last recomputed {timeAgo(status.last_computed)}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Contacts profiled" value={total} icon={Users} />
        <Stat
          label="Personal pattern"
          value={learned}
          hint={`≥ ${status.min_opens} opens`}
          icon={Sparkles}
        />
        <Stat label="With any opens" value={status.profiles_with_opens || 0} />
        <Stat label="Timezone resolved" value={status.contacts_with_timezone || 0} />
      </div>
    </div>
  );
}

function Stat({ label, value, hint, icon: Icon }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
        {Icon && <Icon className="h-3.5 w-3.5 text-gray-400" />}
        {label}
      </div>
      <div className="mt-0.5 text-xl font-semibold tabular-nums text-gray-900">{value}</div>
      {hint && <div className="text-[11px] text-gray-400">{hint}</div>}
    </div>
  );
}

// ── Experiment results + statistical confidence (Requirements 1 & 2) ─────────
function ExperimentResults({ data, loading }) {
  if (loading) return <CardSkeleton lines={3} />;

  const { optimized, control } = splitArms(data);
  const hasArms = optimized && control;
  const enoughData = hasArms && optimized.sent > 0 && control.sent > 0;

  return (
    <Section
      title="Optimized vs. control"
      description="Enrollments are split into an optimized arm (held for the best moment) and a control arm (naive timing). The lift is the gap between them."
    >
      {!hasArms ? (
        <EmptyState
          icon={TrendingUp}
          title="No experiment data yet"
          description={
            data?.note ||
            'Once both arms have sends, the optimized-vs-control lift and its confidence show here.'
          }
        />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <ArmCard arm={optimized} label="Optimized" accent />
            <ArmCard arm={control} label="Control" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <LiftRow
              metric="Open rate"
              optimized={optimized.open_rate}
              control={control.open_rate}
              lift={data.open_rate_lift}
              confidence={data.open_rate_confidence}
              target={data.confidence_target}
              enoughData={enoughData}
            />
            <LiftRow
              metric="Reply rate"
              optimized={optimized.reply_rate}
              control={control.reply_rate}
              lift={data.reply_rate_lift}
              confidence={data.reply_rate_confidence}
              target={data.confidence_target}
              enoughData={enoughData}
              primary
            />
          </div>

          <SignificanceBanner data={data} enoughData={enoughData} />
        </div>
      )}
    </Section>
  );
}

function ArmCard({ arm, label, accent }) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        accent ? 'border-indigo-200 bg-indigo-50/50' : 'border-gray-200 bg-white'
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
            accent ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
          )}
        >
          {label}
        </span>
        <span className="text-xs text-gray-400">
          {arm.sent} sent · {arm.enrollments} enrolled
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <RatePill label="Open rate" value={arm.open_rate} count={arm.opens} accent={accent} />
        <RatePill label="Reply rate" value={arm.reply_rate} count={arm.replies} accent={accent} />
      </div>
    </div>
  );
}

function RatePill({ label, value, count, accent }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</div>
      <div
        className={cn(
          'text-2xl font-bold tabular-nums',
          accent ? 'text-indigo-700' : 'text-gray-900'
        )}
      >
        {pct(value)}
      </div>
      <div className="text-[11px] text-gray-400">{count} events</div>
    </div>
  );
}

function LiftRow({ metric, optimized, control, lift, confidence, target, enoughData, primary }) {
  const positive = (lift || 0) > 0;
  const negative = (lift || 0) < 0;
  const Arrow = positive ? ArrowUpRight : negative ? ArrowDownRight : ArrowRight;
  const tone = positive ? 'text-green-600' : negative ? 'text-red-600' : 'text-gray-500';

  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        primary ? 'border-gray-200 bg-gray-50/60' : 'border-gray-200 bg-white'
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900">{metric}</span>
        <span className={cn('inline-flex items-center gap-1 text-sm font-semibold', tone)}>
          <Arrow className="h-4 w-4" />
          {enoughData ? ptsLabel(lift) : '—'}
        </span>
      </div>
      <div className="mt-1 text-xs text-gray-500">
        Optimized <span className="font-medium text-gray-700">{pct(optimized)}</span> vs. control{' '}
        <span className="font-medium text-gray-700">{pct(control)}</span>
      </div>
      {enoughData && confidence != null && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-[11px] text-gray-500">
            <span>Confidence</span>
            <span className="tabular-nums">
              {pct(confidence)} · target {pct(target || 0.95)}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className={cn(
                'h-full rounded-full',
                confidence >= (target || 0.95) ? 'bg-green-500' : 'bg-indigo-400'
              )}
              style={{ width: `${Math.min(100, Math.max(0, (confidence || 0) * 100))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SignificanceBanner({ data, enoughData }) {
  if (!enoughData) {
    return (
      <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
        {data.note || 'Both arms need sends before the lift can be called significant.'}
      </div>
    );
  }
  const target = data.confidence_target || 0.95;
  if (data.significant) {
    return (
      <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-900">
        <p className="flex items-center gap-1.5 font-semibold">
          <TrendingUp className="h-4 w-4" />
          Optimized timing wins on replies
        </p>
        <p className="mt-0.5 text-xs text-green-800">
          The reply-rate lift of {ptsLabel(data.reply_rate_lift)} clears the {pct(target)} confidence
          bar (z-test on the two proportions). The optimizer is beating naive sends.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-semibold">Not yet conclusive</p>
      <p className="mt-0.5 text-xs text-amber-800">
        The reply-rate lift hasn't cleared {pct(target)} confidence yet — keep sending so the z-test
        has enough sample to call it.
      </p>
    </div>
  );
}

// ── Day/hour heatmap (Requirement 3) ─────────────────────────────────────────
function Heatmap({ data, loading }) {
  if (loading) return <CardSkeleton lines={4} />;

  const cells = data?.cells || [];
  const hasData = data?.has_data && cells.length > 0;
  const { map, maxRate } = indexCells(cells);
  const { start, end } = activeHourRange(cells);
  const hours = [];
  for (let h = start; h <= end; h++) hours.push(h);
  const best = data?.best_cell;

  return (
    <Section
      title="When opens actually happen"
      description="Open rate by send day and hour (reporting timezone). Darker cells opened at a higher rate — the optimizer steers sends toward them."
    >
      {!hasData ? (
        <EmptyState
          icon={Clock}
          title="No send history yet"
          description="Once emails go out, their open rates by day and hour build a heatmap here."
        />
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <table className="border-separate border-spacing-1">
              <thead>
                <tr>
                  <th className="w-10" />
                  {hours.map((h) => (
                    <th
                      key={h}
                      className="min-w-[2.1rem] pb-1 text-center text-[10px] font-medium text-gray-400"
                    >
                      {hourLabel(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAY_NAMES.map((day, dow) => (
                  <tr key={day}>
                    <td className="pr-1 text-right text-[11px] font-medium text-gray-500">{day}</td>
                    {hours.map((h) => {
                      const cell = map[`${dow}_${h}`];
                      const isBest = best && best.dow === dow && best.hour === h;
                      return (
                        <HeatCell
                          key={h}
                          cell={cell}
                          dow={dow}
                          hour={h}
                          maxRate={maxRate}
                          isBest={isBest}
                        />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm border border-gray-200 bg-gray-50" />
              No sends
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-indigo-500/30" />
              Lower opens
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-indigo-500" />
              Higher opens
            </span>
            {best && (
              <span className="ml-auto flex items-center gap-1.5 font-medium text-indigo-700">
                <Sparkles className="h-3.5 w-3.5" />
                Best: {DAY_NAMES_FULL[best.dow]} {hourLabel(best.hour)} · {pct(best.open_rate)} open (
                {best.sent} sent)
              </span>
            )}
          </div>
        </div>
      )}
    </Section>
  );
}

function HeatCell({ cell, dow, hour, maxRate, isBest }) {
  if (!cell || cell.sent === 0) {
    return (
      <td>
        <div className="h-6 w-full min-w-[2.1rem] rounded-sm border border-gray-100 bg-gray-50" />
      </td>
    );
  }
  const opacity = heatIntensity(cell.open_rate, maxRate);
  const title = `${DAY_NAMES_FULL[dow]} ${hourLabel(hour)} — ${pct(cell.open_rate)} open rate (${cell.opened}/${cell.sent})`;
  return (
    <td>
      <div
        title={title}
        className={cn(
          'flex h-6 w-full min-w-[2.1rem] items-center justify-center rounded-sm text-[9px] font-semibold',
          isBest && 'ring-2 ring-offset-1 ring-amber-400',
          opacity > 0.55 ? 'text-white' : 'text-indigo-900/70'
        )}
        style={{ backgroundColor: `rgba(99, 102, 241, ${opacity})` }}
      >
        {cell.sent >= 3 ? Math.round(cell.open_rate * 100) : ''}
      </div>
    </td>
  );
}

// ── Per-contact optimal windows (Requirement 4) ──────────────────────────────
function ContactWindows({ data, loading }) {
  if (loading) return <CardSkeleton lines={4} />;

  const contacts = data?.contacts || [];

  return (
    <Section
      title="Learned per-contact windows"
      description="The contacts the optimizer knows best (most opens), with the local window it now aims their next send at."
      right={
        data?.total ? (
          <span className="text-xs text-gray-400">
            Top {contacts.length} of {data.total} profiled
          </span>
        ) : null
      }
    >
      {contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contact profiles yet"
          description="Once contacts engage, the optimizer learns each one's best local time and lists them here."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                <th scope="col" className="pb-2">Contact</th>
                <th scope="col" className="pb-2">Best time</th>
                <th scope="col" className="pb-2">Send window</th>
                <th scope="col" className="pb-2">Signal</th>
                <th scope="col" className="pb-2 text-right">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contacts.map((c) => (
                <ContactRow key={c.contact_id} contact={c} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

function ContactRow({ contact: c }) {
  const source = c.window?.source || 'default';
  const sourceTone =
    source === 'personal'
      ? 'bg-indigo-50 text-indigo-700 ring-indigo-600/20'
      : source === 'cohort'
      ? 'bg-blue-50 text-blue-700 ring-blue-600/20'
      : 'bg-gray-100 text-gray-600 ring-gray-500/20';
  const best =
    c.best_dow != null && c.best_hour != null
      ? `${DAY_NAMES[c.best_dow]} ${hourLabel(c.best_hour)}`
      : '—';

  return (
    <tr>
      <td className="py-2.5">
        <div className="font-medium text-gray-900">{c.name || c.email || 'Unknown contact'}</div>
        {c.name && c.email && <div className="text-xs text-gray-400">{c.email}</div>}
        <div className="text-[11px] text-gray-400">
          {c.timezone || '—'} · {c.opens_total} open{c.opens_total === 1 ? '' : 's'}
        </div>
      </td>
      <td className="py-2.5 tabular-nums text-gray-700">{best}</td>
      <td className="py-2.5 text-gray-700">{windowLabel(c.window)}</td>
      <td className="py-2.5">
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ring-inset',
            sourceTone
          )}
        >
          {source}
        </span>
      </td>
      <td className="py-2.5 text-right tabular-nums text-gray-600">{pct(c.confidence)}</td>
    </tr>
  );
}

// ── Shared shells ────────────────────────────────────────────────────────────
function Section({ title, description, right, children }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {description && <p className="mt-0.5 max-w-2xl text-xs text-gray-500">{description}</p>}
        </div>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function CardSkeleton({ lines = 3 }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-gray-300">
        <Loader2 className="h-4 w-4 animate-spin" />
        <div className="h-3 w-32 rounded bg-gray-100" />
      </div>
      <div className="mt-4 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-3 rounded bg-gray-100" style={{ width: `${90 - i * 12}%` }} />
        ))}
      </div>
    </div>
  );
}
