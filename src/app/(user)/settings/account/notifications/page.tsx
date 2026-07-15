import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import PushSubscriptionToggle from "@/components/settings/PushSubscriptionToggle";
import NotificationSettingsForm from "@/components/settings/NotificationSettingsForm";
import SettingsHeader from "@/components/settings/SettingsHeader";

export const metadata: Metadata = { title: "通知設定" };

/** 通知設定：Web Push の購読と当日予定通知の設定（requirements.md §7） */
export default async function AccountNotificationSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: settings } = await supabase
    .from("notification_settings")
    .select("daily_reminder_enabled, debt_reminder_enabled, notify_time")
    .eq("user_id", user!.id)
    .maybeSingle();

  const notifyTime = (settings?.notify_time ?? "08:00:00").slice(0, 5);

  return (
    <div className="py-6">
      <SettingsHeader title="通知" />

      <div className="mt-4 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-navy-800">プッシュ通知</h2>
        <div className="mt-3">
          <PushSubscriptionToggle />
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-navy-800">通知内容</h2>
        <div className="mt-3">
          <NotificationSettingsForm
            dailyReminderEnabled={settings?.daily_reminder_enabled ?? true}
            debtReminderEnabled={settings?.debt_reminder_enabled ?? false}
            notifyTime={notifyTime}
          />
        </div>
      </div>

      <p className="mt-4 px-1 text-[10px] leading-relaxed text-navy-300">
        通知を受け取るには「この端末で通知を受け取る」を有効にした上で、受け取りたい通知をONにしてください。送信した通知の内容は
        通知履歴（ヘッダーのベルアイコン）から確認できます。
      </p>
    </div>
  );
}
