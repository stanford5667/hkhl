/**
 * Market Holidays Test Suite
 * Verifies trading calendar integrity for all years
 */

import { describe, it, expect } from 'vitest';
import {
  isTradingDay,
  isMarketHoliday,
  isWeekend,
  getMarketHolidays,
  getNextTradingDay,
  getPreviousTradingDay,
  getHolidayName,
} from '../marketHolidays';

describe('Market Holidays', () => {
  describe('isWeekend', () => {
    it('Saturday is weekend', () => {
      expect(isWeekend(new Date('2024-01-06'))).toBe(true); // Saturday
    });

    it('Sunday is weekend', () => {
      expect(isWeekend(new Date('2024-01-07'))).toBe(true); // Sunday
    });

    it('Monday is not weekend', () => {
      expect(isWeekend(new Date('2024-01-08'))).toBe(false); // Monday
    });

    it('Friday is not weekend', () => {
      expect(isWeekend(new Date('2024-01-05'))).toBe(false); // Friday
    });
  });

  describe('getMarketHolidays', () => {
    it('returns holidays for multiple years', () => {
      for (const year of [2020, 2021, 2022, 2023, 2024, 2025, 2026]) {
        const holidays = getMarketHolidays(year);
        expect(holidays.length).toBeGreaterThanOrEqual(9); // At least 9 US market holidays
        // Holidays should be in the correct year (or Dec 31 of prior year for observed New Year's)
        holidays.forEach(h => {
          const hy = h.getFullYear();
          expect(hy === year || hy === year - 1).toBe(true);
        });
      }
    });

    it('holidays are sorted chronologically', () => {
      const holidays = getMarketHolidays(2024);
      for (let i = 1; i < holidays.length; i++) {
        expect(holidays[i].getTime()).toBeGreaterThanOrEqual(holidays[i - 1].getTime());
      }
    });

    it('includes New Year\'s Day', () => {
      const holidays = getMarketHolidays(2024);
      const newYears = holidays.find(h => h.getMonth() === 0 && h.getDate() <= 2);
      expect(newYears).toBeDefined();
    });

    it('includes Christmas', () => {
      const holidays = getMarketHolidays(2024);
      const christmas = holidays.find(h => h.getMonth() === 11 && h.getDate() >= 24 && h.getDate() <= 26);
      expect(christmas).toBeDefined();
    });

    it('includes Thanksgiving (4th Thursday of November)', () => {
      const holidays = getMarketHolidays(2024);
      const thanksgiving = holidays.find(h => h.getMonth() === 10 && h.getDay() === 4);
      expect(thanksgiving).toBeDefined();
    });
  });

  describe('isMarketHoliday', () => {
    it('Christmas 2024 is a holiday', () => {
      expect(isMarketHoliday(new Date('2024-12-25'))).toBe(true);
    });

    it('regular Tuesday is not a holiday', () => {
      expect(isMarketHoliday(new Date('2024-03-12'))).toBe(false);
    });
  });

  describe('isTradingDay', () => {
    it('regular weekday is a trading day', () => {
      expect(isTradingDay(new Date('2024-03-12'))).toBe(true); // Tuesday
    });

    it('weekend is not a trading day', () => {
      expect(isTradingDay(new Date('2024-03-09'))).toBe(false); // Saturday
    });

    it('holiday is not a trading day', () => {
      expect(isTradingDay(new Date('2024-12-25'))).toBe(false); // Christmas
    });
  });

  describe('getNextTradingDay', () => {
    it('returns next weekday from Friday', () => {
      const next = getNextTradingDay(new Date('2024-03-08')); // Friday
      expect(next.getDay()).toBe(1); // Monday
    });

    it('skips holidays', () => {
      // Day before Christmas 2024 (Tuesday Dec 24) → next trading day should be Dec 26 (Thursday)
      const next = getNextTradingDay(new Date('2024-12-24'));
      expect(next.getDate()).toBe(26);
    });
  });

  describe('getPreviousTradingDay', () => {
    it('returns previous weekday from Monday', () => {
      const prev = getPreviousTradingDay(new Date('2024-03-11')); // Monday
      expect(prev.getDay()).toBe(5); // Friday
    });
  });

  describe('getHolidayName', () => {
    it('returns correct names for known holidays', () => {
      expect(getHolidayName(new Date('2024-12-25'))).toBe('Christmas Day');
      expect(getHolidayName(new Date('2024-07-04'))).toBe('Independence Day');
      expect(getHolidayName(new Date('2024-01-01'))).toBe("New Year's Day");
    });

    it('returns null for non-holidays', () => {
      expect(getHolidayName(new Date('2024-03-12'))).toBeNull();
    });
  });
});
