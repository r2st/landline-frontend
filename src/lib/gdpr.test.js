import { describe, it, expect } from 'vitest';
import { isLikelyEmail, humanizeKey, summarizeExport } from './gdpr';

describe('isLikelyEmail', () => {
  it('accepts well-formed addresses and rejects junk', () => {
    expect(isLikelyEmail('dana@precision.com')).toBe(true);
    expect(isLikelyEmail(' dana@precision.com ')).toBe(true);
    expect(isLikelyEmail('not-an-email')).toBe(false);
    expect(isLikelyEmail('')).toBe(false);
    expect(isLikelyEmail(null)).toBe(false);
  });
});

describe('humanizeKey', () => {
  it('turns snake/kebab keys into title case', () => {
    expect(humanizeKey('email_events')).toBe('Email Events');
    expect(humanizeKey('lead-notes')).toBe('Lead Notes');
  });
});

describe('summarizeExport', () => {
  it('counts arrays, objects, and passes scalars through', () => {
    const sections = summarizeExport({
      contact: { name: 'Dana', email: 'dana@precision.com' },
      companies: [{ id: 1 }, { id: 2 }],
      emails_sent: 7,
    });
    expect(sections).toEqual([
      { key: 'contact', label: 'Contact', kind: 'object', count: 2 },
      { key: 'companies', label: 'Companies', kind: 'array', count: 2 },
      { key: 'emails_sent', label: 'Emails Sent', kind: 'scalar', value: 7 },
    ]);
  });

  it('returns an empty list for non-object payloads', () => {
    expect(summarizeExport(null)).toEqual([]);
    expect(summarizeExport([1, 2, 3])).toEqual([]);
    expect(summarizeExport('nope')).toEqual([]);
  });
});
