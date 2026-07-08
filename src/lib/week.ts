/** 今週の開始日（日曜日）を YYYY-MM-DD 形式で返す */
export function getCurrentWeekStartDate(): string {
  const now = new Date();
  const day = now.getDay(); // 0=日曜
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - day);
  return sunday.toISOString().slice(0, 10);
}

export const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

/** 今日の日付を YYYY-MM-DD 形式で返す */
export function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 週の開始日（日曜日）から7日分の日付（YYYY-MM-DD）を返す */
export function getWeekDates(weekStartDate: string): string[] {
  const start = new Date(`${weekStartDate}T00:00:00`);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}
