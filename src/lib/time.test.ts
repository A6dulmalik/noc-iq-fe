import { describe, expect, it } from 'vitest';
import {
  formatAbsoluteDate,
  formatAbsoluteDateTime,
  formatRelativeTime,
  formatTimestamp,
  getTimeZoneAbbreviation,
  INVALID_TIME_PLACEHOLDER,
  parseDate,
} from './time';

describe('time formatting (#973)', () => {
  const now = new Date('2026-10-19T12:00:00.000Z');

  describe('parseDate', () => {
    it('parses ISO strings and Date instances', () => {
      expect(parseDate('2026-10-19T12:00:00.000Z')?.toISOString()).toBe(
        '2026-10-19T12:00:00.000Z'
      );
      expect(parseDate(now)?.getTime()).toBe(now.getTime());
    });

    it('parses epoch milliseconds', () => {
      expect(parseDate(now.getTime())?.getTime()).toBe(now.getTime());
    });

    it('returns null for null/undefined/empty/invalid', () => {
      expect(parseDate(null)).toBeNull();
      expect(parseDate(undefined)).toBeNull();
      expect(parseDate('')).toBeNull();
      expect(parseDate('not-a-date')).toBeNull();
    });
  });

  describe('formatRelativeTime', () => {
    const rel = (iso: string) =>
      formatRelativeTime(iso, { now, locale: 'en-US', timeZone: 'UTC' });

    it('renders recent timestamps as "just now"', () => {
      expect(rel('2026-10-19T11:59:45.000Z')).toBe('just now');
    });

    it('renders past timestamps as relative labels across boundaries (#893)', () => {
      expect(rel('2026-10-19T11:59:16.000Z')).toBe('just now'); // 44s
      expect(rel('2026-10-19T11:59:14.000Z')).toBe('1m ago'); // 46s
      expect(rel('2026-10-19T11:55:00.000Z')).toBe('5m ago');
      expect(rel('2026-10-19T11:00:00.000Z')).toBe('1h ago');
      expect(rel('2026-10-19T09:00:00.000Z')).toBe('3h ago');
      expect(rel('2026-10-18T12:00:00.000Z')).toBe('1d ago');
      expect(rel('2026-10-16T12:00:00.000Z')).toBe('3d ago');
      expect(rel('2026-10-12T12:00:00.000Z')).toBe('1w ago');
      expect(rel('2026-09-19T12:00:00.000Z')).toBe('1mo ago');
      expect(rel('2025-10-19T12:00:00.000Z')).toBe('1y ago');
    });

    it('falls back to absolute text for future dates', () => {
      expect(rel('2026-10-19T12:10:00.000Z')).toBe(
        formatAbsoluteDateTime('2026-10-19T12:10:00.000Z', {
          locale: 'en-US',
          timeZone: 'UTC',
        })
      );
    });

    it('falls back to absolute text for invalid input', () => {
      expect(formatRelativeTime(null, { locale: 'en-US', timeZone: 'UTC' })).toBe(
        INVALID_TIME_PLACEHOLDER
      );
      expect(formatRelativeTime('nope', { locale: 'en-US', timeZone: 'UTC' })).toBe(
        INVALID_TIME_PLACEHOLDER
      );
    });

    it('honours a custom fallback for invalid input', () => {
      expect(
        formatRelativeTime(undefined, {
          fallback: 'unknown',
          locale: 'en-US',
          timeZone: 'UTC',
        })
      ).toBe('unknown');
    });
  });

  describe('absolute formatting', () => {
    it('formats date only', () => {
      expect(formatAbsoluteDate('2026-10-19T12:00:00.000Z', {
        locale: 'en-US',
        timeZone: 'UTC',
      })).toBe('10/19/2026');
    });

    it('formats date + time deterministically in UTC', () => {
      expect(
        formatAbsoluteDateTime('2026-10-19T20:15:00.000Z', {
          locale: 'en-US',
          timeZone: 'UTC',
        })
      ).toBe('10/19/2026, 8:15:00 PM');
    });

    it('falls back on invalid input', () => {
      expect(formatAbsoluteDate('nope')).toBe(INVALID_TIME_PLACEHOLDER);
      expect(formatAbsoluteDateTime(null)).toBe(INVALID_TIME_PLACEHOLDER);
      expect(formatTimestamp(undefined)).toBe(INVALID_TIME_PLACEHOLDER);
    });
  });

  describe('getTimeZoneAbbreviation', () => {
    it('returns a timezone label for a valid timestamp', () => {
      const abbr = getTimeZoneAbbreviation(now, 'en-US');
      expect(abbr).toBeTruthy();
      expect(typeof abbr).toBe('string');
    });

    it('returns null for invalid input', () => {
      expect(getTimeZoneAbbreviation('nope')).toBeNull();
    });
  });
});
