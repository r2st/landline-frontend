import { useCallback, useEffect, useState } from 'react';
import { Power, ShieldAlert, ShieldCheck, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

/**
 * Global sending kill switch.
 *
 * Shows the current sending state (ACTIVE / PAUSED) and lets an operator halt or
 * resume ALL autonomous outbound email. Halting requires an explicit
 * confirmation because it pauses every active sequence enrollment immediately.
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
              ? `Sending resumed — ${data.enrollments_affected} enrollment(s) reactivated`
              : 'Sending resumed'
          );
        } else {
          toast.success(
            data.enrollments_affected
              ? `Sending halted — ${data.enrollments_affected} enrollment(s) paused`
              : 'Sending halted'
          );
        }
      } catch {
        toast.error('Could not update sending status');
      } finally {
        setSaving(false);
      }
    },
    [onChange]
  );

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

  const StatusPill = (
    <span
      role="status"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      )}
    >
      <span className={cn('h-2 w-2 rounded-full', enabled ? 'bg-green-500' : 'bg-red-500 animate-pulse')} />
      {enabled ? 'Sending ACTIVE' : 'Sending PAUSED'}
    </span>
  );

  // --- Compact banner (Daily Activity) ---
  if (compact) {
    return (
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-sm',
          enabled ? 'border-green-100 bg-green-50' : 'border-red-200 bg-red-50'
        )}
      >
        <div className="flex items-center gap-2">
          {enabled ? (
            <ShieldCheck className="h-5 w-5 text-green-600" />
          ) : (
            <ShieldAlert className="h-5 w-5 text-red-600" />
          )}
          {StatusPill}
          {!enabled && status?.reason && (
            <span className="text-xs text-red-600">— {status.reason}</span>
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
              Stop all sending
            </button>
          )
        ) : (
          <button
            type="button"
            disabled={saving}
            onClick={() => toggle(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
            Resume sending
          </button>
        )}
      </div>
    );
  }

  // --- Full card (Settings → System) ---
  return (
    <div className={cn('rounded-xl border-2 bg-white p-6 shadow-sm', enabled ? 'border-gray-200' : 'border-red-300')}>
      <div className="mb-4 flex items-center gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', enabled ? 'bg-green-100' : 'bg-red-100')}>
          {enabled ? <ShieldCheck className="h-5 w-5 text-green-600" /> : <ShieldAlert className="h-5 w-5 text-red-600" />}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Global Sending Kill Switch</h2>
          <p className="text-sm text-gray-500">Immediately halt or resume ALL autonomous outgoing email</p>
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
              Stop all sending
            </button>
          )
        ) : (
          <button
            type="button"
            disabled={saving}
            onClick={() => toggle(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
            Resume sending
          </button>
        )}
      </div>

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
        When engaged, the outreach queue, sequence steps, auto-replies, and test sends all stop immediately, and every
        active enrollment is paused. Resuming reactivates exactly those paused enrollments.
      </div>
    </div>
  );
}

function ConfirmHalt({ saving, onConfirm, onCancel }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-red-700">This stops ALL outgoing emails. Sure?</span>
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
