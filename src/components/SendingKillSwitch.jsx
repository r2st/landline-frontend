import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Power, ShieldAlert, ShieldCheck, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import { useDangerSignals } from '../hooks/useDangerSignals';
import { formatMetricValue, METRIC_LABELS } from '../lib/dangerSignals';
import ResumeDialog from './ResumeDialog';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

/**
 * Dialtone kill switch (global sending pause).
 *
 * Shows whether Dialtone — the autonomous cold-email agent — is active or paused,
 * and lets an operator pause or resume ALL of its outbound email. Pausing
 * requires an explicit confirmation because it stops every active sequence
 * enrollment immediately.
 *
 * Resuming has two paths, and picking the wrong one defeats a safety rail:
 *
 *  - A *clean* manual pause resumes through `/system/sending-toggle`, which
 *    simply flips the switch.
 *  - An *auto-pause* (Dialtone halted itself on a danger signal) must resume
 *    through `/dialtone/resume`, which re-checks live metrics, refuses to
 *    resume into an active incident, and stamps the trip resolved. The toggle
 *    does none of that, so using it here would drop the operator straight back
 *    into the incident with the trip still open.
 *
 * Which path applies is decided by whether the rail reports an unresolved trip.
 *
 * `compact` renders a single-row banner (used on the Daily Activity page);
 * the default renders a full card (used on Settings → System).
 */
