const JST_TIME_ZONE = "Asia/Tokyo";

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * サーバーの実行環境（Vercelはデフォルト UTC）に依存せず、
 * 日本時間（JST）基準の日付・曜日を取得するためのヘルパー群。
 * `new Date().getDay()` 等をそのまま使うと、UTCとJSTの9時間差により
 * 日本時間の日付が変わった直後（0-8時台）でも前日の曜日として扱われてしまう。
 */

/** 今日の日付（JST基準）を YYYY-MM-DD 形式で返す */
export function getTodayDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: JST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** 今日の曜日（JST基準）を 0=日曜〜6=土曜 で返す */
export function getTodayDayOfWeek(): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: JST_TIME_ZONE,
    weekday: "short",
  }).format(new Date());
  return WEEKDAY_INDEX[weekday];
}

/** 今週の開始日（日曜日、JST基準）を YYYY-MM-DD 形式で返す */
export function getCurrentWeekStartDate(): string {
  const [y, m, d] = getTodayDate().split("-").map(Number);
  const sunday = new Date(Date.UTC(y, m - 1, d));
  sunday.setUTCDate(sunday.getUTCDate() - getTodayDayOfWeek());
  return sunday.toISOString().slice(0, 10);
}

/** 日付（YYYY-MM-DD）にn日を加算した日付を返す */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/** 昨日の日付（JST基準）を YYYY-MM-DD 形式で返す */
export function getYesterdayDate(): string {
  return addDays(getTodayDate(), -1);
}

/** 任意の日付（YYYY-MM-DD）の曜日を 0=日曜〜6=土曜 で返す */
export function getDayOfWeekOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** 任意の日付（YYYY-MM-DD）が属する週の開始日（日曜日）を返す */
export function getWeekStartDateOf(date: string): string {
  return addDays(date, -getDayOfWeekOf(date));
}

export const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

/** 週の開始日（日曜日）から7日分の日付（YYYY-MM-DD）を返す */
export function getWeekDates(weekStartDate: string): string[] {
  const [y, m, d] = weekStartDate.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d));
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(start);
    dt.setUTCDate(start.getUTCDate() + i);
    return dt.toISOString().slice(0, 10);
  });
}
