/** Business-day helpers in Asia/Baghdad (UTC+3, no DST). */

export const BUSINESS_TZ_OFFSET_HOURS = 3;

export function baghdadDayBounds(dateYmd: string): { start: Date; end: Date } {
  // dateYmd = YYYY-MM-DD in Baghdad calendar
  const [y, m, d] = dateYmd.split("-").map(Number);
  if (!y || !m || !d) {
    throw new Error(`Invalid date: ${dateYmd}`);
  }
  // Baghdad midnight = UTC midnight minus 3 hours
  const start = new Date(Date.UTC(y, m - 1, d, -BUSINESS_TZ_OFFSET_HOURS, 0, 0, 0));
  const end = new Date(Date.UTC(y, m - 1, d + 1, -BUSINESS_TZ_OFFSET_HOURS, 0, 0, 0));
  return { start, end };
}

export function rangeBounds(fromYmd: string, toYmd: string): { start: Date; end: Date } {
  const from = baghdadDayBounds(fromYmd);
  const to = baghdadDayBounds(toYmd);
  return { start: from.start, end: to.end };
}

export function toBaghdadYmd(date: Date): string {
  const shifted = new Date(date.getTime() + BUSINESS_TZ_OFFSET_HOURS * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

export function daysBetweenBaghdad(fromYmd: string, toYmd: string): number {
  const a = baghdadDayBounds(fromYmd).start.getTime();
  const b = baghdadDayBounds(toYmd).start.getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

/** Parse `<input type="datetime-local">` as Asia/Baghdad wall time → UTC Date. */
export function parseBaghdadDateTimeLocal(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(trimmed);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const h = Number(match[4]);
  const mi = Number(match[5]);
  if (![y, m, d, h, mi].every((n) => Number.isFinite(n))) return null;
  return new Date(
    Date.UTC(y, m - 1, d, h - BUSINESS_TZ_OFFSET_HOURS, mi, 0, 0),
  );
}

/** Format a Date for `<input type="datetime-local">` in Asia/Baghdad. */
export function toBaghdadDateTimeLocal(date: Date): string {
  const shifted = new Date(
    date.getTime() + BUSINESS_TZ_OFFSET_HOURS * 60 * 60 * 1000,
  );
  return shifted.toISOString().slice(0, 16);
}
