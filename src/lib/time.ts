/**
 * Centralized time formatting helpers (#973).
 *
 * Previously every component did its own `new Date(x).toLocaleString()` or an
 * ad-hoc relative-time calculation, so the same timestamp rendered differently
 * (and crashed on `null`/invalid values) depending on where it appeared. These
 * helpers are the single source of truth:
 *
 *   - `formatRelativeTime` — "3 minutes ago", "in 2 hours"
 *   - `formatAbsoluteDate` / `formatAbsoluteDateTime` — locale-aware dates
 *   - `formatTimestamp` — the default "date + time" rendering
 *
 * All helpers accept `null`/`undefined`/invalid input and return
 * `INVALID_TIME_PLACEHOLDER` instead of throwing, so a missing backend field can
 * never blank out a row.
 */

/** Rendered when a value is missing or cannot be parsed as a date. */
export const INVALID_TIME_PLACEHOLDER = '—';

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

export interface RelativeTimeOptions {
  /** Value used when absolute fallback is needed for invalid input. */
  fallback?: string;
  /** BCP-47 locale used for absolute fallback formatting. */
  locale?: string;
  /** Time zone used for absolute fallback formatting. */
  timeZone?: string;
  /** Injected "now" for deterministic tests. */
  now?: Date | number;
}

/**
 * Parse anything date-ish into a `Date`, or `null` when it is missing/invalid.
 * Numbers are treated as epoch milliseconds.
 */
export function parseDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Relative time label for past/recent timestamps (e.g. "just now", "12m ago").
 * Falls back to absolute date/time text for future or invalid dates (#893).
 */
export function formatRelativeTime(
  value: unknown,
  options: RelativeTimeOptions = {}
): string {
  const fallback = options.fallback ?? INVALID_TIME_PLACEHOLDER;
  const date = parseDate(value);
  if (!date) {
    return formatAbsoluteDateTime(value, {
      fallback,
      locale: options.locale,
      timeZone: options.timeZone,
    });
  }

  const nowMs = options.now === undefined ? Date.now() : new Date(options.now).getTime();
  const diffSeconds = Math.round((date.getTime() - nowMs) / 1000);

  // Future or invalid-relative cases fall back to absolute text.
  if (diffSeconds > 0) {
    return formatAbsoluteDateTime(date, {
      fallback,
      locale: options.locale,
      timeZone: options.timeZone,
    });
  }

  const abs = Math.abs(diffSeconds);
  if (abs < 45) return 'just now';
  if (abs < HOUR) return `${Math.round(abs / MINUTE)}m ago`;
  if (abs < DAY) return `${Math.round(abs / HOUR)}h ago`;
  if (abs < WEEK) return `${Math.round(abs / DAY)}d ago`;
  if (abs < MONTH) return `${Math.round(abs / WEEK)}w ago`;
  if (abs < YEAR) return `${Math.round(abs / MONTH)}mo ago`;
  return `${Math.round(abs / YEAR)}y ago`;
}

export interface AbsoluteTimeOptions {
  fallback?: string;
  locale?: string;
  timeZone?: string;
}

/** Locale-aware date only, e.g. "10/19/2026". */
export function formatAbsoluteDate(
  value: unknown,
  options: AbsoluteTimeOptions = {}
): string {
  const { fallback = INVALID_TIME_PLACEHOLDER, locale, timeZone } = options;
  const date = parseDate(value);
  if (!date) return fallback;
  return date.toLocaleDateString(locale, { timeZone });
}

/** Locale-aware date + time, e.g. "10/19/2026, 8:15:00 PM". */
export function formatAbsoluteDateTime(
  value: unknown,
  options: AbsoluteTimeOptions = {}
): string {
  const { fallback = INVALID_TIME_PLACEHOLDER, locale, timeZone } = options;
  const date = parseDate(value);
  if (!date) return fallback;
  return date.toLocaleString(locale, { timeZone });
}

/**
 * Default timestamp rendering used across tables and detail views: absolute
 * date + time, with an optional short timezone label.
 */
export function formatTimestamp(
  value: unknown,
  options: AbsoluteTimeOptions = {}
): string {
  return formatAbsoluteDateTime(value, options);
}

/**
 * Short timezone abbreviation for a timestamp (e.g. "UTC", "GMT+1"), or `null`
 * when the input is invalid. Uses `Intl` so it reflects the runtime zone.
 */
export function getTimeZoneAbbreviation(
  value: unknown,
  locale?: string
): string | null {
  const date = parseDate(value);
  if (!date) return null;
  try {
    const parts = new Intl.DateTimeFormat(locale, {
      timeZoneName: 'short',
    }).formatToParts(date);
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? null;
  } catch {
    return null;
  }
}