export default function SendingKillSwitch({ compact = false, onChange }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [resuming, setResuming] = useState(false);

  // The unresolved trip, if any, is what makes this an auto-pause rather than a
  // manual one. If the rail itself is unreachable we deliberately do NOT assume
  // "no trip" — see `railUnknown` below.
  const { data: signals, isError: signalsError } = useDangerSignals();
  const activeTrip = signals?.active_trip || null;
  const railUnknown = signalsError;

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/system/sending-status');
      setStatus(data);
      setUnavailable(false);
      onChange?.(data);
    } catch {
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, [onChange]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = useCallback(
    async (enabled) => {
      // Belt and braces: the UI never offers the plain toggle as a way out of an
      // auto-pause, but if it ever did, this refuses rather than bypassing the
      // re-check that /dialtone/resume performs.
      if (enabled && activeTrip) {
        setResuming(true);
        return;
      }
      setSaving(true);
      try {
        const { data } = await api.post('/system/sending-toggle', {
          enabled,
          reason: enabled ? 'Resumed from dashboard' : 'Halted from dashboard',
        });
        setStatus(data);
        onChange?.(data);
        setConfirming(false);
        if (enabled) {
          toast.success(
            data.enrollments_affected
              ? `Dialtone resumed — ${data.enrollments_affected} enrollment(s) reactivated`
              : 'Dialtone resumed'
          );
        } else {
          toast.success(
            data.enrollments_affected
              ? `Dialtone paused — ${data.enrollments_affected} enrollment(s) paused`
              : 'Dialtone paused'
          );
        }
      } catch {
        toast.error('Could not update Dialtone status');
      } finally {
        setSaving(false);
      }
    },
    [onChange, activeTrip]
  );

  // After an acknowledged resume the rail has flipped the switch server-side;
  // re-read it so the card stops saying "paused".
  const onResumed = useCallback(() => {
    setResuming(false);
    load();
  }, [load]);

  if (loading) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-gray-500', compact ? '' : 'rounded-xl border border-gray-200 bg-white p-6 shadow-sm')}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking sending status…
      </div>
    );
  }

  if (unavailable) {
    if (compact) return null;
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
        Sending controls are unavailable (backend not reachable).
      </div>
    );
  }

  const enabled = status?.enabled !== false;
  // An auto-pause is a different thing from a manual one and gets a different
  // way back. `railUnknown` means we couldn't ask — treated as "might be", so
  // the operator is told the check didn't run rather than shown a green light.
  const autoPaused = !enabled && Boolean(activeTrip);
  const checkUnverified = !enabled && railUnknown;

  const StatusPill = (
    <span
      role="status"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      )}
    >
      <span className={cn('h-2 w-2 rounded-full', enabled ? 'bg-green-500' : 'bg-red-500 animate-pulse')} />
      {enabled ? 'Dialtone active' : 'Dialtone paused'}
    </span>
  );

  // --- Compact banner (Daily Activity) ---
  if (compact) {
    return (
      <>
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-sm',
          enabled ? 'border-green-100 bg-green-50' : 'border-red-200 bg-red-50'
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          {enabled ? (
            <ShieldCheck className="h-5 w-5 text-green-600" />
          ) : (
            <ShieldAlert className="h-5 w-5 text-red-600" />
          )}
          {StatusPill}
          {autoPaused ? (
            <span className="truncate text-xs text-red-700">
              — auto-paused: {METRIC_LABELS[activeTrip.metric] || activeTrip.metric}{' '}
              {formatMetricValue(activeTrip.metric, activeTrip.observed_value)} over{' '}
              {formatMetricValue(activeTrip.metric, activeTrip.threshold)}
            </span>
          ) : (
            !enabled && status?.reason && <span className="truncate text-xs text-red-600">— {status.reason}</span>
          )}
        </div>
        {enabled ? (
          confirming ? (
            <ConfirmHalt saving={saving} onConfirm={() => toggle(false)} onCancel={() => setConfirming(false)} />
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
            >
              <Power className="h-3.5 w-3.5" />
              Pause Dialtone
            </button>
          )
        ) : (
          <ResumeButton
            size="sm"
            saving={saving}
            autoPaused={autoPaused}
            onResume={() => (activeTrip ? setResuming(true) : toggle(true))}
          />
        )}
      </div>
      <ResumeDialog trip={activeTrip} open={resuming} onClose={onResumed} />
      </>
    );
  }

  // --- Full card (Settings → System) ---
  return (
    <>
    <div className={cn('rounded-xl border-2 bg-white p-6 shadow-sm', enabled ? 'border-gray-200' : 'border-red-300')}>
      <div className="mb-4 flex items-center gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', enabled ? 'bg-green-100' : 'bg-red-100')}>
          {enabled ? <ShieldCheck className="h-5 w-5 text-green-600" /> : <ShieldAlert className="h-5 w-5 text-red-600" />}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Dialtone Kill Switch</h2>
          <p className="text-sm text-gray-500">Immediately pause or resume Dialtone — all autonomous outgoing email</p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
        <div className="flex flex-col gap-1">
          {StatusPill}
          {status?.updated_by && (
            <span className="text-xs text-gray-400">
              Last changed by {status.updated_by}
              {status.updated_at ? ` · ${new Date(status.updated_at).toLocaleString()}` : ''}
            </span>
          )}
          {!enabled && status?.reason && (
            <span className="text-xs text-red-600">Reason: {status.reason}</span>
          )}
        </div>

        {enabled ? (
          confirming ? (
            <ConfirmHalt saving={saving} onConfirm={() => toggle(false)} onCancel={() => setConfirming(false)} />
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
            >
              <Power className="h-4 w-4" />
              Pause Dialtone
            </button>
          )
        ) : (
          <ResumeButton
            size="md"
            saving={saving}
            autoPaused={autoPaused}
            onResume={() => (activeTrip ? setResuming(true) : toggle(true))}
          />
        )}
      </div>

      {/* Dialtone stopped itself. Say what tripped and what resuming will
          require, instead of leaving a bare "paused" and a green button. */}
      {autoPaused && (
        <div className="mt-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
            Auto-paused by a danger signal
          </p>
          <p className="mt-1 text-sm text-red-900">
            {METRIC_LABELS[activeTrip.metric] || activeTrip.metric} reached{' '}
            <span className="font-semibold">{formatMetricValue(activeTrip.metric, activeTrip.observed_value)}</span>{' '}
            against a threshold of{' '}
            <span className="font-semibold">{formatMetricValue(activeTrip.metric, activeTrip.threshold)}</span>
            {activeTrip.scope === 'account' && activeTrip.account_email
              ? ` on ${activeTrip.account_email}`
              : ' across all senders'}
            .
          </p>
          <p className="mt-1.5 text-xs text-red-700">
            Resuming needs an acknowledgement, and the rail will re-check the live numbers first.{' '}
            <Link to="/dialtone/health" className="font-medium underline hover:text-red-900">
              See the signals
            </Link>
          </p>
        </div>
      )}

      {checkUnverified && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Dialtone is paused, but the danger-signal rail could not be reached — so this card cannot
          tell you whether it paused itself or someone paused it. Resuming from here will not re-check
          bounce or complaint rates.
        </div>
      )}

      {status?.today_sent != null && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-gray-50 p-2">
            <div className="font-semibold text-gray-900">{status.today_sent}</div>
            <div className="text-gray-400">sent today</div>
          </div>
          <div className="rounded-lg bg-gray-50 p-2">
            <div className="font-semibold text-gray-900">{status.daily_limit ?? '—'}</div>
            <div className="text-gray-400">daily cap</div>
          </div>
          <div className="rounded-lg bg-gray-50 p-2">
            <div className="font-semibold text-gray-900">{status.warmup_week ? `Wk ${status.warmup_week}` : 'Full'}</div>
            <div className="text-gray-400">warm-up</div>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-700">
        When Dialtone is paused, the outreach queue, sequence steps, auto-replies, and test sends all stop immediately,
        and every active enrollment is paused. Resuming reactivates exactly those paused enrollments.
      </div>
    </div>
    <ResumeDialog trip={activeTrip} open={resuming} onClose={onResumed} />
    </>
  );
}

/**
 * The way back from a pause.
 *
 * Module-level on purpose: defined inside the parent it would be a fresh
 * component type on every render, so React would unmount and remount the button
 * whenever the danger query resolved — losing focus and dropping the click that
 * happened to land mid-swap.
 *
 * `autoPaused` picks the destination: a review dialog for a rail trip, the plain
 * toggle for a clean manual pause.
 */
function ResumeButton({ size = 'sm', saving, autoPaused, onResume }) {
  const small = size === 'sm';
  return (
    <button
      type="button"
      disabled={saving}
      onClick={onResume}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg font-semibold text-white disabled:opacity-50',
        autoPaused ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700',
        small ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm shadow-sm'
      )}
    >
      {saving ? (
        <Loader2 className={cn('animate-spin', small ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
      ) : (
        <Power className={small ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      )}
      {autoPaused ? 'Review & resume' : 'Resume Dialtone'}
    </button>
  );
}

function ConfirmHalt({ saving, onConfirm, onCancel }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-red-700">This pauses Dialtone and stops ALL outgoing emails. Sure?</span>
      <button
        type="button"
        disabled={saving}
        onClick={onConfirm}
        className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
        Confirm halt
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
      >
        Cancel
      </button>
    </div>
  );
}
