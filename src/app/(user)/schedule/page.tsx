import type { Metadata } from "next";

export const metadata: Metadata = { title: "スケジュール" };

/** スケジュールタブ：週間トレーニング予定・カレンダー連携（Phase 3, 4, 6 で実装） */
export default function SchedulePage() {
  return (
    <div className="py-6">
      <h1 className="text-xl font-bold">週間スケジュール</h1>
      <div className="mt-4 rounded-xl bg-white p-6 shadow-sm">
        <p className="text-sm leading-relaxed text-navy-400">
          週間トレーニング予定とGoogleカレンダー連携は Phase 4・6 で実装予定です。
        </p>
      </div>
    </div>
  );
}
