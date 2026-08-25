"use client";

import { useTransition } from "react";
import { toggleFeatureFlag } from "@/app/admin/settings/actions";

export type FeatureFlagRow = {
  key: string;
  enabled: boolean;
  description: string;
};

const GROUP_LABELS: Record<string, string> = {
  ai_master: "AI機能（マスタースイッチ）",
  ai_weekly_proposal: "　週間AI提案",
  ai_improvement_suggestion: "　AI改善提案",
  ai_recovery_advice: "　リカバリー提案",
  ai_goal_summarize: "　目標の自由記述要約",
  intensity_check: "運動強度チェック",
  new_signup: "新規ユーザー登録",
  notifications: "通知機能全体",
  calendar_integration: "Googleカレンダー連携",
  emergency_maintenance: "緊急メンテナンスモード",
  debt_management: "負債管理機能",
};

/** フラグ一覧の表示順（機能タブの並び、要件定義書 §10-3の表の順） */
const DISPLAY_ORDER = [
  "ai_master",
  "ai_weekly_proposal",
  "ai_improvement_suggestion",
  "ai_recovery_advice",
  "ai_goal_summarize",
  "intensity_check",
  "new_signup",
  "notifications",
  "calendar_integration",
  "emergency_maintenance",
  "debt_management",
];

function Toggle({
  flag,
  indent,
}: {
  flag: FeatureFlagRow;
  indent: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(checked: boolean) {
    startTransition(async () => {
      await toggleFeatureFlag(flag.key, checked);
    });
  }

  const isEmergency = flag.key === "emergency_maintenance";

  return (
    <div
      className={`flex items-center justify-between gap-4 border-b border-navy-100 py-3 last:border-0 ${
        indent ? "pl-6" : ""
      }`}
    >
      <div>
        <p className="text-sm font-medium text-navy-800">
          {GROUP_LABELS[flag.key] ?? flag.key}
          {isEmergency && flag.enabled && (
            <span className="ml-2 rounded-full bg-accent-coral px-2 py-0.5 text-[10px] font-bold text-white">
              稼働中
            </span>
          )}
        </p>
        <p className="mt-0.5 text-xs text-navy-400">{flag.description}</p>
      </div>
      <label className="relative inline-flex shrink-0 cursor-pointer items-center">
        <input
          type="checkbox"
          checked={flag.enabled}
          disabled={isPending}
          onChange={(e) => handleChange(e.target.checked)}
          className="peer sr-only"
        />
        <div
          className={`h-6 w-11 rounded-full transition-colors peer-checked:bg-navy-700 ${
            isEmergency ? "bg-accent-coral/30" : "bg-navy-200"
          } peer-disabled:opacity-60`}
        />
        <div className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
      </label>
    </div>
  );
}

/** 機能タブ：サイト機能の一括ON/OFFトグル（要件定義書 §10-3） */
export default function FeatureFlagsPanel({
  flags,
}: {
  flags: FeatureFlagRow[];
}) {
  const byKey = new Map(flags.map((f) => [f.key, f]));
  const ordered = DISPLAY_ORDER.map((key) => byKey.get(key)).filter(
    (f): f is FeatureFlagRow => Boolean(f)
  );

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <p className="text-xs leading-relaxed text-navy-400">
        AI機能はマスタースイッチと個別機能のいずれかがOFFの場合に停止します。緊急メンテナンスモードは有効にすると即座にサイト全体（管理者画面を除く）がメンテナンス状態になります。
      </p>
      <div className="mt-2">
        {ordered.map((flag) => (
          <Toggle
            key={flag.key}
            flag={flag}
            indent={flag.key.startsWith("ai_") && flag.key !== "ai_master"}
          />
        ))}
      </div>
    </div>
  );
}
