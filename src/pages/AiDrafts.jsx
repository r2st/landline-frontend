import { useState } from 'react';
import {
  AlertTriangle, Check, FileText, Loader2, PenLine, RefreshCw, Sparkles, X,
} from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import { useAiDrafts, useReviewDraft } from '../hooks/useAiDrafts';
import { cn, timeAgo } from '../lib/utils';

/**
 * AI Draft Review — the human gate on AI-composed first touches.
 *
 * The first N AI emails per sequence are parked instead of sent, and cleared
 * here. The asymmetry matters and is the whole reason this screen exists:
 *
 *   Approve → sends the AI's copy to a real prospect, now.
 *   Reject  → sends the static template the AI was trying to improve on.
 *
 * Rejecting is NOT "do nothing" — the contact is mid-sequence, so a touch goes
 * out either way. Only approve is gated behind a confirm, because only approve
 * sends words nobody has signed off on.
 */

const TABS = [
  { key: 'pending', label: 'Pending review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

export default function AiDrafts() {
  const [tab, setTab] = useState('pending');
  const [confirming, setConfirming] = useState(null);
  const { data, isLoading, isError, error, refetch, isFetching } = useAiDrafts({ status: tab });
  const review = useReviewDraft();

  const drafts = Array.isArray(data) ? data : [];
  const isPending = tab === 'pending';

  const decide = (draft, decision) =>
    decision === 'approve'
      ? setConfirming({ draft, decision })
      : review.mutate({ draftId: draft.id, decision });

  const confirm = () => {
    review.mutate({ draftId: confirming.draft.id, decision: confirming.decision });
    setConfirming(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900">
            <PenLine className="h-6 w-6 text-indigo-500" />
            AI Draft Review
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            First touches the agent wrote itself, held back for a human read. Approving sends the
            AI's copy; rejecting sends the template it was replacing.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 shadow-sm hover:bg-gray-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          Refresh
        </button>
      </div>

      <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              tab === t.key ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-900'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : isError ? (
        // A dead queue must not read as an empty one: "nothing waiting" here
        // means the agent has no unsent copy, which is the opposite of true.
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            Couldn't load the draft queue
          </h2>
          <p className="mt-1.5 text-sm text-amber-800">
            {error?.response?.data?.detail || error?.message || 'The endpoint did not respond.'}
          </p>
          <p className="mt-1 text-xs text-amber-700">
            Drafts may be waiting for review that aren't shown here.
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
      ) : drafts.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <EmptyState
            icon={Sparkles}
            title={isPending ? 'Nothing waiting on you' : `No ${tab} drafts`}
            description={
              isPending
                ? "When the agent composes a first touch itself, the first few per sequence are parked here before they go out."
                : 'Drafts you decide on show up here.'
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {drafts.map((d) => (
            <DraftCard
              key={d.id}
              draft={d}
              showActions={isPending}
              busy={review.isPending && review.variables?.draftId === d.id}
              onDecide={decide}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirming}
        variant="warning"
        title="Approve and send this AI-written email?"
        message={
          'This sends the copy above to a real prospect, as written, within minutes. ' +
          'Nobody has reviewed these words but you — the send window and the kill switch are ' +
          'the only things between this and their inbox.'
        }
        confirmLabel="Send it"
        onConfirm={confirm}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}

function DraftCard({ draft, showActions, busy, onDecide }) {
  const [showStatic, setShowStatic] = useState(false);
  const hasStatic = Boolean(draft.static_subject || draft.static_body);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
          <Sparkles className="h-3 w-3" />
          Step {draft.step_number}
        </span>
        {draft.research_used && (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
            Research-backed
          </span>
        )}
        {!draft.ai_generated && (
          // The AI didn't actually write this one — the fallback did. Approving
          // it isn't the judgement call the page is asking for.
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-inset ring-gray-500/20">
            Fell back to template
          </span>
        )}
        <span className="ml-auto text-xs text-gray-400">Queued {timeAgo(draft.created_at)}</span>
      </div>

      <p className="mt-3 text-sm font-semibold text-gray-900">{draft.subject}</p>
      <pre className="mt-1.5 whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-3 font-sans text-sm text-gray-800">
        {draft.body}
      </pre>

      {/* What gets sent instead if this is rejected — you can't judge "is the AI
          version better" without seeing what it's better than. */}
      {hasStatic && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowStatic((v) => !v)}
            aria-expanded={showStatic}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800"
          >
            <FileText className="h-3.5 w-3.5" />
            {showStatic ? 'Hide' : 'Show'} the template that goes instead
          </button>
          {showStatic && (
            <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50/70 p-3">
              {draft.static_subject && (
                <p className="text-sm font-medium text-gray-700">{draft.static_subject}</p>
              )}
              {draft.static_body && (
                <pre className="mt-1 whitespace-pre-wrap break-words font-sans text-sm text-gray-600">
                  {draft.static_body}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {draft.review_notes && (
        <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
          Note: {draft.review_notes}
        </p>
      )}

      {showActions && (
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onDecide(draft, 'approve')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Approve &amp; send
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDecide(draft, 'reject')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            Reject
          </button>
          {/* Rejecting still sends something. Saying so here stops it reading as
              a quiet "discard". */}
          <span className="text-xs text-gray-400">
            Rejecting sends the static template — the prospect hears from us either way.
          </span>
        </div>
      )}
    </div>
  );
}
