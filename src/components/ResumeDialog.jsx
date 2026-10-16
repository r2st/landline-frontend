import { useState } from 'react';
import { AlertTriangle, Loader2, ShieldAlert, X } from 'lucide-react';
import { errorMessage, isRefusal, useResumeSending } from '../hooks/useDangerSignals';
import { formatMetricValue, METRIC_LABELS } from '../lib/dangerSignals';
import { cn } from '../lib/utils';

/**
 * Acknowledged resume after an auto-pause.
 *
 * Dialtone pauses itself when bounce/complaint rates breach their thresholds.
 * Getting back requires acknowledging the specific trip and saying why it's
 * safe — the note is audited. The backend re-checks live metrics and refuses
 * with a 409 if the danger is still active; that refusal is shown as the
 * considered answer it is, and overriding it is a second, explicit decision.
 *
 * `/system/sending-toggle` must never be used for this: it flips the switch
 * with no re-check and leaves the trip unresolved.
 */
export default function ResumeDialog({ trip, open, onClose }) {
  const [note, setNote] = useState('');
  const [force, setForce] = useState(false);
  const resume = useResumeSending();

  if (!open || !trip) return null;

  const refused = resume.isError && isRefusal(resume.error);
  const failed = resume.isError && !isRefusal(resume.error);
  const noteInvalid = note.trim().length === 0;

  const submit = (e) => {
    e.preventDefault();
    if (noteInvalid) return;
    resume.mutate(
      { acknowledgeDangerSignalId: trip.id, note: note.trim(), force },
      {
        onSuccess: () => {
          setNote('');
          setForce(false);
          onClose();
        },
      }
    );
  };

  const close = () => {
    resume.reset();
    setNote('');
    setForce(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="resume-title" className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-600" />
            <h2 id="resume-title" className="text-base font-semibold text-gray-900">
              Resume after auto-pause
            </h2>
          </div>
          <button type="button" onClick={close} aria-label="Close" className="rounded text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 px-5 py-4">
          {/* What tripped — the operator can't judge "is it safe" without it. */}
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
              Autopilot paused itself
            </p>
            <p className="mt-1 text-sm text-red-900">
              <span className="font-semibold">{METRIC_LABELS[trip.metric] || trip.metric}</span>
              {' reached '}
              <span className="font-semibold">{formatMetricValue(trip.metric, trip.observed_value)}</span>
              {' against a threshold of '}
              <span className="font-semibold">{formatMetricValue(trip.metric, trip.threshold)}</span>
              {trip.scope === 'account' && trip.account_email ? ` on ${trip.account_email}` : ' across all senders'}
              {trip.sample_size != null ? ` (over ${trip.sample_size} sends)` : ''}.
            </p>
            {trip.reason && <p className="mt-1.5 text-xs text-red-700">{trip.reason}</p>}
            {trip.triggered_at && (
              <p className="mt-1.5 text-xs text-red-600">
                Tripped {new Date(trip.triggered_at).toLocaleString()}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="resume-note" className="block text-sm font-medium text-gray-700">
              Why is it safe to resume?
            </label>
            <p className="mt-0.5 text-xs text-gray-500">
              Recorded against this trip. Say what you fixed, not that you checked.
            </p>
            <textarea
              id="resume-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Purged the bad import that caused the bounce spike; the list is re-verified."
              className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* The backend's 409 — a refusal, shown as a finding rather than a
              generic error, with the override as a separate explicit choice. */}
          {refused && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="flex items-start gap-1.5 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                <span>
                  <span className="font-semibold">Refused — the danger is still live.</span>{' '}
                  {errorMessage(resume.error, 'The rail declined to resume.')}
                </span>
              </p>
              <label className="mt-3 flex items-start gap-2 text-xs text-amber-900">
                <input
                  type="checkbox"
                  checked={force}
                  onChange={(e) => setForce(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-amber-300 text-red-600 focus:ring-red-500"
                />
                <span>
                  Resume anyway, over the live signal. This keeps sending into whatever is
                  bouncing or complaining, and the override is logged against your name.
                </span>
              </label>
            </div>
          )}

          {failed && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage(resume.error, 'Could not resume.')}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={close}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Stay paused
            </button>
            <button
              type="submit"
              disabled={resume.isPending || noteInvalid || (refused && !force)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50',
                refused && force ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
              )}
            >
              {resume.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {refused && force ? 'Force resume' : 'Acknowledge & resume'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
