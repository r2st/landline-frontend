import { describe, it, expect } from 'vitest';
import {
  fullTimestamp, senderDisplay, counterpartyEmail, threadStatus, unreadThreadCount,
} from './inboxUi';

describe('fullTimestamp', () => {
  it('formats an ISO date into an absolute label', () => {
    const out = fullTimestamp('2026-07-22T15:14:00Z');
    expect(out).toMatch(/2026/);
    expect(out).toMatch(/Jul/);
  });

  it('returns empty string for missing / invalid input', () => {
    expect(fullTimestamp(null)).toBe('');
    expect(fullTimestamp('not-a-date')).toBe('');
  });
});

describe('senderDisplay / counterpartyEmail', () => {
  it('prefers the contact name', () => {
    const msg = { direction: 'received', contact_name: 'Dana Lead', from_email: 'lead@acme.com' };
    expect(senderDisplay(msg)).toBe('Dana Lead');
  });

  it('falls back to the from_email for an inbound message', () => {
    const msg = { direction: 'received', from_email: 'lead@acme.com' };
    expect(senderDisplay(msg)).toBe('lead@acme.com');
    expect(counterpartyEmail(msg)).toBe('lead@acme.com');
  });

  it('uses the recipient for a sent message', () => {
    const msg = { direction: 'sent', to_email: 'lead@acme.com', from_email: 'me@company.com' };
    expect(counterpartyEmail(msg)).toBe('lead@acme.com');
  });
});

describe('threadStatus', () => {
  it('flags bounced when any send bounced', () => {
    const thread = { messages: [{ direction: 'sent', status: 'bounced' }] };
    expect(threadStatus(thread).key).toBe('bounced');
  });

  it('flags needs-attention when the latest message is inbound', () => {
    const thread = {
      messages: [
        { direction: 'sent', status: 'sent' },
        { direction: 'received', status: 'received' },
      ],
    };
    expect(threadStatus(thread).key).toBe('attention');
  });

  it('flags replied when we sent the latest message', () => {
    const thread = {
      messages: [
        { direction: 'received', status: 'received' },
        { direction: 'sent', status: 'sent' },
      ],
    };
    expect(threadStatus(thread).key).toBe('replied');
  });

  it('returns null for an empty thread', () => {
    expect(threadStatus({ messages: [] })).toBeNull();
  });
});

describe('unreadThreadCount', () => {
  it('counts threads with has_unread', () => {
    expect(unreadThreadCount([{ has_unread: true }, { has_unread: false }, { has_unread: true }])).toBe(2);
    expect(unreadThreadCount([])).toBe(0);
  });
});
