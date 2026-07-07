import type { Metadata } from "next";

export const metadata: Metadata = { title: "進捗" };

/** 進捗タブ：トレーニングログ・連続達成記録（Phase 4 で実装） */
export default function ProgressPage() {
  return (
    <div className="py-6">
      <h1 className="text-xl font-bold">進捗</h1>
      <div className="mt-4 rounded-xl bg-white p-6 shadow-sm">
        <p className="text-sm leading-relaxed text-navy-400">
          セット数・重量・回数のログと連続達成記録は Phase 4 で実装予定です。
        </p>
      </div>
    </div>
  );
}
