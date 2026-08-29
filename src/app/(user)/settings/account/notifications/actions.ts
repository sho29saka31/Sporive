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
  if (
    quietHoursStart &&
    quietHoursEnd &&
    quietHoursStart === quietHoursEnd
  ) {
    return {
      error: "非通知時間帯は開始と終了に同じ時刻を指定できません。",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const dailyReminderTimeValue = `${dailyReminderTime}:00`;
  const debtReminderTimeValue = `${debtReminderTime}:00`;
  const weeklyReportTimeValue = `${weeklyReportTime}:00`;

  // 実際に時刻・ON/OFFが変わった種別だけlast_notified_onをリセットする。
  // 変更していない種別まで一律でリセットすると、その種別が当日既に送信済みでも
  // 未送信扱いに戻り、直後のcron実行で同日中に再送されてしまう
  // （週次レポートの場合はGeminiの不要な再呼び出しにもつながる）
  const { data: currentSettings, error: currentSettingsError } = await supabase
    .from("notification_settings")
    .select(
      "daily_reminder_time, debt_reminder_time, reengagement_enabled, weekly_report_enabled, weekly_report_time"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  // 既存設定の取得に失敗した場合、「行が存在しない（初回保存）」と区別できず、
  // 変更していない種別まで誤って一律リセットしてしまう（今回防ごうとしている
  // 不具合そのものを再現する）ため、保存自体を失敗として扱う
  if (currentSettingsError) {
    return { error: "通知設定の保存に失敗しました。" };
  }

  const resetOnChange: Partial<{
    daily_last_notified_on: null;
    debt_last_notified_on: null;
    reengagement_last_notified_on: null;
    weekly_report_last_notified_on: null;
  }> = {};
  if (!currentSettings || currentSettings.daily_reminder_time !== dailyReminderTimeValue) {
    resetOnChange.daily_last_notified_on = null;
  }
  if (!currentSettings || currentSettings.debt_reminder_time !== debtReminderTimeValue) {
    resetOnChange.debt_last_notified_on = null;
  }
  if (
    !currentSettings ||
    currentSettings.reengagement_enabled !== reengagementEnabled
  ) {
    resetOnChange.reengagement_last_notified_on = null;
  }
  if (
    !currentSettings ||
    currentSettings.weekly_report_enabled !== weeklyReportEnabled ||
    currentSettings.weekly_report_time !== weeklyReportTimeValue
  ) {
    resetOnChange.weekly_report_last_notified_on = null;
  }

  const { error } = await supabase.from("notification_settings").upsert({
    user_id: user.id,
    daily_reminder_time: dailyReminderTimeValue,
    debt_reminder_time: debtReminderTimeValue,
    reengagement_enabled: reengagementEnabled,
    weekly_report_enabled: weeklyReportEnabled,
    weekly_report_time: weeklyReportTimeValue,
    quiet_hours_start: quietHoursStart ? `${quietHoursStart}:00` : null,
    quiet_hours_end: quietHoursEnd ? `${quietHoursEnd}:00` : null,
    quiet_days: quietDays,
    timezone: "Asia/Tokyo",
    ...resetOnChange,
  });

  if (error) {
    return { error: "通知設定の保存に失敗しました。" };
  }

  revalidatePath("/settings/account/notifications");
  return { success: "通知設定を保存しました。" };
}
