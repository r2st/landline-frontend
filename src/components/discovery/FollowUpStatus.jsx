import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, MessageSquareReply, Pause, Play, XCircle } from 'lucide-react';
import { useDocumentOutreach, useSetSequenceStatus } from '../../hooks/useDiscoveryDocuments';
import { cn, formatDate } from '../../lib/utils';

const STATE = {
  active: { label: 'Follow-ups scheduled', cls: 'bg-blue-50 text-blue-700', Icon: Clock },
  replied: { label: 'Replied — follow-ups stopped', cls: 'bg-green-50 text-green-700', Icon: MessageSquareReply },
  completed: { label: 'All emails sent', cls: 'bg-gray-100 text-gray-700', Icon: CheckCircle2 },
  stopped: { label: 'Stopped', cls: 'bg-red-50 text-red-700', Icon: XCircle },
};

const STOP_REASONS = {
  paused: 'paused',
  unsubscribed: 'unsubscribed',
  bounced: 'bounced',
};

function StateBadge({ contact, sequencePaused }) {
  const s = STATE[contact.state] || STATE.stopped;
  const label =
    contact.state === 'active' && sequencePaused
      ? 'On hold — sequence paused'
      : contact.state === 'stopped'
        ? `Stopped (${STOP_REASONS[contact.enrollment_status] || contact.pause_reason || contact.enrollment_status})`
        : s.label;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', s.cls)}>
      <s.Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-gray-50 px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-gray-900">{value ?? 0}</p>
    </div>
  );
}

// Per-contact follow-up tracking for a document whose emails were sent.
export default function FollowUpStatus({ docId, sendResult }) {
  const { data, isLoading, error } = useDocumentOutreach(docId);
  const setStatus = useSetSequenceStatus(docId);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
        Loading follow-up status…
      </div>
    );
  }
  if (error || !data?.sequence) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
        No follow-up status available for this document.
      </div>
    );
  }

  const { sequence, contacts, totals } = data;
  const paused = !sequence.is_active;

  return (
    <div className="space-y-4">
      {sendResult && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <p className="font-medium">
            {sendResult.enrolled_count} contact(s) enrolled. The first email goes out through your normal sending queue
            (daily cap and warm-up apply); follow-ups stop automatically when someone replies.
          </p>
          {sendResult.skipped?.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-green-800">
              {sendResult.skipped.slice(0, 10).map((s) => (
                <li key={s.contact_id}>
                  {s.email || s.contact_id}: {s.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Follow-up status</h3>
            <p className="text-xs text-gray-500">
              {sequence.name} · {sequence.total_steps} email{sequence.total_steps === 1 ? '' : 's'} per contact
              {paused && <span className="ml-1 font-medium text-amber-700">· paused</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {totals.active > 0 && (
              <button
                type="button"
                disabled={setStatus.isPending}
                onClick={() =>
                  setStatus.mutate({ sequenceId: data.sequence_id, status: paused ? 'active' : 'paused' })
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                {paused ? 'Resume follow-ups' : 'Pause follow-ups'}
              </button>
            )}
            <Link
              to="/sequences"
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              View in Sequences
            </Link>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Contacts" value={totals.enrolled} />
          <Stat label="Emails sent" value={totals.emails_sent} />
          <Stat label="Awaiting follow-up" value={totals.active} />
          <Stat label="Replied" value={totals.replied} />
          <Stat label="Finished / stopped" value={(totals.completed || 0) + (totals.stopped || 0)} />
        </div>

        {contacts.length === 0 ? (
          <p className="text-sm text-gray-500">Nobody was enrolled.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-4">Contact</th>
                  <th className="py-2 pr-4">Emails sent</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Next follow-up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contacts.map((c) => (
                  <tr key={c.enrollment_id}>
                    <td className="py-2 pr-4">
                      <p className="font-medium text-gray-900">{c.name || c.email}</p>
                      {c.name && <p className="text-xs text-gray-500">{c.email}</p>}
                    </td>
                    <td className="py-2 pr-4 text-gray-700">
                      {c.emails_sent} of {c.total_steps}
                    </td>
                    <td className="py-2 pr-4">
                      <StateBadge contact={c} sequencePaused={paused} />
                    </td>
                    <td className="py-2 text-gray-700">
                      {c.state === 'replied'
                        ? `Replied ${formatDate(c.replied_at)}`
                        : c.next_send_at
                          ? formatDate(c.next_send_at)
                          : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
