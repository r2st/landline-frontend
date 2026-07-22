import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail, MailOpen, Inbox as InboxIcon, Send, ArrowUpRight, ArrowDownLeft,
  ChevronDown, ChevronRight, CheckCircle2, MousePointerClick,
  Reply, MessageSquare, Search, RefreshCw, Building2,
  ArrowRight, Clock, Archive, ArchiveRestore, Flame, Calendar,
  Sparkles, FileText, PenLine, Brain, TrendingUp, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import EmptyState from '../components/EmptyState';
import SafeHtml from '../components/SafeHtml';
import {
  useEmailInbox, useSendReply, useTriggerSync,
  useMarkThreadRead, useArchiveThread, useBulkThreadAction, useThreadIntelligence,
} from '../hooks/useEmailHistory';
import { useEmailTemplates, useEmailSignatures } from '../hooks/useEmailTemplates';
import { useConnectedAccounts } from '../hooks/useConnectedAccounts';
import { accountOptionLabel } from '../lib/inboxAccounts';
import { formatDate, timeAgo, cn } from '../lib/utils';

const STATUS_CONFIG = {
  sent:      { icon: CheckCircle2,      colors: 'bg-blue-50 text-blue-700' },
  delivered: { icon: CheckCircle2,      colors: 'bg-blue-50 text-blue-700' },
  opened:   { icon: MailOpen,           colors: 'bg-green-50 text-green-700' },
  clicked:  { icon: MousePointerClick,  colors: 'bg-purple-50 text-purple-700' },
  replied:  { icon: Reply,              colors: 'bg-teal-50 text-teal-700' },
  received: { icon: Mail,               colors: 'bg-amber-50 text-amber-700' },
};

// reply_classification → chip label + color. Mirrors the classifier's
// top-level categories (see backend EmailReply.reply_classification).
const CLASSIFICATION_CONFIG = {
  interested:     { label: 'Interested',     colors: 'bg-green-50 text-green-700 ring-green-600/20' },
  not_interested: { label: 'Not interested', colors: 'bg-gray-100 text-gray-600 ring-gray-500/20' },
  unsubscribe:    { label: 'Unsubscribe',    colors: 'bg-red-50 text-red-700 ring-red-600/20' },
  referral:       { label: 'Referral',       colors: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20' },
  ooo:            { label: 'Out of office',  colors: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  unknown:        { label: 'Unknown',        colors: 'bg-gray-100 text-gray-500 ring-gray-500/20' },
};

const FILTER_OPTIONS = [
  { value: 'all',         label: 'All',          icon: InboxIcon },
  { value: 'received',    label: 'Received',     icon: ArrowDownLeft },
  { value: 'sent',        label: 'Sent',         icon: ArrowUpRight },
  { value: 'opened',      label: 'Opened',       icon: MailOpen },
  { value: 'needs_reply', label: 'Needs Reply',  icon: Clock },
  { value: 'priority',    label: 'Priority',     icon: Flame },
  { value: 'archived',    label: 'Archived',     icon: Archive },
];

// Strip HTML down to plain text for the plain-text composer (templates and
// signatures are stored as HTML). Good enough for a prefill the rep then edits.
function htmlToText(html) {
  if (!html) return '';
  return html
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

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

function ClassificationChip({ classification }) {
  if (!classification) return null;
  const cfg = CLASSIFICATION_CONFIG[classification] || CLASSIFICATION_CONFIG.unknown;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        cfg.colors
      )}
      title={`Reply classified: ${cfg.label}`}
    >
      {cfg.label}
    </span>
  );
}

