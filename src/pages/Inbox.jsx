import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail, MailOpen, Inbox as InboxIcon, Send, ArrowUpRight, ArrowDownLeft,
  ChevronDown, ChevronRight, CheckCircle2, MousePointerClick,
  Reply, MessageSquare, Search, Filter, RefreshCw, Building2,
  ArrowRight, Clock,
} from 'lucide-react';
import DOMPurify from 'dompurify';
import toast from 'react-hot-toast';
import EmptyState from '../components/EmptyState';
import { useEmailInbox, useSendReply, useTriggerSync } from '../hooks/useEmailHistory';
import { formatDate, timeAgo, cn } from '../lib/utils';

const STATUS_CONFIG = {
  sent:      { icon: CheckCircle2,      colors: 'bg-blue-50 text-blue-700' },
  delivered: { icon: CheckCircle2,      colors: 'bg-blue-50 text-blue-700' },
  opened:   { icon: MailOpen,           colors: 'bg-green-50 text-green-700' },
  clicked:  { icon: MousePointerClick,  colors: 'bg-purple-50 text-purple-700' },
  replied:  { icon: Reply,              colors: 'bg-teal-50 text-teal-700' },
  received: { icon: Mail,               colors: 'bg-amber-50 text-amber-700' },
};

const FILTER_OPTIONS = [
  { value: 'all',         label: 'All',          icon: InboxIcon },
  { value: 'received',    label: 'Received',     icon: ArrowDownLeft },
  { value: 'sent',        label: 'Sent',         icon: ArrowUpRight },
  { value: 'opened',      label: 'Opened',       icon: MailOpen },
  { value: 'needs_reply', label: 'Needs Reply',  icon: Clock },
];

