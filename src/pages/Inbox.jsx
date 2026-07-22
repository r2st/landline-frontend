import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail, MailOpen, Inbox as InboxIcon, Send, ArrowUpRight, ArrowDownLeft,
  CheckCircle2, MousePointerClick, Reply, MessageSquare, Search, RefreshCw,
  Building2, ArrowRight, Clock, Archive, ArchiveRestore, Flame, Calendar,
  Sparkles, FileText, PenLine, Brain, TrendingUp, X, ChevronLeft, ChevronDown,
  AlertTriangle, Keyboard,
} from 'lucide-react';
import toast from 'react-hot-toast';
import EmptyState from '../components/EmptyState';
import SafeHtml from '../components/SafeHtml';
import Avatar from '../components/Avatar';
import RichTextComposer from '../components/RichTextComposer';
import UndoToast from '../components/UndoToast';
import { InboxSkeleton, ThreadDetailSkeleton } from '../components/Skeleton';
import {
  useEmailInbox, useSendReply, useTriggerSync,
  useMarkThreadRead, useArchiveThread, useBulkThreadAction, useThreadIntelligence,
} from '../hooks/useEmailHistory';
import { useEmailTemplates, useEmailSignatures } from '../hooks/useEmailTemplates';
import { useConnectedAccounts } from '../hooks/useConnectedAccounts';
import { useInboxDrafts } from '../hooks/useInboxDrafts';
import { accountOptionLabel } from '../lib/inboxAccounts';
import { timeAgo, cn } from '../lib/utils';
import {
  fullTimestamp, senderDisplay, counterpartyEmail, threadStatus,
} from '../lib/inboxUi';

