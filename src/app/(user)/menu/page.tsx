import type { Metadata } from "next";

export const metadata: Metadata = { title: "すべて" };

/** すべてタブ：負債管理などその他機能への一覧アクセス（Phase 7 以降で拡充） */
export default function MenuPage() {
  return (
    <div className="py-6">
      <h1 className="text-xl font-bold">すべて</h1>
      <div className="mt-4 rounded-xl bg-white p-6 shadow-sm">
        <p className="text-sm leading-relaxed text-navy-400">
          負債管理などの機能一覧は Phase 7 以降で追加予定です。
        </p>
      </div>
    </div>
  );
}
