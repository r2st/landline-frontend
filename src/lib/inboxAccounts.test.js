import { describe, it, expect } from 'vitest';
import { mergeAccounts, accountOptionLabel } from './inboxAccounts';

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
