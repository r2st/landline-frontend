import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, Building2, CheckCircle2, Flame, Loader2, Mail, MailCheck, RefreshCw,
  Send, Sparkles, User, X,
} from 'lucide-react';
import HelpIcon from '../components/HelpIcon';
import EmptyState from '../components/EmptyState';
import {
  useDialtoneInbox, useInboxStats, useMarkReplyRead, useReclassifyReply, useReplyDetail,
  useSendSmartReply,
} from '../hooks/useReplies';
import { cn, timeAgo } from '../lib/utils';

/**
 * Dialtone Replies — the agent's intent-classified reply queue.
 *
 * Not the same thing as /inbox (Inbox.jsx), which is the generic mailbox off
 * `/emails/inbox`. This is where cold outreach turns into revenue: replies are
 * classified by intent, the hot ones are flagged, and the server pre-drafts a
 * response for anything it reads as `interested`.
 */

// The categories the classifier emits (REPLY_CATEGORIES in ai_service.py). The
// vocabulary is the server's — inventing a label here would silently drop a
// category the moment one is added.
const CATEGORIES = [
  { key: 'interested', label: 'Interested', tone: 'bg-green-50 text-green-700 ring-green-600/20' },
  { key: 'not_interested', label: 'Not interested', tone: 'bg-gray-100 text-gray-600 ring-gray-500/20' },
  { key: 'out_of_office', label: 'Out of office', tone: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
  { key: 'wrong_person', label: 'Wrong person', tone: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  { key: 'unsubscribe', label: 'Unsubscribe', tone: 'bg-red-50 text-red-700 ring-red-600/20' },
  { key: 'bounce', label: 'Bounce', tone: 'bg-orange-50 text-orange-700 ring-orange-600/20' },
  { key: 'unknown', label: 'Unknown', tone: 'bg-gray-100 text-gray-500 ring-gray-500/20' },
];

const CATEGORY_BY_KEY = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));

function CategoryPill({ category }) {
  const c = CATEGORY_BY_KEY[category];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        c?.tone || 'bg-gray-100 text-gray-500 ring-gray-500/20'
      )}
    >
      {c?.label || category || 'Unclassified'}
    </span>
  );
}

