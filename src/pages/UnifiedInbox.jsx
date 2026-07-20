import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowDownLeft, ArrowUpRight, Building2, ChevronDown, Flame, Inbox as InboxIcon,
  Loader2, MailCheck, RefreshCw, Search, Send, Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import EmptyState from '../components/EmptyState';
import SafeHtml from '../components/SafeHtml';
import { useEmailInbox, useSendReply } from '../hooks/useEmailHistory';
import { useDialtoneInbox, useReplyDetail, useSendSmartReply } from '../hooks/useReplies';
import { mergeInbox, deriveMailboxes, filterInbox } from '../lib/unifiedInbox';
import { cn, timeAgo, formatDate } from '../lib/utils';

/**
 * Unified Inbox — every reply, one queue.
 *
 * The mailbox lived in two places: /inbox (Gmail/SMTP threads) and
 * /dialtone/inbox (the agent's intent-classified reply queue). An operator
 * triaging the day's replies had to check both and mentally merge them. This
 * page does the merge: both sources normalized into one list, filterable by
 * mailbox, by replied/unreplied status, and by search, with an in-thread reply
 * on each conversation.
 */

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'unreplied', label: 'Unreplied' },
  { value: 'replied', label: 'Replied' },
];

export default function UnifiedInbox() {
  const [mailbox, setMailbox] = useState('');
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [openKey, setOpenKey] = useState(null);

  const email = useEmailInbox({ page: 1, per_page: 50 });
  const dialtone = useDialtoneInbox({ pageSize: 50 });

  const threads = email.data?.threads || [];
  const replies = dialtone.data?.items || [];

  const merged = useMemo(() => mergeInbox({ threads, replies }), [threads, replies]);
  const mailboxes = useMemo(() => deriveMailboxes(merged), [merged]);
  const items = useMemo(
    () => filterInbox(merged, { mailbox, status, search }),
    [merged, mailbox, status, search]
  );

  const isLoading = email.isLoading || dialtone.isLoading;
  // A failure in *either* source is worth surfacing — a silently half-empty
  // unified inbox is exactly the kind of contract break that hides missed leads.
  const isError = email.isError || dialtone.isError;
  const isFetching = email.isFetching || dialtone.isFetching;

  const refetch = () => {
    email.refetch();
    dialtone.refetch();
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900">
            <MailCheck className="h-6 w-6 text-indigo-500" />
            Unified Inbox
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Every reply across every mailbox — Gmail, SMTP, and Dialtone's triaged queue — in one place.
          </p>
        </div>
        <button
          type="button"
          onClick={refetch}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 shadow-sm hover:bg-gray-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterButton active={mailbox === ''} onClick={() => setMailbox('')}>
            All mailboxes
          </FilterButton>
          {mailboxes.map((m) => (
            <FilterButton key={m} active={mailbox === m} onClick={() => setMailbox(m)}>
              {m}
            </FilterButton>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s.value || 'all'}
                type="button"
                onClick={() => setStatus(s.value)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  status === s.value
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search all mailboxes…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search inbox"
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </form>
        </div>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : isError ? (
          <div className="px-5 py-10 text-center">
            <AlertTriangle className="mx-auto h-6 w-6 text-amber-500" />
            <p className="mt-2 text-sm font-medium text-gray-900">Couldn't load one of your mailboxes</p>
            <p className="mt-1 text-sm text-gray-500">
              {email.error?.response?.data?.detail || email.error?.message ||
                dialtone.error?.response?.data?.detail || dialtone.error?.message ||
                'A mailbox endpoint did not respond.'}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Some replies may be missing from this view — this is not an empty inbox.
            </p>
            <button
              type="button"
              onClick={refetch}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </button>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={InboxIcon}
            title="No conversations here"
            description={
              mailbox || status || search
                ? 'Nothing matches these filters. Try widening them.'
                : 'Replies from every mailbox will land here as they arrive.'
            }
          />
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((item) => (
              <InboxRow
                key={item.key}
                item={item}
                open={openKey === item.key}
                onToggle={() => setOpenKey(openKey === item.key ? null : item.key)}
              />
            ))}
          </ul>
        )}
      </div>

      {!isLoading && !isError && items.length > 0 && (
        <p className="text-center text-xs text-gray-400">
          {items.length} conversation{items.length === 1 ? '' : 's'}
          {(mailbox || status || search) && ` (of ${merged.length})`}
        </p>
      )}
    </div>
  );
}

function FilterButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
        active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-900'
      )}
    >
      {children}
    </button>
  );
}

const MAILBOX_TONE = {
  Gmail: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  SMTP: 'bg-purple-50 text-purple-700 ring-purple-600/20',
  Dialtone: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
};