const STATUS_CONFIG = {
  sent:      { icon: CheckCircle2,      colors: 'bg-blue-50 text-blue-700' },
  delivered: { icon: CheckCircle2,      colors: 'bg-blue-50 text-blue-700' },
  opened:    { icon: MailOpen,          colors: 'bg-green-50 text-green-700' },
  clicked:   { icon: MousePointerClick, colors: 'bg-purple-50 text-purple-700' },
  replied:   { icon: Reply,             colors: 'bg-teal-50 text-teal-700' },
  received:  { icon: Mail,              colors: 'bg-amber-50 text-amber-700' },
  bounced:   { icon: AlertTriangle,     colors: 'bg-red-50 text-red-700' },
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

const SHORTCUTS = [
  { keys: 'j / k', desc: 'Next / previous conversation' },
  { keys: 'e',     desc: 'Archive open conversation' },
  { keys: 'r',     desc: 'Reply (focus composer)' },
  { keys: '⌘ / Ctrl + Enter', desc: 'Send reply' },
  { keys: '/',     desc: 'Focus search' },
  { keys: 'Esc',   desc: 'Close conversation' },
];

// Escape user text and wrap it as HTML paragraphs for the rich composer.
function textToHtml(text) {
  const esc = String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<p>${esc.replace(/\n/g, '<br/>')}</p>`;
}

// True when composer HTML actually carries content (not just <br>/<p> chrome).
function htmlHasContent(html) {
  return !!String(html || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
}

function showUndoToast(message, onUndo) {
  toast((t) => (
    <UndoToast message={message} onUndo={onUndo} onDismiss={() => toast.dismiss(t.id)} />
  ));
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

// Thread-level status pill (P1-7): Needs attention / Replied / Bounced.
function ThreadStatusPill({ thread }) {
  const status = threadStatus(thread);
  if (!status) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        status.colors
      )}
    >
      {status.label}
    </span>
  );
}

// ─── Thread list row (left rail) ──────────────────────────────────────────────

function ThreadRow({ thread, active, checked, onSelect, onToggleCheck, onArchive }) {
  const threadId = thread.gmail_thread_id;
  const displaySubject = thread.subject || '(No subject)';
  const messageCount = thread.messages?.length || 0;
  const lastMsg = thread.messages?.[thread.messages.length - 1];
  const isArchived = thread.is_archived;
  const person = lastMsg ? senderDisplay(lastMsg) : (thread.lead_name || '');
  const personEmail = lastMsg ? counterpartyEmail(lastMsg) : '';

  return (
    <div
      className={cn(
        'group relative flex items-start gap-2.5 rounded-xl border px-3 py-3 transition-colors',
        active
          ? 'border-indigo-300 bg-indigo-50/60 ring-1 ring-indigo-200'
          : checked
            ? 'border-indigo-200 bg-indigo-50/30'
            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggleCheck(threadId)}
        aria-label={`Select thread ${displaySubject}`}
        className="mt-1 h-4 w-4 flex-shrink-0 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
      />

      <Avatar name={person} email={personEmail} size="md" className="mt-0.5" />

      <button
        type="button"
        onClick={() => onSelect(thread)}
        className="flex min-w-0 flex-1 flex-col text-left"
      >
        <div className="flex items-center gap-1.5">
          {thread.has_unread && (
            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-indigo-500" title="Unread" />
          )}
          {thread.priority && (
            <Flame className="h-3.5 w-3.5 flex-shrink-0 text-orange-500" title="Priority lead" />
          )}
          <span className={cn(
            'truncate text-sm',
            thread.has_unread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
          )}>
            {person || displaySubject}
          </span>
          <span
            className="ml-auto flex-shrink-0 text-[11px] text-gray-400"
            title={fullTimestamp(thread.last_activity)}
          >
            {timeAgo(thread.last_activity)}
          </span>
        </div>

        <div className="mt-0.5 flex items-center gap-1.5">
          <span className={cn(
            'truncate text-xs',
            thread.has_unread ? 'font-medium text-gray-700' : 'text-gray-500'
          )}>
            {displaySubject}
          </span>
          {messageCount > 1 && (
            <span className="inline-flex flex-shrink-0 items-center gap-0.5 text-[11px] text-gray-400">
              <MessageSquare className="h-3 w-3" />
              {messageCount}
            </span>
          )}
        </div>

        {lastMsg?.snippet && (
          <p className="mt-1 line-clamp-1 text-xs text-gray-500">{lastMsg.snippet}</p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <ThreadStatusPill thread={thread} />
          <ClassificationChip classification={thread.classification} />
          {thread.lead_name && (
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
              <Building2 className="h-3 w-3" />
              {thread.lead_name}
            </span>
          )}
        </div>
      </button>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onArchive(thread); }}
        title={isArchived ? 'Unarchive' : 'Archive'}
        className="flex-shrink-0 rounded-md p-1.5 text-gray-400 opacity-0 transition hover:bg-gray-100 hover:text-gray-600 focus:opacity-100 group-hover:opacity-100"
      >
        {isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ─── Conversation message bubble (detail pane) ────────────────────────────────

function MessageBubble({ message }) {
  const isSent = message.direction === 'sent';
  const person = senderDisplay(message);
  const email = counterpartyEmail(message);
  const htmlBody = message.body_html || null;

  return (
    <div className={cn('flex gap-2.5', isSent && 'flex-row-reverse')}>
      <Avatar name={person} email={email} size="sm" className="mt-1" />
      <div className={cn('flex min-w-0 max-w-[85%] flex-col', isSent && 'items-end')}>
        <div className={cn('flex flex-wrap items-center gap-2', isSent && 'flex-row-reverse')}>
          <span className="text-sm font-medium text-gray-900">{person}</span>
          <time
            className="text-[11px] text-gray-400"
            title={fullTimestamp(message.timestamp)}
          >
            {timeAgo(message.timestamp)}
          </time>
          {isSent && message.status && <StatusBadge status={message.status} />}
          {!isSent && <ClassificationChip classification={message.reply_classification} />}
        </div>
        <div className={cn(
          'mt-1 overflow-hidden rounded-2xl px-3.5 py-2.5 text-sm text-gray-800',
          isSent ? 'rounded-tr-sm bg-indigo-50' : 'rounded-tl-sm bg-gray-100'
        )}>
          {htmlBody ? (
            <SafeHtml html={htmlBody} className="prose prose-sm max-w-none break-words" />
          ) : message.body_text ? (
            <div className="whitespace-pre-wrap break-words">{message.body_text}</div>
          ) : (
            <p className="italic text-gray-400">No message body</p>
          )}
        </div>
        {(message.opened_at || message.clicked_at) && (
          <div className={cn('mt-1 flex gap-3 text-[11px] text-gray-400', isSent && 'flex-row-reverse')}>
            {message.opened_at && <span>Opened {timeAgo(message.opened_at)}</span>}
            {message.clicked_at && <span>Clicked {timeAgo(message.clicked_at)}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Conversation Intelligence strip (P1-6, detail header) ────────────────────

function IntelligenceStrip({ threadId, onUseSuggestion }) {
  const [open, setOpen] = useState(false);
  const intel = useThreadIntelligence(threadId, { enabled: open });
  const data = intel.data;
  const nextBody = data?.next_message?.body;

  return (
    <div className="rounded-lg border border-indigo-100 bg-indigo-50/40">
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

// ─── Reply composer (rich text) ──────────────────────────────────────────────

function ReplyComposer({ thread, drafts, composerRef, suggestion }) {
  const threadId = thread.gmail_thread_id;
  const saved = drafts.getDraft(threadId);
  const [html, setHtml] = useState(saved?.html || '');
  const [text, setText] = useState(saved?.text || '');
  const [subject, setSubject] = useState(saved?.subject ?? '');
  const sendReply = useSendReply();
  const { data: templates } = useEmailTemplates();
  const { data: signatures } = useEmailSignatures();
  const intel = useThreadIntelligence(threadId, { enabled: false });
  const [aiLoading, setAiLoading] = useState(false);

  const lastMessage = thread.messages?.[thread.messages.length - 1];

  // Persist the draft on every edit so switching threads / reloading keeps it.
  const persist = useCallback((next) => {
    drafts.setDraft(threadId, {
      html: next.html ?? html,
      text: next.text ?? text,
      subject: next.subject ?? subject,
    });
  }, [drafts, threadId, html, text, subject]);

  const handleComposerChange = ({ html: h, text: t }) => {
    setHtml(h);
    setText(t);
    persist({ html: h, text: t });
  };

  const handleSubject = (e) => {
    const v = e.target.value;
    setSubject(v);
    persist({ subject: v });
  };

  // Append template / signature HTML into the composer.
  const appendHtml = (fragment) => {
    const next = html && htmlHasContent(html) ? `${html}${fragment}` : fragment;
    setHtml(next);
    // Keep a plain-text mirror so the draft/send validation sees content too.
    const combinedText = `${text ? `${text}\n` : ''}${fragment.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}`;
    setText(combinedText);
    persist({ html: next, text: combinedText });
  };

  const handleTemplate = (e) => {
    const id = e.target.value;
    e.target.value = '';
    if (!id) return;
    const tmpl = (templates || []).find((t) => String(t.id) === id);
    if (!tmpl) return;
    if (tmpl.subject) { setSubject(tmpl.subject); persist({ subject: tmpl.subject }); }
    appendHtml(tmpl.body || '');
    toast.success('Template inserted');
  };

  const handleSignature = (e) => {
    const id = e.target.value;
    e.target.value = '';
    if (!id) return;
    const sig = (signatures || []).find((s) => String(s.id) === id);
    if (!sig?.content_html) return;
    appendHtml(sig.content_html);
    toast.success('Signature added');
  };

  const applySuggestion = useCallback((bodyText) => {
    const asHtml = textToHtml(bodyText);
    setHtml(asHtml);
    setText(bodyText);
    drafts.setDraft(threadId, { html: asHtml, text: bodyText, subject });
  }, [drafts, threadId, subject]);

  // Apply an Intelligence "use suggested message" push. Guarded on tick so it
  // only fires on an actual click, not on mount.
  useEffect(() => {
    if (suggestion?.tick && suggestion.text) applySuggestion(suggestion.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestion?.tick]);

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
        applySuggestion(draft);
        if (data?.next_message?.subject) { setSubject(data.next_message.subject); }
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
    e?.preventDefault?.();
    const trimmed = (text || '').trim();
    if (!trimmed || !lastMessage) return;
    const bodyHtml = htmlHasContent(html) ? html : textToHtml(trimmed);
    sendReply.mutate(
      { emailId: lastMessage.id, data: { body_html: bodyHtml, body_text: trimmed } },
      {
        onSuccess: () => {
          setHtml('');
          setText('');
          drafts.clearDraft(threadId);
          toast.success('Reply sent');
        },
        onError: (err) => toast.error(err?.message || 'Failed to send reply'),
      }
    );
  };

  if (!lastMessage) return null;

  return (
    <form onSubmit={handleSend} className="border-t border-gray-200 bg-white p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500">
          <Reply className="h-4 w-4 text-gray-400" /> Reply
        </span>
        <label className="ml-auto inline-flex items-center gap-1 text-xs text-gray-500">
          <FileText className="h-3.5 w-3.5" />
          <select
            aria-label="Insert template"
            onChange={handleTemplate}
            defaultValue=""
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:border-indigo-500 focus:outline-none"
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
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:border-indigo-500 focus:outline-none"
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
        onChange={handleSubject}
        placeholder="Subject"
        className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />

      <RichTextComposer
        ref={composerRef}
        value={html}
        onChange={handleComposerChange}
        onSend={handleSend}
        ariaLabel="Reply body"
        placeholder="Write your reply… (⌘/Ctrl + Enter to send)"
      />

      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-gray-400">⌘/Ctrl + Enter to send</span>
        <button
          type="submit"
          disabled={sendReply.isPending || !(text || '').trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-600 disabled:opacity-50"
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

// ─── Thread detail pane ──────────────────────────────────────────────────────

function ThreadDetail({ thread, drafts, composerRef, onArchive, onMarkUnread, onClose }) {
  const navigate = useNavigate();
  // IntelligenceStrip pushes a suggested reply down into the composer. The tick
  // makes each click a distinct event the composer can react to.
  const [suggestion, setSuggestion] = useState({ text: '', tick: 0 });
  const displaySubject = thread.subject || '(No subject)';
  const isArchived = thread.is_archived;

  const handleUseSuggestion = (body) => {
    setSuggestion((s) => ({ text: body, tick: s.tick + 1 }));
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-start gap-2 border-b border-gray-200 px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          title="Back to list"
          className="-ml-1 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 lg:hidden"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold text-gray-900">{displaySubject}</h2>
            <ThreadStatusPill thread={thread} />
            <ClassificationChip classification={thread.classification} />
          </div>
          {thread.lead_name && (
            <button
              type="button"
              onClick={() => thread.lead_id && navigate(`/companies/${thread.lead_id}`)}
              className={cn(
                'mt-0.5 inline-flex items-center gap-1 text-xs text-gray-500',
                thread.lead_id && 'hover:text-indigo-600'
              )}
            >
              <Building2 className="h-3 w-3" />
              {thread.lead_name}
              {thread.lead_id && <ArrowRight className="h-3 w-3" />}
            </button>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onMarkUnread(thread)}
            title="Mark unread"
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <Mail className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onArchive(thread)}
            title={isArchived ? 'Unarchive' : 'Archive'}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            {isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Scrollable conversation */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-gray-50/50 p-4">
        <IntelligenceStrip threadId={thread.gmail_thread_id} onUseSuggestion={handleUseSuggestion} />
        {thread.messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>

      {/* Composer */}
      <ReplyComposer
        thread={thread}
        drafts={drafts}
        composerRef={composerRef}
        suggestion={suggestion}
      />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Inbox() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [checked, setChecked] = useState(() => new Set());
  const [selectedId, setSelectedId] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const drafts = useInboxDrafts();
  const { accounts } = useConnectedAccounts();
  const bulkAction = useBulkThreadAction();
  const markRead = useMarkThreadRead();
  const archive = useArchiveThread();
  const searchRef = useRef(null);
  const composerRef = useRef(null);

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

  const threads = data?.threads || [];
  const totalThreads = data?.total || 0;
  const totalPages = Math.ceil(totalThreads / 20);
  const selectedThread = threads.find((t) => t.gmail_thread_id === selectedId) || null;

  const selectThread = useCallback((thread) => {
    setSelectedId(thread.gmail_thread_id);
    if (thread.has_unread) {
      markRead.mutate({ threadId: thread.gmail_thread_id, read: true });
    }
  }, [markRead]);

  const archiveWithUndo = useCallback((thread) => {
    const id = thread.gmail_thread_id;
    const wasArchived = thread.is_archived;
    archive.mutate(
      { threadId: id, archived: !wasArchived },
      {
        onSuccess: () => {
          if (selectedId === id) setSelectedId(null);
          showUndoToast(wasArchived ? 'Unarchived' : 'Archived', () => {
            archive.mutate({ threadId: id, archived: wasArchived });
          });
        },
        onError: () => toast.error('Failed to update thread'),
      }
    );
  }, [archive, selectedId]);

  const markUnread = useCallback((thread) => {
    markRead.mutate(
      { threadId: thread.gmail_thread_id, read: false },
      { onSuccess: () => toast.success('Marked unread') }
    );
  }, [markRead]);

  const handleSync = useCallback(() => {
    triggerSync.mutate(undefined, {
      onSuccess: (result) => { toast.success(`Synced ${result.synced || 0} new emails`); refetch(); },
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
    setChecked(new Set());
    setSelectedId(null);
  }, []);

  const handleAccountChange = useCallback((e) => {
    setAccountEmail(e.target.value);
    setPage(1);
    setSelectedId(null);
  }, []);

  const toggleCheck = useCallback((threadId) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(threadId)) next.delete(threadId);
      else next.add(threadId);
      return next;
    });
  }, []);

  const allOnPageChecked = threads.length > 0 && threads.every((t) => checked.has(t.gmail_thread_id));
  const toggleCheckAll = useCallback(() => {
    setChecked((prev) => {
      if (threads.length > 0 && threads.every((t) => prev.has(t.gmail_thread_id))) return new Set();
      return new Set(threads.map((t) => t.gmail_thread_id));
    });
  }, [threads]);

  const runBulk = useCallback((action) => {
    const ids = [...checked];
    if (ids.length === 0) return;
    bulkAction.mutate(
      { action, threadIds: ids },
      {
        onSuccess: () => {
          setChecked(new Set());
          const undoAction = action === 'archive' ? 'archive' : 'read';
          showUndoToast(
            action === 'archive' ? `Archived ${ids.length}` : `Marked ${ids.length} read`,
            () => bulkAction.mutate({ action: undoAction, threadIds: ids, value: false })
          );
        },
        onError: () => toast.error('Bulk action failed'),
      }
    );
  }, [checked, bulkAction]);

  // Keyboard shortcuts (P1-4). Refs keep the handler fresh without re-binding.
  const kb = useRef({});
  kb.current = { threads, selectedId, selectThread, archiveWithUndo, selectedThread, toggleCheck };
  useEffect(() => {
    const onKey = (e) => {
      const s = kb.current;
      const el = e.target;
      const typing = el && (
        el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' ||
        el.isContentEditable
      );
      if (e.key === 'Escape') {
        setSelectedId(null);
        setShowShortcuts(false);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key === '?') { setShowShortcuts((v) => !v); return; }

      const list = s.threads;
      if (!list.length) return;
      const idx = list.findIndex((t) => t.gmail_thread_id === s.selectedId);

      if (e.key === 'j') {
        e.preventDefault();
        const next = list[Math.min(list.length - 1, idx < 0 ? 0 : idx + 1)];
        if (next) s.selectThread(next);
      } else if (e.key === 'k') {
        e.preventDefault();
        const prev = list[Math.max(0, idx < 0 ? 0 : idx - 1)];
        if (prev) s.selectThread(prev);
      } else if (e.key === 'e' && s.selectedThread) {
        e.preventDefault();
        s.archiveWithUndo(s.selectedThread);
      } else if (e.key === 'r' && s.selectedThread) {
        e.preventDefault();
        composerRef.current?.focus();
      } else if (e.key === 'x' && s.selectedThread) {
        e.preventDefault();
        s.toggleCheck(s.selectedThread.gmail_thread_id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
          <p className="mt-1 text-sm text-gray-500">All email conversations across your leads</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowShortcuts((v) => !v)}
            title="Keyboard shortcuts"
            aria-label="Keyboard shortcuts"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50"
          >
            <Keyboard className="h-4 w-4" />
          </button>
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
      </div>

      {showShortcuts && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Keyboard className="h-4 w-4 text-gray-400" /> Keyboard shortcuts
          </div>
          <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {SHORTCUTS.map((s) => (
              <li key={s.keys} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-gray-600">{s.desc}</span>
                <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[11px] font-medium text-gray-500">{s.keys}</kbd>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Account filter */}
      {accounts.length > 0 && (
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
          <label htmlFor="inbox-account-filter" className="flex items-center gap-1.5 text-sm font-medium text-gray-600">
            <Mail className="h-4 w-4 text-gray-400" /> Account
          </label>
          <select
            id="inbox-account-filter"
            value={accountEmail}
            onChange={handleAccountChange}
            aria-label="Filter inbox by email account"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-80"
          >
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id ?? a.email} value={a.email}>{accountOptionLabel(a)}</option>
            ))}
          </select>
        </div>
      )}

      {/* Filters row */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSearch} className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search subject, name, or message body..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </form>
      </div>

      {/* Date range */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600">
          <Calendar className="h-4 w-4 text-gray-400" /> Date
        </span>
        <input
          type="date"
          aria-label="From date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none"
        />
        <span className="text-sm text-gray-400">to</span>
        <input
          type="date"
          aria-label="To date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none"
        />
        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }}
            className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Bulk action bar */}
      {checked.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5">
          <span className="text-sm font-medium text-indigo-800">{checked.size} selected</span>
          <button
            type="button"
            onClick={() => runBulk('read')}
            disabled={bulkAction.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <MailOpen className="h-3.5 w-3.5" /> Mark read
          </button>
          <button
            type="button"
            onClick={() => runBulk('archive')}
            disabled={bulkAction.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Archive className="h-3.5 w-3.5" /> Archive
          </button>
          <button
            type="button"
            onClick={() => setChecked(new Set())}
            className="ml-auto text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        </div>
      )}

      {/* Two-pane body */}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center">
          <p className="text-sm text-red-700">
            Failed to load inbox{error.message ? `: ${error.message}` : '.'}
          </p>
        </div>
      ) : (
        <div className="flex gap-4 lg:h-[calc(100vh-19rem)] lg:min-h-[34rem]">
          {/* Left rail: thread list */}
          <div className={cn(
            'flex w-full flex-col lg:w-[22rem] xl:w-[24rem]',
            selectedId ? 'hidden lg:flex' : 'flex'
          )}>
            {isLoading ? (
              <InboxSkeleton />
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
                <div className="mb-2 flex items-center gap-2 px-1">
                  <input
                    type="checkbox"
                    checked={allOnPageChecked}
                    onChange={toggleCheckAll}
                    aria-label="Select all threads on this page"
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-gray-500">Select all on page</span>
                  <span className="ml-auto text-xs text-gray-400">{totalThreads} total</span>
                </div>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
                  {threads.map((thread) => (
                    <ThreadRow
                      key={thread.gmail_thread_id}
                      thread={thread}
                      active={thread.gmail_thread_id === selectedId}
                      checked={checked.has(thread.gmail_thread_id)}
                      onSelect={selectThread}
                      onToggleCheck={toggleCheck}
                      onArchive={archiveWithUndo}
                    />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-2 text-xs text-gray-500">
                    <span>Page {page} of {totalPages}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page <= 1}
                        className="rounded-md border border-gray-300 bg-white px-2 py-1 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page >= totalPages}
                        className="rounded-md border border-gray-300 bg-white px-2 py-1 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right pane: detail */}
          <div className={cn(
            'min-w-0 flex-1 rounded-xl border border-gray-200 bg-white shadow-sm',
            selectedId ? 'flex' : 'hidden lg:flex'
          )}>
            {isLoading && selectedId ? (
              <ThreadDetailSkeleton />
            ) : selectedThread ? (
              <ThreadDetail
                key={selectedThread.gmail_thread_id}
                thread={selectedThread}
                drafts={drafts}
                composerRef={composerRef}
                onArchive={archiveWithUndo}
                onMarkUnread={markUnread}
                onClose={() => setSelectedId(null)}
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
                  <MessageSquare className="h-7 w-7 text-indigo-400" />
                </div>
                <h3 className="text-sm font-semibold text-gray-800">Select a conversation</h3>
                <p className="mt-1 max-w-xs text-sm text-gray-500">
                  Choose a thread from the list to read it and reply. Press{' '}
                  <kbd className="rounded border border-gray-200 bg-gray-50 px-1 text-[11px]">j</kbd>{' '}
                  /{' '}
                  <kbd className="rounded border border-gray-200 bg-gray-50 px-1 text-[11px]">k</kbd>{' '}
                  to navigate.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
