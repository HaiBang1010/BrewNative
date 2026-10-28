/** Shop days are Vietnam days, whatever the server's time zone. */
export const SHOP_TIME_ZONE = 'Asia/Ho_Chi_Minh';

/** "YYYY-MM-DD" of `date` in the shop's time zone. */
export function shopDate(date: Date): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: SHOP_TIME_ZONE }).format(
    date,
  );
}

/** The `days` dates ending with `lastDay`, oldest first. */
export function lastDays(lastDay: string, days: number): string[] {
  const end = Date.parse(`${lastDay}T00:00:00Z`);
  return Array.from({ length: days }, (_, i) =>
    new Date(end - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10),
  );
}

export type DaySales = { date: string; revenue: number; orders: number };

/** One entry per day, with 0 for days without sales (the chart needs every day). */
export function fillDays(
  dates: string[],
  rows: { date: string; revenue: number; orders: number }[],
): DaySales[] {
  const byDate = new Map(rows.map((row) => [row.date, row]));
  return dates.map((date) => ({
    date,
    revenue: byDate.get(date)?.revenue ?? 0,
    orders: byDate.get(date)?.orders ?? 0,
  }));
}
