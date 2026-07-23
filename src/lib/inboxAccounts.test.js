import { describe, it, expect } from 'vitest';
import {
  mergeAccounts, accountOptionLabel, accountsFromThreads, combineAccounts,
} from './inboxAccounts';

const gmail = [
  { id: 'g1', email: 'sales@company.com', display_name: 'Sales', status: 'connected' },
  { id: 'g2', email: 'support@company.com', status: 'connected' },
];
const smtp = [
  { id: 's1', email: 'relay@company.com', display_name: 'Relay', status: 'connected' },
];

describe('mergeAccounts', () => {
  it('merges gmail + smtp, tagging provider and sorting by address', () => {
    const merged = mergeAccounts({ gmail, smtp });
    expect(merged.map((a) => a.email)).toEqual([
      'relay@company.com',
      'sales@company.com',
      'support@company.com',
    ]);
    expect(merged.find((a) => a.email === 'relay@company.com').provider).toBe('smtp');
    expect(merged.find((a) => a.email === 'sales@company.com').provider).toBe('gmail');
  });

  it('de-duplicates by lowercased email, gmail winning', () => {
    const merged = mergeAccounts({
      gmail: [{ id: 'g1', email: 'Dup@company.com' }],
      smtp: [{ id: 's1', email: 'dup@company.com' }],
    });
    expect(merged).toHaveLength(1);
    expect(merged[0].provider).toBe('gmail');
  });

  it('drops rows without an email and tolerates non-arrays', () => {
    const merged = mergeAccounts({
      gmail: [{ id: 'g1' }, { id: 'g2', email: 'ok@company.com' }],
      smtp: null,
    });
    expect(merged.map((a) => a.email)).toEqual(['ok@company.com']);
  });

  it('returns an empty list for no input', () => {
    expect(mergeAccounts()).toEqual([]);
    expect(mergeAccounts({})).toEqual([]);
  });
});

describe('accountOptionLabel', () => {
  it('labels gmail with just the address', () => {
    expect(accountOptionLabel({ email: 'a@b.com', provider: 'gmail' })).toBe('a@b.com');
  });

  it('tags smtp addresses so same-domain identities stay distinct', () => {
    expect(accountOptionLabel({ email: 'a@b.com', provider: 'smtp' })).toBe('a@b.com (SMTP)');
  });
});

describe('accountsFromThreads', () => {
  const thread = (messages) => ({ gmail_thread_id: 't', messages });

  it('extracts distinct account identities from message tags', () => {
    const found = accountsFromThreads([
      thread([
        { gmail_account_id: 'g1', gmail_account_email: 'support@company.com' },
        { gmail_account_id: 'g1', gmail_account_email: 'support@company.com' },
      ]),
      thread([{ gmail_account_id: 'g2', gmail_account_email: 'sales@company.com' }]),
    ]);
    expect(found.map((a) => a.email)).toEqual(['support@company.com', 'sales@company.com']);
    expect(found[0]).toMatchObject({ id: 'g1', email: 'support@company.com', provider: null });
  });

  it('de-duplicates case-insensitively across threads', () => {
    const found = accountsFromThreads([
      thread([{ gmail_account_email: 'Support@Company.com' }]),
      thread([{ gmail_account_email: 'support@company.com' }]),
    ]);
    expect(found).toHaveLength(1);
  });

  it('skips messages with no account tag and tolerates junk input', () => {
    expect(accountsFromThreads([thread([{ from_email: 'x@y.com' }])])).toEqual([]);
    expect(accountsFromThreads(null)).toEqual([]);
    expect(accountsFromThreads([{}, { messages: null }])).toEqual([]);
  });
});

describe('combineAccounts', () => {
  it('unions endpoint + discovered accounts, endpoint entry wins on the address', () => {
    const combined = combineAccounts(
      [{ id: 'g1', email: 'support@company.com', provider: 'gmail', status: 'connected' }],
      [
        { id: null, email: 'support@company.com', provider: null },   // dup, endpoint wins
        { id: null, email: 'lead-alias@company.com', provider: null }, // discovered-only
      ]
    );
    expect(combined.map((a) => a.email)).toEqual(['lead-alias@company.com', 'support@company.com']);
    // The support entry keeps the richer endpoint metadata.
    expect(combined.find((a) => a.email === 'support@company.com')).toMatchObject({
      provider: 'gmail', status: 'connected',
    });
  });

  it('works when either side is empty', () => {
    expect(combineAccounts([], [{ email: 'only@discovered.com' }]).map((a) => a.email))
      .toEqual(['only@discovered.com']);
    expect(combineAccounts([{ email: 'only@endpoint.com' }], []).map((a) => a.email))
      .toEqual(['only@endpoint.com']);
    expect(combineAccounts()).toEqual([]);
  });
});