export default function DialtoneInbox() {
  const [category, setCategory] = useState('');
  const [priorityOnly, setPriorityOnly] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [openId, setOpenId] = useState(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useDialtoneInbox({
    category,
    priorityOnly,
    unreadOnly,
  });
  const { data: stats } = useInboxStats();

  const items = data?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900">
            <MailCheck className="h-6 w-6 text-indigo-500" />
            Dialtone Replies
            <HelpIcon articleId="reply-triage" />
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Every reply to the agent's cold outreach, sorted by what the sender actually meant.
            Interested ones come with a drafted response.
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

      {stats && <StatBadges stats={stats} category={category} onPick={setCategory} />}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setCategory('')}
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            category === '' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-900'
          )}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setCategory(c.key)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              category === c.key ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-900'
            )}
          >
            {c.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3 text-sm">
          <label className="inline-flex items-center gap-1.5 text-gray-600">
            <input
              type="checkbox"
              checked={priorityOnly}
              onChange={(e) => setPriorityOnly(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Hot only
          </label>
          <label className="inline-flex items-center gap-1.5 text-gray-600">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Unread only
          </label>
        </div>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : isError ? (
          // An error is not an empty inbox. Saying "nothing waiting on you" when
          // the request failed is exactly how the last contract break hid.
          <div className="px-5 py-10 text-center">
            <AlertTriangle className="mx-auto h-6 w-6 text-amber-500" />
            <p className="mt-2 text-sm font-medium text-gray-900">Couldn't load replies</p>
            <p className="mt-1 text-sm text-gray-500">
              {error?.response?.data?.detail || error?.message || 'The inbox endpoint did not respond.'}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              This is not an empty inbox — there may be replies waiting that aren't shown.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </button>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No replies here"
            description={
              category || priorityOnly || unreadOnly
                ? 'Nothing matches these filters. Try widening them.'
                : "When someone answers one of Dialtone's cold emails, it lands here classified by intent."
            }
          />
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((r) => (
              <ReplyRow key={r.id} reply={r} onOpen={() => setOpenId(r.id)} />
            ))}
          </ul>
        )}
      </div>

      {data?.total > items.length && (
        <p className="text-center text-xs text-gray-400">
          Showing {items.length} of {data.total}
        </p>
      )}

      {openId && <ReplyDrawer replyId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

// The header badges. `by_category` is the server's own count map, so a category
// added backend-side shows up here without a frontend change.
function StatBadges({ stats, category, onPick }) {
  const byCategory = stats.by_category || {};
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      <Tile label="Interested" value={byCategory.interested || 0} tone="green" active={category === 'interested'} onClick={() => onPick('interested')} />
      <Tile label="Hot" value={stats.priority || 0} tone="red" />
      <Tile label="Unread" value={stats.unread || 0} tone="indigo" />
      <Tile label="Unsubscribes" value={byCategory.unsubscribe || 0} tone="gray" active={category === 'unsubscribe'} onClick={() => onPick('unsubscribe')} />
      <Tile label="Unclassified" value={stats.unclassified || 0} tone="gray" />
      <Tile label="Total" value={stats.total || 0} tone="gray" />
    </div>
  );
}

function Tile({ label, value, tone, active, onClick }) {
  const tones = {
    green: 'text-green-700',
    red: 'text-red-700',
    indigo: 'text-indigo-700',
    gray: 'text-gray-900',
  };
  const Cmp = onClick ? 'button' : 'div';
  return (
    <Cmp
      {...(onClick ? { type: 'button', onClick } : {})}
      className={cn(
        'rounded-xl border bg-white px-3 py-2.5 text-left shadow-sm',
        active ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-gray-200',
        onClick && 'transition-colors hover:bg-gray-50'
      )}
    >
      <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</div>
      <div className={cn('mt-0.5 text-xl font-bold', tones[tone])}>{value}</div>
    </Cmp>
  );
}

function ReplyRow({ reply, onOpen }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-gray-50',
          !reply.is_read && 'bg-indigo-50/30'
        )}
      >
        <div className="mt-0.5 flex w-5 flex-shrink-0 justify-center">
          {reply.priority_flag ? (
            <Flame className="h-4 w-4 text-red-500" title="Hot lead" />
          ) : !reply.is_read ? (
            <span className="mt-1.5 h-2 w-2 rounded-full bg-indigo-500" title="Unread" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('truncate text-sm', reply.is_read ? 'text-gray-700' : 'font-semibold text-gray-900')}>
              {reply.contact_name || reply.from_email}
            </span>
            <CategoryPill category={reply.reply_classification} />
            {reply.classification_confidence != null && (
              <span className="text-[11px] text-gray-400">
                {Math.round(reply.classification_confidence * 100)}% sure
              </span>
            )}
          </div>
          {reply.company_name && (
            <p className="mt-0.5 truncate text-xs text-gray-400">{reply.company_name}</p>
          )}
          <p className="mt-0.5 truncate text-sm text-gray-500">{reply.subject || '(no subject)'}</p>
          {reply.snippet && <p className="mt-0.5 truncate text-xs text-gray-400">{reply.snippet}</p>}
        </div>
        <span className="flex-shrink-0 text-xs text-gray-400">{timeAgo(reply.received_at)}</span>
      </button>
    </li>
  );
}

