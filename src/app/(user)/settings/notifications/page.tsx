import type { Metadata } from "next";

export const metadata: Metadata = { title: "通知設定" };

/** 通知設定：Web Push の購読・通知時間帯の設定（Phase 5 で実装） */
export default function NotificationSettingsPage() {
  return (
    <div className="py-6">
      <h1 className="text-xl font-bold">通知設定</h1>
      <div className="mt-4 rounded-xl bg-white p-6 shadow-sm">
        <p className="text-sm leading-relaxed text-navy-400">
          トレーニング予定通知・時間帯指定などの設定は Phase 5 で実装予定です。
        </p>
      </div>
    </div>
  );
}
