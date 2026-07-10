"use client";

import { useActionState } from "react";
import {
  saveNotificationSettings,
  type NotificationActionState,
} from "@/app/(user)/settings/notifications/actions";

/** 当日予定通知・負債リマインダーのON/OFFと通知時刻の設定フォーム */
export default function NotificationSettingsForm({
  dailyReminderEnabled,
  debtReminderEnabled,
  notifyTime,
}: {
  dailyReminderEnabled: boolean;
  debtReminderEnabled: boolean;
  notifyTime: string; // HH:MM
}) {
  const [state, formAction, isPending] = useActionState<
    NotificationActionState,
    FormData
  >(saveNotificationSettings, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-navy-800">当日予定通知</span>
          <p className="mt-0.5 text-xs text-navy-400">
            トレーニング予定がある日に、指定時刻に通知します
          </p>
        </div>
        <input
          type="checkbox"
          name="daily_reminder_enabled"
          defaultChecked={dailyReminderEnabled}
          className="h-5 w-5 accent-navy-700"
        />
      </label>
      <label className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-navy-800">
            負債リマインダー
          </span>
          <p className="mt-0.5 text-xs text-navy-400">
            未消化の負債（未達成分）がある場合に、指定時刻に通知します
          </p>
        </div>
        <input
          type="checkbox"
          name="debt_reminder_enabled"
          defaultChecked={debtReminderEnabled}
          className="h-5 w-5 accent-navy-700"
        />
      </label>
      <div>
        <label htmlFor="notify_time" className="text-xs font-medium text-navy-500">
          通知時刻
        </label>
        <input
          id="notify_time"
          name="notify_time"
          type="time"
          required
          defaultValue={notifyTime}
          className="mt-1 w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:border-navy-500 focus:outline-none"
        />
        <p className="mt-1 text-[10px] text-navy-300">
          5分単位で判定されます（例: 08:00 に設定すると 08:00〜08:04 の間に送信）
        </p>
      </div>
      {state?.error && <p className="text-xs text-accent-coral">{state.error}</p>}
      {state?.success && <p className="text-xs text-accent-teal">{state.success}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-navy-700 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-navy-600 disabled:opacity-60"
      >
        {isPending ? "保存中..." : "設定を保存"}
      </button>
    </form>
  );
}
