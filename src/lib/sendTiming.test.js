import { describe, it, expect } from 'vitest';
import {
  activeHourRange, dowRangeLabel, heatIntensity, hourLabel, indexCells,
  ptsLabel, pct, splitArms, windowLabel,
} from './sendTiming';

describe('sendTiming helpers', () => {
  describe('pct', () => {
    it('formats a 0-1 rate as a one-decimal percent', () => {
      expect(pct(0.421)).toBe('42.1%');
      expect(pct(1)).toBe('100.0%');
      expect(pct(0)).toBe('0.0%');
    });
    it('shows an em dash for missing values', () => {
      expect(pct(null)).toBe('—');
      expect(pct(undefined)).toBe('—');
      expect(pct(NaN)).toBe('—');
    });
  });

  describe('ptsLabel', () => {
    it('signs a positive lift and labels it as points', () => {
      expect(ptsLabel(0.042)).toBe('+4.2 pts');
    });
    it('keeps the minus sign for a negative lift', () => {
      expect(ptsLabel(-0.031)).toBe('-3.1 pts');
    });
    it('renders exactly zero without a sign', () => {
      expect(ptsLabel(0)).toBe('0.0 pts');
    });
    it('em-dashes a null lift', () => {
      expect(ptsLabel(null)).toBe('—');
    });
  });

  describe('hourLabel', () => {
    it('maps 24h hours to compact am/pm', () => {
      expect(hourLabel(0)).toBe('12a');
      expect(hourLabel(9)).toBe('9a');
      expect(hourLabel(12)).toBe('12p');
      expect(hourLabel(13)).toBe('1p');
      expect(hourLabel(23)).toBe('11p');
    });
  });

  describe('dowRangeLabel', () => {
    it('collapses a contiguous run into a range', () => {
      expect(dowRangeLabel([2, 3, 4])).toBe('Tue–Thu');
    });
    it('lists non-contiguous days', () => {
      expect(dowRangeLabel([1, 3, 5])).toBe('Mon, Wed, Fri');
    });
    it('falls back to "Any day" when empty', () => {
      expect(dowRangeLabel([])).toBe('Any day');
    });
    it('keeps a two-day span as a list, not a range', () => {
      expect(dowRangeLabel([2, 3])).toBe('Tue, Wed');
    });
  });

  describe('windowLabel', () => {
    it('reads a window as days plus a 12h clock range', () => {
      expect(
        windowLabel({ dow_preference: [2, 3, 4], hour_start: 9, hour_end: 11 })
      ).toBe('Tue–Thu, 9 AM–11 AM');
    });
    it('em-dashes a missing window', () => {
      expect(windowLabel(null)).toBe('—');
    });
  });

  describe('splitArms', () => {
    it('pulls arms out by name regardless of order', () => {
      const exp = {
        arms: [
          { arm: 'control', open_rate: 0.2 },
          { arm: 'optimized', open_rate: 0.3 },
        ],
      };
      const { optimized, control } = splitArms(exp);
      expect(optimized.open_rate).toBe(0.3);
      expect(control.open_rate).toBe(0.2);
    });
    it('returns nulls when arms are absent', () => {
      expect(splitArms(null)).toEqual({ optimized: null, control: null });
      expect(splitArms({ arms: [] })).toEqual({ optimized: null, control: null });
    });
  });

  describe('heatIntensity', () => {
    it('is zero for an empty cell', () => {
      expect(heatIntensity(0, 0.5)).toBe(0);
    });
    it('floors a non-zero cell so it stays visible', () => {
      expect(heatIntensity(0.01, 1)).toBeGreaterThan(0.1);
    });
    it('reaches full opacity at the grid peak', () => {
      expect(heatIntensity(0.5, 0.5)).toBeCloseTo(1, 5);
    });
  });

  describe('indexCells', () => {
    it('indexes by dow_hour and finds the peak above the sample floor', () => {
      const { map, maxRate } = indexCells([
        { dow: 2, hour: 10, sent: 10, opened: 6, open_rate: 0.6 },
        { dow: 3, hour: 9, sent: 1, opened: 1, open_rate: 1.0 }, // too thin to be peak
      ]);
      expect(map['2_10'].opened).toBe(6);
      expect(maxRate).toBe(0.6); // the 1/1 cell is ignored for the peak
    });
    it('falls back to the raw peak when nothing clears the floor', () => {
      const { maxRate } = indexCells([
        { dow: 1, hour: 8, sent: 2, opened: 1, open_rate: 0.5 },
      ]);
      expect(maxRate).toBe(0.5);
    });
  });

  describe('activeHourRange', () => {
    it('spans the min to max populated hour', () => {
      expect(
        activeHourRange([
          { dow: 2, hour: 8 },
          { dow: 3, hour: 16 },
        ])
      ).toEqual({ start: 8, end: 16 });
    });
    it('defaults to a business-ish range when empty', () => {
      expect(activeHourRange([])).toEqual({ start: 6, end: 20 });
    });
  });
});
