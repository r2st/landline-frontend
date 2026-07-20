// Unified inbox — one merged view over two very different message sources:
//
//   1. Email threads (emailHistoryApi.getInbox) — the Gmail/SMTP mailbox, a
//      threaded conversation with sent/received messages.
//   2. Dialtone replies (repliesApi.inbox) — the cold-outreach reply queue,
//      individual replies classified by intent.
//
// The two backends return different shapes, so everything is normalized to one
// `InboxItem` before the UI ever sees it. Keeping this pure (no React, no
// network) makes the merge/filter rules straightforward to unit-test.

// Which mailbox an email thread belongs to. The backend may label it a few
// different ways; collapse them to the two the operator cares about.
export function emailMailbox(thread) {
  const raw =
    thread.mailbox || thread.mailbox_type || thread.provider || thread.account_type;
  if (!raw) return 'Gmail';
  const s = String(raw).toLowerCase();
  if (s.includes('smtp')) return 'SMTP';
  if (s.includes('gmail') || s.includes('google')) return 'Gmail';
  return String(raw);
}

// An email thread is "unreplied" when the last message in it came inbound and
// nothing has gone back out since — i.e. the ball is in our court.
export function emailThreadStatus(thread) {
  const messages = thread.messages || [];
  const last = messages[messages.length - 1];
  return last?.direction === 'received' ? 'unreplied' : 'replied';
}

export function normalizeEmailThread(thread) {
  const messages = thread.messages || [];
  const last = messages[messages.length - 1];
  return {
    key: `email:${thread.gmail_thread_id ?? thread.thread_id ?? last?.id ?? thread.id}`,
    source: 'email',
    mailbox: emailMailbox(thread),
    subject: thread.subject || '(no subject)',
    contactName: thread.lead_name || last?.contact_name || last?.from_email || '',
    contactEmail: last?.from_email || '',
    snippet: last?.snippet || '',
    timestamp: thread.last_activity || last?.timestamp || null,
    status: emailThreadStatus(thread),
    unread: Boolean(thread.has_unread),
    raw: thread,
  };
}

// A Dialtone reply counts as replied once it's been dispatched (via the
// smart-reply send). `reply_sent_at` / a 'sent' handled_action both mark that.
export function dialtoneReplyStatus(reply) {
  return reply.reply_sent_at || reply.handled_action === 'sent'
    ? 'replied'
    : 'unreplied';
}

export function normalizeDialtoneReply(reply) {
  return {
    key: `dialtone:${reply.id}`,
    source: 'dialtone',
    mailbox: 'Dialtone',
    subject: reply.subject || '(no subject)',
    contactName: reply.contact_name || reply.from_email || '',
    contactEmail: reply.from_email || '',
    snippet: reply.snippet || '',
    timestamp: reply.received_at || null,
    status: dialtoneReplyStatus(reply),
    unread: !reply.is_read,
    priority: Boolean(reply.priority_flag),
    classification: reply.reply_classification || null,
    raw: reply,
  };
}

// Merge both sources into one list, newest first. Missing timestamps sort last.
export function mergeInbox({ threads = [], replies = [] } = {}) {
  const items = [
    ...threads.map(normalizeEmailThread),
    ...replies.map(normalizeDialtoneReply),
  ];
  return items.sort((a, b) => {
    const ta = a.timestamp ? Date.parse(a.timestamp) : -Infinity;
    const tb = b.timestamp ? Date.parse(b.timestamp) : -Infinity;
    return tb - ta;
  });
}

// The distinct mailboxes present in a merged list, in a stable display order.
export function deriveMailboxes(items) {
  const order = ['Gmail', 'SMTP', 'Dialtone'];
  const seen = new Set(items.map((i) => i.mailbox));
  const known = order.filter((m) => seen.has(m));
  const extra = [...seen].filter((m) => !order.includes(m)).sort();
  return [...known, ...extra];
}

// Apply the operator's filters. `mailbox` of '' (or 'all') means every mailbox;
// `status` of '' means both replied and unreplied; `search` matches subject,
// contact name/email, and snippet, case-insensitively.
export function filterInbox(items, { mailbox = '', status = '', search = '' } = {}) {
  const q = search.trim().toLowerCase();
  return items.filter((item) => {
    if (mailbox && mailbox !== 'all' && item.mailbox !== mailbox) return false;
    if (status && status !== 'all' && item.status !== status) return false;
    if (q) {
      const hay = `${item.subject} ${item.contactName} ${item.contactEmail} ${item.snippet}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
