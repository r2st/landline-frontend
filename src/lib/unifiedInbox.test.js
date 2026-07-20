import { describe, it, expect } from 'vitest';
import {
  emailMailbox,
  emailThreadStatus,
  dialtoneReplyStatus,
  normalizeEmailThread,
  normalizeDialtoneReply,
  mergeInbox,
  deriveMailboxes,
  filterInbox,
} from './unifiedInbox';

const thread = {
  gmail_thread_id: 't1',
  subject: 'Re: pricing',
  lead_name: 'Acme Co',
  last_activity: '2026-07-18T10:00:00Z',
  has_unread: true,
  messages: [
    { id: 'm1', direction: 'sent', from_email: 'me@co.com', timestamp: '2026-07-17T09:00:00Z' },
    { id: 'm2', direction: 'received', from_email: 'buyer@acme.com', snippet: 'What does it cost?', timestamp: '2026-07-18T10:00:00Z' },
  ],
};

const reply = {
  id: 'r1',
  subject: 'Re: quick question',
  contact_name: 'Dana Reed',
  from_email: 'dana@precision.com',
  snippet: "Yes, we're interested",
  received_at: '2026-07-19T12:00:00Z',
  is_read: false,
  priority_flag: true,
  reply_classification: 'interested',
};

describe('emailMailbox', () => {
  it('maps provider variants to Gmail / SMTP', () => {
    expect(emailMailbox({ provider: 'google' })).toBe('Gmail');
    expect(emailMailbox({ mailbox_type: 'smtp' })).toBe('SMTP');
    expect(emailMailbox({})).toBe('Gmail'); // sensible default
  });
});

describe('status derivation', () => {
  it('marks an email thread unreplied when the last message came inbound', () => {
    expect(emailThreadStatus(thread)).toBe('unreplied');
    expect(emailThreadStatus({ messages: [{ direction: 'sent' }] })).toBe('replied');
  });

  it('marks a Dialtone reply replied only once dispatched', () => {
    expect(dialtoneReplyStatus(reply)).toBe('unreplied');
    expect(dialtoneReplyStatus({ ...reply, reply_sent_at: '2026-07-19T13:00:00Z' })).toBe('replied');
    expect(dialtoneReplyStatus({ ...reply, handled_action: 'sent' })).toBe('replied');
  });
});

describe('normalize', () => {
  it('normalizes an email thread', () => {
    const item = normalizeEmailThread(thread);
    expect(item).toMatchObject({
      source: 'email',
      mailbox: 'Gmail',
      subject: 'Re: pricing',
      contactName: 'Acme Co',
      snippet: 'What does it cost?',
      status: 'unreplied',
      unread: true,
    });
  });

  it('normalizes a Dialtone reply and carries intent + priority', () => {
    const item = normalizeDialtoneReply(reply);
    expect(item).toMatchObject({
      source: 'dialtone',
      mailbox: 'Dialtone',
      contactName: 'Dana Reed',
      status: 'unreplied',
      unread: true,
      priority: true,
      classification: 'interested',
    });
  });
});

describe('mergeInbox', () => {
  it('interleaves both sources newest-first', () => {
    const merged = mergeInbox({ threads: [thread], replies: [reply] });
    expect(merged.map((i) => i.source)).toEqual(['dialtone', 'email']); // reply is newer
  });

  it('handles either source being absent', () => {
    expect(mergeInbox({ threads: [thread] })).toHaveLength(1);
    expect(mergeInbox({ replies: [reply] })).toHaveLength(1);
    expect(mergeInbox({})).toEqual([]);
  });
});

describe('deriveMailboxes', () => {
  it('lists present mailboxes in a stable order', () => {
    const items = mergeInbox({ threads: [thread, { ...thread, gmail_thread_id: 't2', provider: 'smtp' }], replies: [reply] });
    expect(deriveMailboxes(items)).toEqual(['Gmail', 'SMTP', 'Dialtone']);
  });
});

describe('filterInbox', () => {
  const items = mergeInbox({ threads: [thread], replies: [reply] });

  it('filters by mailbox', () => {
    expect(filterInbox(items, { mailbox: 'Dialtone' })).toHaveLength(1);
    expect(filterInbox(items, { mailbox: 'Dialtone' })[0].source).toBe('dialtone');
  });

  it('filters by status', () => {
    expect(filterInbox(items, { status: 'unreplied' })).toHaveLength(2);
    expect(filterInbox(items, { status: 'replied' })).toHaveLength(0);
  });

  it('searches subject, contact, and snippet', () => {
    expect(filterInbox(items, { search: 'pricing' })).toHaveLength(1);
    expect(filterInbox(items, { search: 'dana' })).toHaveLength(1);
    expect(filterInbox(items, { search: 'nothing-matches' })).toHaveLength(0);
  });

  it('treats empty / "all" filters as no-ops', () => {
    expect(filterInbox(items, { mailbox: 'all', status: '', search: '' })).toHaveLength(2);
  });
});
