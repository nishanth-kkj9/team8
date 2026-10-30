/**
 * Date helpers. All timestamps are stored as ISO strings and rendered in
 * Asia/Kolkata (ARCHITECTURE.md §6). TAT dates are date-only YYYY-MM-DD.
 */

const IST_DATE_ONLY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today in Asia/Kolkata as YYYY-MM-DD. */
export function todayDateOnly(): string {
  return IST_DATE_ONLY.format(new Date());
}

/** YYYY-MM-DD `days` days from today (negative for the past). */
export function dateOnlyFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return IST_DATE_ONLY.format(d);
}

/** ISO timestamp `days` ago at a fixed clock time, for stable-looking seed data. */
export function isoDaysAgo(days: number, hour = 10, minute = 15): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

const DATE_TIME_FMT = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

const DATE_FMT = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** Render an ISO timestamp in Asia/Kolkata, e.g. "30 Oct 2026, 10:15 am".
    Returns "—" when the value is missing or not a valid date. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return DATE_TIME_FMT.format(date);
}

/** Render a YYYY-MM-DD date-only string (a full ISO timestamp is tolerated —
    only its date part is used), e.g. "05 Nov 2026". Returns "—" when the
    value cannot be parsed so a bad record never crashes a page. */
export function formatDateOnly(value: string): string {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "—";
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  if (Number.isNaN(date.getTime())) return "—";
  return DATE_FMT.format(date);
}