function ReplyDrawer({ replyId, onClose }) {
  const { data: reply, isLoading, isError, error } = useReplyDetail(replyId);
  const reclassify = useReclassifyReply();
  const markRead = useMarkReplyRead();

  // Opening a reply is what "reading" it means. Fire once per reply, and only
  // once it's actually loaded and known-unread.
  useEffect(() => {
    if (reply && !reply.is_read) markRead.mutate(replyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reply?.id]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Reply detail"
        className="flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-white shadow-xl"
      >
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-gray-100 bg-white px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            {reply?.subject || 'Reply'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : isError ? (
          <p className="px-5 py-10 text-sm text-amber-700">
            Couldn't load this reply — {error?.response?.data?.detail || error?.message || 'no response'}.
          </p>
        ) : (
          <div className="space-y-5 px-5 py-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <CategoryPill category={reply.reply_classification} />
              {reply.priority_flag && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                  <Flame className="h-3 w-3" /> Hot
                </span>
              )}
              <span className="text-xs text-gray-400">{timeAgo(reply.received_at)}</span>
            </div>

            <div className="space-y-1 text-sm">
              <p className="flex items-center gap-1.5 text-gray-700">
                <User className="h-3.5 w-3.5 text-gray-400" />
                {reply.contact_name || '—'}
                <a href={`mailto:${reply.from_email}`} className="text-blue-600 hover:underline">
                  {reply.from_email}
                </a>
              </p>
              {reply.company_name && (
                <p className="flex items-center gap-1.5 text-gray-700">
                  <Building2 className="h-3.5 w-3.5 text-gray-400" />
                  {reply.company_id ? (
                    <Link to={`/companies/${reply.company_id}`} className="text-blue-600 hover:underline">
                      {reply.company_name}
                    </Link>
                  ) : (
                    reply.company_name
                  )}
                </p>
              )}
            </div>

            {reply.bounce && <BounceBreakdown bounce={reply.bounce} />}

            {/* The reply itself. body_text is preferred over body_html: this is a
                triage view, and rendering remote HTML here would pull tracking
                pixels and remote images on the operator's behalf. */}
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                What they wrote
              </h3>
              <pre className="mt-1.5 whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-3 font-sans text-sm text-gray-800">
                {reply.body_text || reply.snippet || '(empty)'}
              </pre>
            </div>

            <SuggestedDraft
              replyId={replyId}
              draft={reply.suggested_draft}
              classification={reply.reply_classification}
              alreadySent={Boolean(reply.reply_sent_at || reply.handled_action === 'sent')}
            />

            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Wrong call?
              </h3>
              <p className="mt-0.5 text-xs text-gray-500">
                Reclassifying re-runs the action for the new category and is recorded as a correction.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CATEGORIES.filter((c) => c.key !== reply.reply_classification).map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    disabled={reclassify.isPending}
                    onClick={() => reclassify.mutate({ replyId, category: c.key })}
                    className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Delivery-failure breakdown for a `bounce` reply. A hard bounce is a dead
// mailbox (suppress and move on); a soft bounce is transient (worth a retry) —
// so severity is colour-coded hard=red, soft=yellow. Diagnostic codes come
// straight from the DSN when the bounce sweep recorded them.
function BounceBreakdown({ bounce }) {
  const isHard = bounce.category === 'hard';
  const isSoft = bounce.category === 'soft';
  const tone = isHard
    ? { box: 'border-red-200 bg-red-50', head: 'text-red-800', chip: 'bg-red-100 text-red-800 ring-red-600/20', label: 'Hard bounce' }
    : isSoft
      ? { box: 'border-amber-200 bg-amber-50', head: 'text-amber-800', chip: 'bg-amber-100 text-amber-800 ring-amber-600/20', label: 'Soft bounce' }
      : { box: 'border-gray-200 bg-gray-50', head: 'text-gray-700', chip: 'bg-gray-100 text-gray-600 ring-gray-500/20', label: 'Bounce' };

  return (
    <div className={cn('rounded-lg border px-4 py-3', tone.box)}>
      <h3 className={cn('flex items-center gap-1.5 text-sm font-semibold', tone.head)}>
        <AlertTriangle className="h-4 w-4" />
        Delivery failed
        <span className={cn('ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', tone.chip)}>
          {tone.label}
        </span>
      </h3>
      <p className="mt-1 text-xs text-gray-600">
        {isHard
          ? 'A permanent failure — the address is dead. The contact is suppressed from further sends.'
          : isSoft
            ? 'A temporary failure — the address may recover. Repeated soft bounces eventually suppress it.'
            : 'Delivery to this address failed.'}
      </p>

      <dl className="mt-2.5 space-y-1.5 text-sm">
        {bounce.recipient && (
          <div className="flex gap-2">
            <dt className="w-28 flex-shrink-0 text-xs font-medium uppercase tracking-wide text-gray-400">Recipient</dt>
            <dd className="break-all text-gray-800">{bounce.recipient}</dd>
          </div>
        )}
        {bounce.status_code && (
          <div className="flex gap-2">
            <dt className="w-28 flex-shrink-0 text-xs font-medium uppercase tracking-wide text-gray-400">Status code</dt>
            <dd className="font-mono text-gray-800">{bounce.status_code}</dd>
          </div>
        )}
        {bounce.diagnostic && (
          <div className="flex gap-2">
            <dt className="w-28 flex-shrink-0 text-xs font-medium uppercase tracking-wide text-gray-400">Diagnostic</dt>
            <dd className="min-w-0 break-words font-mono text-xs text-gray-700">{bounce.diagnostic}</dd>
          </div>
        )}
        {bounce.bounce_count != null && bounce.bounce_count > 0 && (
          <div className="flex gap-2">
            <dt className="w-28 flex-shrink-0 text-xs font-medium uppercase tracking-wide text-gray-400">Total bounces</dt>
            <dd className="text-gray-800">{bounce.bounce_count}</dd>
          </div>
        )}
      </dl>

      {/* When the DSN carried no machine-readable code, say so rather than
          leaving a bare category with no explanation. */}
      {!bounce.status_code && !bounce.diagnostic && (
        <p className="mt-2 text-xs text-gray-400">
          No diagnostic code was recorded for this bounce — the category is inferred from the
          delivery notice.
        </p>
      )}
    </div>
  );
}

// The server drafts a reply only for `interested`, and only on demand. Be
// explicit about why there's nothing here rather than rendering a blank space.
//
// The draft is editable before it goes out: the AI's copy is a starting point,
// and "Approve & Send" dispatches whatever the operator actually approved (via
// POST /smart-reply/send), not necessarily the original text.
function SuggestedDraft({ replyId, draft, classification, alreadySent }) {
  const body = draft?.draft_reply || {};
  const [subject, setSubject] = useState(body.subject || '');
  const [text, setText] = useState(body.body || '');
  const send = useSendSmartReply();

  // Re-seed the editable fields whenever a different reply's draft loads —
  // otherwise the drawer would show the previous reply's edited text.
  useEffect(() => {
    setSubject(body.subject || '');
    setText(body.body || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replyId, body.subject, body.body]);

  if (classification !== 'interested') return null;

  if (!draft || draft.error) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
        <p className="flex items-center gap-1.5 font-medium text-gray-700">
          <Sparkles className="h-3.5 w-3.5" />
          No draft available
        </p>
        <p className="mt-1 text-xs">
          {draft?.error
            ? `Drafting failed: ${draft.error}`
            : 'The drafter did not return anything for this reply.'}
        </p>
      </div>
    );
  }

  if (alreadySent) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm">
        <p className="flex items-center gap-1.5 font-medium text-green-800">
          <CheckCircle2 className="h-4 w-4" />
          Reply sent
        </p>
        <p className="mt-1 text-xs text-green-700">
          This reply has already been approved and dispatched.
        </p>
      </div>
    );
  }

  const canSend = text.trim().length > 0 && !send.isPending;

  const handleSend = () => {
    if (!canSend) return;
    send.mutate({ replyId, subject: subject.trim(), body: text.trim() });
  };

  return (
    <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-4 py-3">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-indigo-900">
        <Sparkles className="h-4 w-4" />
        Suggested reply
      </h3>
      {draft.summary && <p className="mt-1 text-xs text-indigo-800">{draft.summary}</p>}

      {/* Editable before send — the operator owns the final copy. */}
      <label className="mt-2 block">
        <span className="text-[11px] font-medium uppercase tracking-wide text-indigo-700">Subject</span>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="(no subject)"
          className="mt-1 w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </label>
      <label className="mt-2 block">
        <span className="text-[11px] font-medium uppercase tracking-wide text-indigo-700">Message</span>
        <textarea
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Reply body"
          className="mt-1 w-full whitespace-pre-wrap rounded-lg border border-indigo-200 bg-white px-3 py-2 font-sans text-sm text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </label>

      <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-indigo-800">
        {draft.suggested_action && (
          <div>
            <dt className="inline font-medium">Suggested action: </dt>
            <dd className="inline">{draft.suggested_action.replace(/_/g, ' ')}</dd>
          </div>
        )}
        {draft.confidence != null && (
          <div>
            <dt className="inline font-medium">Confidence: </dt>
            <dd className="inline">{Math.round(draft.confidence * 100)}%</dd>
          </div>
        )}
      </dl>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[11px] text-indigo-700">
          Nothing is sent until you approve. Edit the copy above first if you like.
        </p>
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          {send.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Approve &amp; Send
        </button>
      </div>
    </div>
  );
}
