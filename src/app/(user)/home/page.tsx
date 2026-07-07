import type { Metadata } from "next";

export const metadata: Metadata = { title: "ホーム" };

/** ホームタブ：今日のトレーニング実行画面・AI提案（Phase 3 で実装） */
export default function HomePage() {
  return (
    <div className="py-6">
      <h1 className="text-xl font-bold">今日のトレーニング</h1>
      <div className="mt-4 rounded-xl bg-white p-6 shadow-sm">
        <p className="text-sm leading-relaxed text-navy-400">
          AIによるトレーニング計画の提案機能は Phase 3 で実装予定です。
        </p>
      </div>
    </div>
  );
}
