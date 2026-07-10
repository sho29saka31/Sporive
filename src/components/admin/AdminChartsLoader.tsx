"use client";

import dynamic from "next/dynamic";

/**
 * recharts（+内部で使用するd3系ライブラリ）は管理者画面でのみ必要なため、
 * 動的インポートで管理者画面を開いたときだけ読み込む。
 */
const AdminCharts = dynamic(() => import("./AdminCharts"), {
  ssr: false,
  loading: () => (
    <p className="text-xs text-navy-300">グラフを読み込み中...</p>
  ),
});

export default AdminCharts;
