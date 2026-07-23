import { describe, it, expect } from 'vitest';
import {
  labelChipClasses, labelDotClass, snoozePresets, formatSnoozeUntil,
  LABEL_COLOR_TOKENS,
} from './inboxExtras';

describe('label colours', () => {
  it('maps a known token to its chip classes', () => {
    expect(labelChipClasses('red')).toContain('text-red-700');
  });
  it('falls back to gray for an unknown token', () => {
    expect(labelChipClasses('chartreuse')).toEqual(labelChipClasses('gray'));
    expect(labelDotClass('chartreuse')).toEqual(labelDotClass('gray'));
  });
  it('exposes a non-empty picker palette', () => {
    expect(LABEL_COLOR_TOKENS.length).toBeGreaterThan(3);
  });
});

describe('snoozePresets', () => {
  it('returns later/tomorrow/next-week, all in the future', () => {
    const now = new Date('2026-07-22T14:00:00'); // a Wednesday
    const presets = snoozePresets(now);
    expect(presets.map((p) => p.key)).toEqual(['later', 'tomorrow', 'next_week']);
    for (const p of presets) expect(p.date.getTime()).toBeGreaterThan(now.getTime());
  });

  it('"later today" is +3 hours', () => {
    const now = new Date('2026-07-22T14:00:00');
    const [later] = snoozePresets(now);
    expect(later.date.getTime() - now.getTime()).toBe(3 * 60 * 60 * 1000);
  });

  it('"tomorrow" lands at 9am the next day', () => {
    const now = new Date('2026-07-22T14:00:00');
    const tomorrow = snoozePresets(now)[1].date;
    expect(tomorrow.getDate()).toBe(23);
    expect(tomorrow.getHours()).toBe(9);
    expect(tomorrow.getMinutes()).toBe(0);
  });

  it('"next week" is the following Monday at 9am', () => {
    const now = new Date('2026-07-22T14:00:00'); // Wed → next Mon is the 27th
    const nextWeek = snoozePresets(now)[2].date;
    expect(nextWeek.getDay()).toBe(1); // Monday
    expect(nextWeek.getDate()).toBe(27);
    expect(nextWeek.getHours()).toBe(9);
  });

  it('when today is Monday, next week jumps a full week', () => {
    const monday = new Date('2026-07-20T14:00:00'); // a Monday
    const nextWeek = snoozePresets(monday)[2].date;
    expect(nextWeek.getDay()).toBe(1);
    expect(nextWeek.getDate()).toBe(27);
  });
});

describe('formatSnoozeUntil', () => {
  it('formats an ISO string compactly', () => {
    expect(formatSnoozeUntil('2026-07-24T09:00:00')).toMatch(/Jul 24/);
  });
  it('returns empty for falsy / invalid input', () => {
    expect(formatSnoozeUntil('')).toBe('');
    expect(formatSnoozeUntil('not-a-date')).toBe('');
  });
});
