/** Date helpers. All pure so they can run on server or client. */

/** YYYY-MM-DD in local time (not UTC, so the day never shifts). */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday 00:00 of the week containing `d`. */
export function startOfWeekMonday(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

/** 7 Dates (Mon..Sun) for the week `weekOffset` weeks away from `today`. */
export function getWeek(today: Date, weekOffset: number): Date[] {
  const start = startOfWeekMonday(today);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + weekOffset * 7 + i);
    return d;
  });
}

const WEEKDAY_LONG_FMT = new Intl.DateTimeFormat("es-ES", { weekday: "long" });
const WEEKDAY_SHORT_FMT = new Intl.DateTimeFormat("es-ES", { weekday: "short" });
const DAYNUM_FMT = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
});
const MONTH_FMT = new Intl.DateTimeFormat("es-ES", { month: "short" });

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function weekdayLabel(d: Date): string {
  return cap(WEEKDAY_LONG_FMT.format(d));
}

export function weekdayShort(d: Date): string {
  return cap(WEEKDAY_SHORT_FMT.format(d).replace(".", ""));
}

export function dayMonthLabel(d: Date): string {
  return DAYNUM_FMT.format(d);
}

/** "9–15 jun" or "29 may – 4 jun" when the week spans two months. */
export function formatWeekRange(days: Date[]): string {
  const a = days[0];
  const b = days[days.length - 1];
  const ma = MONTH_FMT.format(a).replace(".", "");
  const mb = MONTH_FMT.format(b).replace(".", "");
  if (ma === mb) return `${a.getDate()}–${b.getDate()} ${mb}`;
  return `${a.getDate()} ${ma} – ${b.getDate()} ${mb}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return toISODate(a) === toISODate(b);
}

export function isPast(d: Date, today: Date = new Date()): boolean {
  const t = new Date(today);
  t.setHours(0, 0, 0, 0);
  return d < t;
}
