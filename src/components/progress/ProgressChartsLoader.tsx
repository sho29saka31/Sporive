"use client";

import dynamic from "next/dynamic";

/**
 * recharts（+内部で使用するd3系ライブラリ）は進捗タブでのみ必要なため、
 * 動的インポートで進捗タブを開いたときだけ読み込む。
 * 他の画面（ホーム・スケジュール等）の初期バンドルサイズに影響しないようにする。
 */
const ProgressCharts = dynamic(() => import("./ProgressCharts"), {
  ssr: false,
  loading: () => (
    <p className="text-xs text-navy-300">グラフを読み込み中...</p>
  ),
});

export default ProgressCharts;
