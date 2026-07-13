"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PRESETS = [
  { label: "7日", days: 7 },
  { label: "14日", days: 14 },
  { label: "30日", days: 30 },
  { label: "90日", days: 90 },
];

function daysAgo(base: string, n: number): string {
  const [y, m, d] = base.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - n);
  return dt.toISOString().slice(0, 10);
}

/** 管理者ダッシュボードの集計期間セレクタ（プリセット＋自由指定） */
export default function AdminRangeSelector({
  from,
  to,
  today,
}: {
  from: string;
  to: string;
  today: string;
}) {
  const router = useRouter();
  const [fromValue, setFromValue] = useState(from);
  const [toValue, setToValue] = useState(to);

  function apply(nextFrom: string, nextTo: string) {
    router.push(`/admin?from=${nextFrom}&to=${nextTo}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
      <span className="text-xs font-bold text-navy-500">集計期間</span>
      <div className="flex items-center gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.days}
            type="button"
            onClick={() => apply(daysAgo(today, preset.days - 1), today)}
            className="rounded-lg border border-navy-200 px-3 py-1.5 text-xs font-medium text-navy-600 hover:bg-navy-50"
          >
            直近{preset.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-navy-500">
        <input
          type="date"
          value={fromValue}
          max={toValue}
          onChange={(e) => setFromValue(e.target.value)}
          className="rounded-lg border border-navy-200 px-2 py-1.5"
        />
        〜
        <input
          type="date"
          value={toValue}
          min={fromValue}
          max={today}
          onChange={(e) => setToValue(e.target.value)}
          className="rounded-lg border border-navy-200 px-2 py-1.5"
        />
        <button
          type="button"
          onClick={() => apply(fromValue, toValue)}
          className="rounded-lg bg-navy-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-600"
        >
          適用
        </button>
      </div>
      <span className="text-[10px] text-navy-300">最大92日間</span>
    </div>
  );
}
