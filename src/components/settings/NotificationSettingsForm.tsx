"use client";

import { useActionState } from "react";
import {
  saveNotificationSettings,
  type NotificationActionState,
} from "@/app/(user)/settings/account/notifications/actions";
import { DAY_LABELS } from "@/lib/week";

/** 通知時刻入力の刻み幅（秒）。配信判定がpg_cron 10分間隔のため合わせる */
const TIME_STEP_SECONDS = 600;

export type NotificationSettingsFormValues = {
  dailyReminderTime: string; // HH:MM
  debtReminderTime: string; // HH:MM
  reengagementEnabled: boolean;
  weeklyReportEnabled: boolean;
  weeklyReportTime: string; // HH:MM
  quietHoursStart: string | null; // HH:MM
  quietHoursEnd: string | null; // HH:MM
  quietDays: number[]; // 0=日曜〜6=土曜
};

/** 通知種別ごとの時刻・非通知時間帯/曜日の設定フォーム（要件定義書 §8-1） */
export default function NotificationSettingsForm({
  dailyReminderTime,
  debtReminderTime,
  reengagementEnabled,
  weeklyReportEnabled,
  weeklyReportTime,
  quietHoursStart,
  quietHoursEnd,
  quietDays,
}: NotificationSettingsFormValues) {
  const [state, formAction, isPending] = useActionState<
    NotificationActionState,
    FormData
  >(saveNotificationSettings, null);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div>
        <label
          htmlFor="daily_reminder_time"
          className="text-xs font-medium text-navy-500"
        >
          当日予定通知の時刻
        </label>
        <p className="mt-0.5 text-[10px] text-navy-300">
          トレーニング予定がある日に通知します（常時有効）
        </p>
        <input
          id="daily_reminder_time"
          name="daily_reminder_time"
          type="time"
          step={TIME_STEP_SECONDS}
          required
          defaultValue={dailyReminderTime}
          className="mt-1 w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:border-navy-500 focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="debt_reminder_time"
          className="text-xs font-medium text-navy-500"
        >
          負債リマインダーの時刻
        </label>
        <p className="mt-0.5 text-[10px] text-navy-300">
          未消化の負債がある場合に通知します（常時有効）
        </p>
        <input
          id="debt_reminder_time"
          name="debt_reminder_time"
          type="time"
          step={TIME_STEP_SECONDS}
          required
          defaultValue={debtReminderTime}
          className="mt-1 w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:border-navy-500 focus:outline-none"
        />
      </div>

      <label className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-navy-800">
            再エンゲージメント通知
          </span>
          <p className="mt-0.5 text-xs text-navy-400">
            3日以上記録がない場合、毎日17:00に通知します（時刻は固定）
          </p>
        </div>
        <input
          type="checkbox"
          name="reengagement_enabled"
          defaultChecked={reengagementEnabled}
          className="h-5 w-5 accent-navy-700"
        />
      </label>

      <div>
        <label className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-navy-800">
              週次レポート
            </span>
            <p className="mt-0.5 text-xs text-navy-400">
              毎週日曜、AIが1週間の振り返りを作成して通知します
            </p>
          </div>
          <input
            type="checkbox"
            name="weekly_report_enabled"
            defaultChecked={weeklyReportEnabled}
            className="h-5 w-5 accent-navy-700"
          />
        </label>
        <input
          id="weekly_report_time"
          name="weekly_report_time"
          type="time"
          step={TIME_STEP_SECONDS}
          required
          defaultValue={weeklyReportTime}
          className="mt-2 w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:border-navy-500 focus:outline-none"
        />
      </div>

      <p className="text-[10px] text-navy-300">
        時刻は10分単位で判定されます（例: 08:03 に設定すると 08:03〜08:12
        の間に送信）
      </p>

      <div className="border-t border-navy-100 pt-4">
        <h3 className="text-xs font-bold text-navy-500">非通知時間帯・曜日</h3>
        <p className="mt-0.5 text-[10px] text-navy-300">
          該当する時間帯・曜日の通知は送信をスキップします（後から追いかけて送信されません）
        </p>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="time"
            name="quiet_hours_start"
            step={TIME_STEP_SECONDS}
            defaultValue={quietHoursStart ?? ""}
            className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:border-navy-500 focus:outline-none"
          />
          <span className="text-xs text-navy-400">〜</span>
          <input
            type="time"
            name="quiet_hours_end"
            step={TIME_STEP_SECONDS}
            defaultValue={quietHoursEnd ?? ""}
            className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:border-navy-500 focus:outline-none"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {DAY_LABELS.map((label, dayOfWeek) => (
            <label
              key={dayOfWeek}
              className="flex items-center gap-1 rounded-lg border border-navy-200 px-2 py-1 text-xs text-navy-600"
            >
              <input
                type="checkbox"
                name="quiet_days"
                value={dayOfWeek}
                defaultChecked={quietDays.includes(dayOfWeek)}
                className="h-3.5 w-3.5 accent-navy-700"
              />
              {label}
            </label>
          ))}
        </div>
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
