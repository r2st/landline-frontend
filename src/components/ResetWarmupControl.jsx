import { useState } from 'react';
import { Gauge, Loader2, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmDialog from './ConfirmDialog';
import { systemApi } from '../api/client';
import { cn } from '../lib/utils';

/**
 * Restart the sender warm-up ramp at today.
 *
 * Warm-up throttles a new sending domain up gradually (20 → 50 → 100/day) so
 * mailbox providers see a natural pattern instead of a cold domain suddenly
 * blasting. Resetting drops the ramp back to week 1, which *cuts today's
 * sending cap* — it is a throughput regression, chosen deliberately, usually
 * after a deliverability incident or a domain/sender change.
 *
 * So it's confirmed, and the confirm names the consequence rather than asking
 * "are you sure?". `/system/reset-warmup` had no UI at all before this.
 */
export default function ResetWarmupControl({ status, onReset }) {
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justReset, setJustReset] = useState(null);

  const reset = async () => {
    setConfirming(false);
    setSaving(true);
    try {
      const data = await systemApi.resetWarmup();
      // The ramp is at week 1 from today by definition — hold that locally so
      // the card doesn't fall back to "unknown" (or worse, "complete") while
      // the kill switch's own status is stale.
      setJustReset(data.warmup_start_date);
      toast.success(`Warm-up restarted — ramping from ${data.warmup_start_date}`);
      onReset?.(data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || 'Could not reset warm-up');
    } finally {
      setSaving(false);
    }
  };

  // Three genuinely different states, and conflating them misinforms:
  //   unknown  — status hasn't loaded (or the backend is unreachable)
  //   ramping  — week N of the ramp, cap below full
  //   complete — ramp finished, sending at full volume
  // Defaulting a missing status to "complete" would tell an operator they have
  // full throughput at the exact moment we can't confirm they have any.
  let rampLabel;
  if (justReset) {
    rampLabel = `Week 1 of the ramp — restarted ${justReset}`;
  } else if (!status) {
    rampLabel = 'Checking the ramp…';
  } else if (status.warmup_active === false || !status.warmup_week) {
    rampLabel = 'Ramp complete — sending at full volume';
  } else {
    rampLabel = `Week ${status.warmup_week} of the ramp`;
  }

  const dailyLimit = justReset ? null : status?.daily_limit;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
          <Gauge className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Sender Warm-up</h2>
          <p className="text-sm text-gray-500">
            The ramp that keeps a new sending domain out of spam filters
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gray-50 px-4 py-3">
        <div className="text-sm">
          <span className={cn('font-medium', status || justReset ? 'text-gray-900' : 'text-gray-400')}>
            {rampLabel}
          </span>
          {dailyLimit != null && (
            <span className="text-gray-500"> · {dailyLimit} emails/day cap</span>
          )}
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-700 shadow-sm hover:bg-amber-50 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          Restart warm-up
        </button>
      </div>

      <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-500">
        Restart after changing sending domain, adding a new mailbox, or recovering from a
        deliverability incident — anywhere providers should see you rebuild trust from scratch.
      </div>

      <ConfirmDialog
        open={confirming}
        variant="warning"
        title="Restart the warm-up ramp from today?"
        message={
          'This drops the ramp back to week 1, which cuts the daily sending cap to its lowest ' +
          'setting and rebuilds volume over several weeks. Outreach keeps running, just far ' +
          'slower — sequences already in flight will take longer to finish. There is no undo: ' +
          'the only way back to full volume is to wait out the ramp again.'
        }
        confirmLabel="Restart the ramp"
        onConfirm={reset}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