function InboxRow({ item, open, onToggle }) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          'flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-gray-50',
          item.unread && 'bg-indigo-50/30'
        )}
      >
        <div className="mt-0.5 flex w-5 flex-shrink-0 justify-center">
          {item.priority ? (
            <Flame className="h-4 w-4 text-red-500" title="Hot lead" />
          ) : item.unread ? (
            <span className="mt-1.5 h-2 w-2 rounded-full bg-indigo-500" title="Unread" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('truncate text-sm', item.unread ? 'font-semibold text-gray-900' : 'text-gray-700')}>
              {item.contactName || item.contactEmail || '(unknown sender)'}
            </span>
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
                MAILBOX_TONE[item.mailbox] || 'bg-gray-100 text-gray-600 ring-gray-500/20'
              )}
            >
              {item.mailbox}
            </span>
            {item.status === 'unreplied' && (
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                Unreplied
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-gray-500">{item.subject}</p>
          {item.snippet && <p className="mt-0.5 truncate text-xs text-gray-400">{item.snippet}</p>}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <span className="text-xs text-gray-400">{timeAgo(item.timestamp)}</span>
          <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', open && 'rotate-180')} />
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4">
          {item.source === 'email' ? (
            <EmailThreadPanel thread={item.raw} />
          ) : (
            <DialtoneReplyPanel reply={item.raw} />
          )}
        </div>
      )}
    </li>
  );
}

// ── Email thread: render the messages, then an in-thread reply composer. ──────
function EmailThreadPanel({ thread }) {
  const messages = thread.messages || [];
  const lastMessage = messages[messages.length - 1];
  const sendReply = useSendReply();
  const [body, setBody] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || !lastMessage) return;
    sendReply.mutate(
      {
        emailId: lastMessage.id,
        data: { body_html: `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`, body_text: trimmed },
      },
      {
        onSuccess: () => {
          setBody('');
          toast.success('Reply sent');
        },
        onError: (err) => toast.error(err?.response?.data?.detail || err?.message || 'Failed to send reply'),
      }
    );
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {messages.map((msg) => (
          <EmailMessage key={msg.id} message={msg} />
        ))}
        {messages.length === 0 && <p className="text-sm italic text-gray-400">No messages in this thread.</p>}
      </div>

      {thread.lead_id && (
        <Link
          to={`/companies/${thread.lead_id}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800"
        >
          <Building2 className="h-3.5 w-3.5" />
          View lead
        </Link>
      )}

      <form onSubmit={handleSend} className="border-t border-gray-200 pt-3">
        <textarea
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your reply…"
          aria-label="Reply body"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={sendReply.isPending || !body.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {sendReply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

function EmailMessage({ message }) {
  const isSent = message.direction === 'sent';
  const htmlBody = message.body_html || null;
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-3">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full',
            isSent ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
          )}
        >
          {isSent ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownLeft className="h-3.5 w-3.5" />}
        </span>
        <span className="text-xs font-medium text-gray-700">
          {isSent ? `to ${message.to_email || ''}` : `from ${message.from_email || ''}`}
        </span>
        <span className="ml-auto text-xs text-gray-400">{formatDate(message.timestamp)}</span>
      </div>
      <div className="mt-2 text-sm text-gray-700">
        {htmlBody ? (
          <SafeHtml html={htmlBody} className="prose prose-sm max-w-none" />
        ) : message.body_text ? (
          <div className="whitespace-pre-wrap">{message.body_text}</div>
        ) : message.snippet ? (
          <p className="text-gray-500">{message.snippet}</p>
        ) : (
          <p className="italic text-gray-400">No message body</p>
        )}
      </div>
    </div>
  );
}

// ── Dialtone reply: fetch the full body + suggested draft, reply via smart-reply. ─
function DialtoneReplyPanel({ reply }) {
  const { data: detail, isLoading, isError } = useReplyDetail(reply.id);
  const send = useSendSmartReply();
  const draftBody = detail?.suggested_draft?.draft_reply || {};
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  // Seed the composer with the server's suggested draft once it loads.
  useEffect(() => {
    setSubject(draftBody.subject || reply.subject || '');
    setBody(draftBody.body || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftBody.subject, draftBody.body, reply.id]);

  const alreadySent = Boolean(detail?.reply_sent_at || detail?.handled_action === 'sent');
  const canSend = body.trim().length > 0 && !send.isPending && !alreadySent;

  const handleSend = () => {
    if (!canSend) return;
    send.mutate({ replyId: reply.id, subject: subject.trim(), body: body.trim() });
  };

  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading reply…
        </div>
      ) : isError ? (
        <p className="text-sm text-amber-700">Couldn't load this reply.</p>
      ) : (
        <>
          <div className="rounded-lg border border-gray-100 bg-white p-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">What they wrote</h3>
            <pre className="mt-1.5 whitespace-pre-wrap break-words font-sans text-sm text-gray-800">
              {detail?.body_text || reply.snippet || '(empty)'}
            </pre>
          </div>

          {detail?.company_id && (
            <Link
              to={`/companies/${detail.company_id}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              <Building2 className="h-3.5 w-3.5" />
              {detail.company_name || 'View company'}
            </Link>
          )}

          {alreadySent ? (
            <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-800">
              Reply already sent.
            </p>
          ) : (
            <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-indigo-900">
                <Sparkles className="h-4 w-4" />
                Reply
              </h3>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="(no subject)"
                aria-label="Reply subject"
                className="mt-2 w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <textarea
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your reply…"
                aria-label="Reply body"
                className="mt-2 w-full whitespace-pre-wrap rounded-lg border border-indigo-200 bg-white px-3 py-2 font-sans text-sm text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!canSend}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Approve &amp; Send
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
