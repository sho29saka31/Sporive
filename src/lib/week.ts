/** 今週の開始日（日曜日）を YYYY-MM-DD 形式で返す */
export function getCurrentWeekStartDate(): string {
  const now = new Date();
  const day = now.getDay(); // 0=日曜
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - day);
  return sunday.toISOString().slice(0, 10);
}

export const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