function MessageItem({ message }) {
  const [expanded, setExpanded] = useState(false);
  const isSent = message.direction === 'sent';
  const htmlBody = message.body_html || null;

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
            {!isSent && <ClassificationChip classification={message.reply_classification} />}
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
            <SafeHtml
              html={htmlBody}
              className="prose prose-sm max-w-none rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700"
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

// Conversation Intelligence panel (P1-4) — momentum, unresolved objections,
// recommended next action, and a one-click "use suggested message".
function IntelligencePanel({ threadId, onUseSuggestion }) {
  const [open, setOpen] = useState(false);
  const intel = useThreadIntelligence(threadId, { enabled: open });

  const data = intel.data;
  const nextBody = data?.next_message?.body;

  return (
    <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-indigo-700"
      >
        <Brain className="h-4 w-4" />
        Conversation Intelligence
        <ChevronDown className={cn('ml-auto h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="border-t border-indigo-100 px-3 py-2.5 text-sm">
          {intel.isLoading ? (
            <div className="flex items-center gap-2 py-2 text-xs text-gray-500">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-b-2 border-indigo-500" />
              Analyzing conversation…
            </div>
          ) : intel.isError ? (
            <p className="py-1 text-xs text-red-600">Couldn’t load intelligence for this thread.</p>
          ) : data ? (
            <div className="space-y-2.5">
              {data.momentum_label && (
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-indigo-500" />
                  <span className="text-xs font-medium text-gray-500">Momentum</span>
                  <span className="text-sm font-semibold text-gray-800">{data.momentum_label}</span>
                  {typeof data.momentum_score === 'number' && (
                    <span className="text-xs text-gray-400">({Math.round(data.momentum_score)})</span>
                  )}
                </div>
              )}

              {Array.isArray(data.unresolved_objections) && data.unresolved_objections.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500">Unresolved objections</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-gray-700">
                    {data.unresolved_objections.map((o, i) => (
                      <li key={i}>{typeof o === 'string' ? o : o?.text || JSON.stringify(o)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {data.recommended_action && (
                <div>
                  <p className="text-xs font-medium text-gray-500">Recommended next action</p>
                  <p className="mt-0.5 text-sm text-gray-700">{data.recommended_action}</p>
                </div>
              )}

              {nextBody && (
                <button
                  type="button"
                  onClick={() => onUseSuggestion(nextBody)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-600"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Use suggested message
                </button>
              )}
            </div>
          ) : (
            <p className="py-1 text-xs text-gray-500">No analysis yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

function ReplyCompose({ threadMessages, threadId, body, setBody, subject, setSubject }) {
  const sendReply = useSendReply();
  const { data: templates } = useEmailTemplates();
  const { data: signatures } = useEmailSignatures();
  const intel = useThreadIntelligence(threadId, { enabled: false });
  const [aiLoading, setAiLoading] = useState(false);

  const lastMessage = threadMessages[threadMessages.length - 1];
  if (!lastMessage) return null;

  const handleTemplate = (e) => {
    const id = e.target.value;
    e.target.value = '';
    if (!id) return;
    const tmpl = (templates || []).find((t) => String(t.id) === id);
    if (!tmpl) return;
    if (tmpl.subject) setSubject(tmpl.subject);
    setBody((prev) => {
      const text = htmlToText(tmpl.body);
      return prev.trim() ? `${prev.trimEnd()}\n\n${text}` : text;
    });
    toast.success('Template inserted');
  };

  const handleSignature = (e) => {
    const id = e.target.value;
    e.target.value = '';
    if (!id) return;
    const sig = (signatures || []).find((s) => String(s.id) === id);
    if (!sig) return;
    const text = htmlToText(sig.content_html);
    if (!text) return;
    setBody((prev) => (prev.trimEnd() ? `${prev.trimEnd()}\n\n${text}` : text));
    toast.success('Signature added');
  };

  const handleAiDraft = async () => {
    setAiLoading(true);
    try {
      let data = intel.data;
      if (!data) {
        const res = await intel.refetch();
        data = res.data;
      }
      const draft = data?.next_message?.body;
      if (draft) {
        setBody(draft);
        if (data?.next_message?.subject) setSubject(data.next_message.subject);
        toast.success('AI draft ready');
      } else {
        toast.error('No AI draft available for this thread');
      }
    } catch {
      toast.error('Failed to generate AI draft');
    } finally {
      setAiLoading(false);
    }
  };

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
      <div className="mb-2 flex items-center gap-2">
        <Reply className="h-4 w-4 text-gray-400" />
        <span className="text-xs font-medium text-gray-500">Reply</span>
      </div>

      {/* Composer toolbar: templates, signature, AI draft (P1-1) */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-1 text-xs text-gray-500">
          <FileText className="h-3.5 w-3.5" />
          <select
            aria-label="Insert template"
            onChange={handleTemplate}
            defaultValue=""
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="">Template…</option>
            {(templates || []).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>

        <label className="inline-flex items-center gap-1 text-xs text-gray-500">
          <PenLine className="h-3.5 w-3.5" />
          <select
            aria-label="Insert signature"
            onChange={handleSignature}
            defaultValue=""
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="">Signature…</option>
            {(signatures || []).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={handleAiDraft}
          disabled={aiLoading}
          className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
        >
          {aiLoading ? (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-b-2 border-indigo-500" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          AI draft
        </button>
      </div>

      <input
        type="text"
        aria-label="Reply subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject"
        className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <textarea
        rows={4}
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

function ThreadCard({ thread, selected, onToggleSelect }) {
  const [expanded, setExpanded] = useState(false);
  const [body, setBody] = useState('');
  const [subject, setSubject] = useState('');
  const navigate = useNavigate();
  const markRead = useMarkThreadRead();
  const archive = useArchiveThread();

  const threadId = thread.gmail_thread_id;
  const messageCount = thread.messages?.length || 0;
  const displaySubject = thread.subject || '(No subject)';

  const lastMsg = thread.messages?.[thread.messages.length - 1];
  const needsReply = lastMsg?.direction === 'received';
  const isArchived = thread.is_archived;

  const handleToggleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    // Mark read on open (P0-1): opening a thread clears the unread dot.
    if (next && thread.has_unread) {
      markRead.mutate({ threadId, read: true });
    }
  };

  const handleArchive = (e) => {
    e.stopPropagation();
    archive.mutate(
      { threadId, archived: !isArchived },
      {
        onSuccess: () => toast.success(isArchived ? 'Unarchived' : 'Archived'),
        onError: () => toast.error('Failed to update thread'),
      }
    );
  };

  const handleMarkUnread = (e) => {
    e.stopPropagation();
    markRead.mutate(
      { threadId, read: false },
      { onSuccess: () => toast.success('Marked unread') }
    );
  };

  return (
    <div className={cn(
      'rounded-xl border bg-white shadow-sm',
      selected ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-200'
    )}>
      <div className="flex items-start gap-2 px-3 py-3.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(threadId)}
          aria-label={`Select thread ${displaySubject}`}
          className="mt-1 h-4 w-4 flex-shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />

        <button
          type="button"
          onClick={handleToggleExpand}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          {expanded
            ? <ChevronDown className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
            : <ChevronRight className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {thread.has_unread && (
                <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" title="Unread" />
              )}
              {thread.priority && (
                <Flame className="h-3.5 w-3.5 flex-shrink-0 text-orange-500" title="Priority lead" />
              )}
              <span className={cn(
                'truncate text-sm',
                thread.has_unread ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'
              )}>
                {displaySubject}
              </span>
              <ClassificationChip classification={thread.classification} />
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
              {needsReply && !isArchived && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                  <Clock className="h-3 w-3" />
                  Reply
                </span>
              )}
            </div>
          </div>
        </button>

        {/* Per-thread quick actions */}
        <div className="flex flex-shrink-0 items-center gap-1">
          {!thread.has_unread && (
            <button
              type="button"
              onClick={handleMarkUnread}
              title="Mark unread"
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <Mail className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={handleArchive}
            title={isArchived ? 'Unarchive' : 'Archive'}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            {isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4">
          {thread.messages.map((msg) => (
            <MessageItem key={msg.id} message={msg} />
          ))}

          <IntelligencePanel threadId={threadId} onUseSuggestion={setBody} />

          <ReplyCompose
            threadMessages={thread.messages}
            threadId={threadId}
            body={body}
            setBody={setBody}
            subject={subject}
            setSubject={setSubject}
          />

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
  const [accountEmail, setAccountEmail] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(() => new Set());

  const { accounts } = useConnectedAccounts();
  const bulkAction = useBulkThreadAction();

  const params = useMemo(() => {
    const p = { page, per_page: 20, filter };
    if (search) p.search = search;
    if (accountEmail) p.account_email = accountEmail;
    if (dateFrom) p.date_from = `${dateFrom}T00:00:00`;
    if (dateTo) p.date_to = `${dateTo}T23:59:59`;
    return p;
  }, [page, filter, search, accountEmail, dateFrom, dateTo]);

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
    setSelected(new Set());
  }, []);

  const handleAccountChange = useCallback((e) => {
    setAccountEmail(e.target.value);
    setPage(1);
  }, []);

  const threads = data?.threads || [];
  const totalThreads = data?.total || 0;
  const totalPages = Math.ceil(totalThreads / 20);

  const toggleSelect = useCallback((threadId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(threadId)) next.delete(threadId);
      else next.add(threadId);
      return next;
    });
  }, []);

  const allOnPageSelected = threads.length > 0 && threads.every((t) => selected.has(t.gmail_thread_id));
  const toggleSelectAll = useCallback(() => {
    setSelected((prev) => {
      if (threads.length > 0 && threads.every((t) => prev.has(t.gmail_thread_id))) {
        return new Set();
      }
      return new Set(threads.map((t) => t.gmail_thread_id));
    });
  }, [threads]);

  const runBulk = useCallback((action) => {
    const ids = [...selected];
    if (ids.length === 0) return;
    bulkAction.mutate(
      { action, threadIds: ids },
      {
        onSuccess: () => {
          toast.success(action === 'archive' ? `Archived ${ids.length}` : `Marked ${ids.length} read`);
          setSelected(new Set());
        },
        onError: () => toast.error('Bulk action failed'),
      }
    );
  }, [selected, bulkAction]);

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

      {/* Account filter — scopes every tab below to one connected mailbox */}
      {accounts.length > 0 && (
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
          <label
            htmlFor="inbox-account-filter"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600"
          >
            <Mail className="h-4 w-4 text-gray-400" />
            Account
          </label>
          <select
            id="inbox-account-filter"
            value={accountEmail}
            onChange={handleAccountChange}
            aria-label="Filter inbox by email account"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-80"
          >
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id ?? a.email} value={a.email}>
                {accountOptionLabel(a)}
              </option>
            ))}
          </select>
        </div>
      )}

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
            placeholder="Search subject, name, or message body..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </form>
      </div>

      {/* Date range */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600">
          <Calendar className="h-4 w-4 text-gray-400" />
          Date
        </span>
        <input
          type="date"
          aria-label="From date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
        />
        <span className="text-sm text-gray-400">to</span>
        <input
          type="date"
          aria-label="To date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
        />
        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }}
            className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5">
          <span className="text-sm font-medium text-blue-800">
            {selected.size} selected
          </span>
          <button
            type="button"
            onClick={() => runBulk('read')}
            disabled={bulkAction.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <MailOpen className="h-3.5 w-3.5" />
            Mark read
          </button>
          <button
            type="button"
            onClick={() => runBulk('archive')}
            disabled={bulkAction.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Archive className="h-3.5 w-3.5" />
            Archive
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-auto text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        </div>
      )}

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
              : filter === 'archived'
                ? 'No archived threads yet.'
                : accountEmail
                  ? 'No threads for this account. Try "All accounts" or another mailbox.'
                  : filter !== 'all'
                    ? 'No threads match this filter.'
                    : 'Email conversations will appear here once synced from Gmail.'
          }
        />
      ) : (
        <>
          {/* Select-all affordance */}
          <div className="flex items-center gap-2 px-1">
            <input
              type="checkbox"
              checked={allOnPageSelected}
              onChange={toggleSelectAll}
              aria-label="Select all threads on this page"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-500">Select all on page</span>
          </div>

          <div className="space-y-2">
            {threads.map((thread) => (
              <ThreadCard
                key={thread.gmail_thread_id}
                thread={thread}
                selected={selected.has(thread.gmail_thread_id)}
                onToggleSelect={toggleSelect}
              />
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
