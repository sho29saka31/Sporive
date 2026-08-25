"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type NotificationActionState = {
  error?: string;
  success?: string;
} | null;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

/** 通知設定（種別ごとの時刻・非通知時間帯/曜日）の保存 */
export async function saveNotificationSettings(
  _prevState: NotificationActionState,
  formData: FormData
): Promise<NotificationActionState> {
  const dailyReminderTime = String(formData.get("daily_reminder_time") ?? "");
  const debtReminderTime = String(formData.get("debt_reminder_time") ?? "");
  const weeklyReportTime = String(formData.get("weekly_report_time") ?? "");
  const reengagementEnabled = formData.get("reengagement_enabled") === "on";
  const weeklyReportEnabled = formData.get("weekly_report_enabled") === "on";
  const quietHoursStart = String(formData.get("quiet_hours_start") ?? "");
  const quietHoursEnd = String(formData.get("quiet_hours_end") ?? "");
  const quietDays = formData
    .getAll("quiet_days")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);

  if (
    !isValidTime(dailyReminderTime) ||
    !isValidTime(debtReminderTime) ||
    !isValidTime(weeklyReportTime)
  ) {
    return { error: "通知時刻を正しく入力してください。" };
  }

  if ((quietHoursStart === "") !== (quietHoursEnd === "")) {
    return { error: "非通知時間帯は開始・終了の両方を入力してください。" };
  }
  if (quietHoursStart && !isValidTime(quietHoursStart)) {
    return { error: "非通知時間帯（開始）を正しく入力してください。" };
  }
  if (quietHoursEnd && !isValidTime(quietHoursEnd)) {
    return { error: "非通知時間帯（終了）を正しく入力してください。" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // 各種別のlast_notified_onをリセットすることで、設定変更後は（同日中でも）
  // 新しい時刻を過ぎた最初のcron実行で通知が送られる
  const { error } = await supabase.from("notification_settings").upsert({
    user_id: user.id,
    daily_reminder_time: `${dailyReminderTime}:00`,
    debt_reminder_time: `${debtReminderTime}:00`,
    reengagement_enabled: reengagementEnabled,
    weekly_report_enabled: weeklyReportEnabled,
    weekly_report_time: `${weeklyReportTime}:00`,
    quiet_hours_start: quietHoursStart ? `${quietHoursStart}:00` : null,
    quiet_hours_end: quietHoursEnd ? `${quietHoursEnd}:00` : null,
    quiet_days: quietDays,
    timezone: "Asia/Tokyo",
    daily_last_notified_on: null,
    debt_last_notified_on: null,
    reengagement_last_notified_on: null,
    weekly_report_last_notified_on: null,
  });

  if (error) {
    return { error: "通知設定の保存に失敗しました。" };
  }

  revalidatePath("/settings/account/notifications");
  return { success: "通知設定を保存しました。" };
}