function StatusBadge({ status }) {
  if (!status) return null;
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', cfg.colors)}>
      <Icon className="h-3 w-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function MessageItem({ message }) {
  const [expanded, setExpanded] = useState(false);
  const isSent = message.direction === 'sent';
  const htmlBody = message.body_html ? DOMPurify.sanitize(message.body_html) : null;

  return (
    <div className="border-t border-gray-100 py-3 first:border-t-0">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-3 text-left"
      >
        <div className={cn(
          'mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full',
          isSent ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
        )}>
          {isSent ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-900">
              {message.contact_name || message.from_email}
            </span>
            <span className="text-xs text-gray-400">
              {isSent ? `to ${message.to_email}` : `from ${message.from_email}`}
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-400">{timeAgo(message.timestamp)}</span>
            {isSent && message.status && <StatusBadge status={message.status} />}
            {!message.is_read && !isSent && (
              <span className="inline-block h-2 w-2 rounded-full bg-blue-500" title="Unread" />
            )}
          </div>
          {!expanded && message.snippet && (
            <p className="mt-1 line-clamp-2 text-sm text-gray-500">{message.snippet}</p>
          )}
        </div>

        <ChevronDown className={cn(
          'mt-1 h-4 w-4 flex-shrink-0 text-gray-400 transition-transform',
          expanded && 'rotate-180'
        )} />
      </button>

      {expanded && (
        <div className="ml-10 mt-2">
          {htmlBody ? (
            <div
              className="prose prose-sm max-w-none rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700"
              dangerouslySetInnerHTML={{ __html: htmlBody }}
            />
          ) : message.body_text ? (
            <div className="whitespace-pre-wrap rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
              {message.body_text}
            </div>
          ) : (
            <p className="text-sm italic text-gray-400">No message body</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-400">
            <span>{formatDate(message.timestamp)}</span>
            {message.opened_at && <span>Opened {timeAgo(message.opened_at)}</span>}
            {message.clicked_at && <span>Clicked {timeAgo(message.clicked_at)}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function ReplyCompose({ threadMessages }) {
  const [body, setBody] = useState('');
  const sendReply = useSendReply();
  const lastMessage = threadMessages[threadMessages.length - 1];
  if (!lastMessage) return null;

  const handleSend = (e) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;

    sendReply.mutate(
      {
        emailId: lastMessage.id,
        data: {
          body_html: `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`,
          body_text: trimmed,
        },
      },
      {
        onSuccess: () => {
          setBody('');
          toast.success('Reply sent');
        },
        onError: (err) => toast.error(err?.message || 'Failed to send reply'),
      }
    );
  };

  return (
    <form onSubmit={handleSend} className="mt-3 border-t border-gray-100 pt-3">
      <div className="flex items-center gap-2 mb-2">
        <Reply className="h-4 w-4 text-gray-400" />
        <span className="text-xs font-medium text-gray-500">Reply</span>
      </div>
      <textarea
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your reply..."
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={sendReply.isPending || !body.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-600 disabled:opacity-50"
        >
          {sendReply.isPending ? (
            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Send
        </button>
      </div>
    </form>
  );
}

function ThreadCard({ thread }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const messageCount = thread.messages?.length || 0;
  const subject = thread.subject || '(No subject)';

  const lastMsg = thread.messages?.[thread.messages.length - 1];
  const lastDirection = lastMsg?.direction;
  const needsReply = lastDirection === 'received';

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left"
      >
        {expanded
          ? <ChevronDown className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
          : <ChevronRight className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {thread.has_unread && (
              <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" title="Unread" />
            )}
            <span className={cn(
              'truncate text-sm',
              thread.has_unread ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'
            )}>
              {subject}
            </span>
          </div>

          {thread.lead_name && (
            <div className="mt-0.5 flex items-center gap-1.5">
              <Building2 className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-500">{thread.lead_name}</span>
            </div>
          )}

          {!expanded && lastMsg?.snippet && (
            <p className="mt-1 line-clamp-1 text-sm text-gray-500">{lastMsg.snippet}</p>
          )}
        </div>

        <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
          <span className="text-xs text-gray-400">{timeAgo(thread.last_activity)}</span>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <MessageSquare className="h-3 w-3" />
              {messageCount}
            </span>
            {needsReply && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                <Clock className="h-3 w-3" />
                Reply
              </span>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4">
          {thread.messages.map((msg) => (
            <MessageItem key={msg.id} message={msg} />
          ))}

          <ReplyCompose threadMessages={thread.messages} />

          {thread.lead_id && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => navigate(`/companies/${thread.lead_id}`)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                <Building2 className="h-3.5 w-3.5" />
                View lead details
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Inbox() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);

  const params = useMemo(() => {
    const p = { page, per_page: 20, filter };
    if (search) p.search = search;
    return p;
  }, [page, filter, search]);

  const { data, isLoading, error, refetch } = useEmailInbox(params);
  const triggerSync = useTriggerSync();

  const handleSync = useCallback(() => {
    triggerSync.mutate(undefined, {
      onSuccess: (result) => {
        toast.success(`Synced ${result.synced || 0} new emails`);
        refetch();
      },
      onError: () => toast.error('Sync failed'),
    });
  }, [triggerSync, refetch]);

  const handleSearch = useCallback((e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  }, [searchInput]);

  const handleFilterChange = useCallback((val) => {
    setFilter(val);
    setPage(1);
  }, []);

  const threads = data?.threads || [];
  const totalThreads = data?.total || 0;
  const totalPages = Math.ceil(totalThreads / 20);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
          <p className="mt-1 text-sm text-gray-500">
            All email conversations across your leads
          </p>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={triggerSync.isPending}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', triggerSync.isPending && 'animate-spin')} />
          {triggerSync.isPending ? 'Syncing...' : 'Sync emails'}
        </button>
      </div>

      {/* Filters row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-1">
          {FILTER_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleFilterChange(opt.value)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  filter === opt.value
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search emails..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </form>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center">
          <p className="text-sm text-red-700">
            Failed to load inbox{error.message ? `: ${error.message}` : '.'}
          </p>
        </div>
      ) : threads.length === 0 ? (
        <EmptyState
          icon={InboxIcon}
          title="No email threads"
          description={
            search
              ? 'No threads match your search. Try different keywords.'
              : filter !== 'all'
                ? 'No threads match this filter.'
                : 'Email conversations will appear here once synced from Gmail.'
          }
        />
      ) : (
        <>
          <div className="space-y-2">
            {threads.map((thread) => (
              <ThreadCard key={thread.gmail_thread_id} thread={thread} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} ({totalThreads} threads)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
