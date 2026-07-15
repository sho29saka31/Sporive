"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type NotificationActionState = {
  error?: string;
  success?: string;
} | null;

/** 通知設定（当日予定通知のON/OFF・通知時刻）の保存 */
export async function saveNotificationSettings(
  _prevState: NotificationActionState,
  formData: FormData
): Promise<NotificationActionState> {
  const enabled = formData.get("daily_reminder_enabled") === "on";
  const debtEnabled = formData.get("debt_reminder_enabled") === "on";
  const notifyTime = String(formData.get("notify_time") ?? "");

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(notifyTime)) {
    return { error: "通知時刻を正しく入力してください。" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // last_notified_onをリセットすることで、設定変更後は（同日中でも）
  // 新しい通知時刻を過ぎた最初のcron実行で通知が送られる
  const { error } = await supabase.from("notification_settings").upsert({
    user_id: user.id,
    daily_reminder_enabled: enabled,
    debt_reminder_enabled: debtEnabled,
    notify_time: `${notifyTime}:00`,
    timezone: "Asia/Tokyo",
    last_notified_on: null,
  });

  if (error) {
    return { error: "通知設定の保存に失敗しました。" };
  }

  revalidatePath("/settings/account/notifications");
  return { success: "通知設定を保存しました。" };
}
