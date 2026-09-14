import { createInfraReadOnlyClient } from "@/lib/supabase/infra";

/**
 * 機能フラグ（要件定義書 §10-3）。saka2931-infra（adacの管理画面が書き込む）の
 * feature_flags テーブルと対応する。フラグの作成・編集・削除はadacの管理画面から
 * 行う（Sporive自身のadmin/settingsからは削除済み）。
 * 「AI機能」マスタースイッチは各AI機能フラグと組み合わせて判定する
 * （マスターOFF、または個別機能OFFのいずれかで停止）。
 */
export const FEATURE_FLAG_KEYS = [
  "ai_master",
  "ai_weekly_proposal",
  "ai_improvement_suggestion",
  "ai_recovery_advice",
  "ai_goal_summarize",
  "intensity_check",
  "new_signup",
  "notifications",
  "emergency_maintenance",
  "debt_management",
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

/**
 * 指定したキーの機能フラグをまとめて取得する。
 * 行が存在しない・取得に失敗した場合は「有効」を既定値とする
 * （フラグは障害時等の一時停止手段のため、取得できないことで機能が
 * 誤って止まらないようフェイルオープンにする）。
 */
export async function getFeatureFlags<K extends string>(
  keys: readonly K[]
): Promise<Record<K, boolean>> {
  const result = Object.fromEntries(keys.map((k) => [k, true])) as Record<
    K,
    boolean
  >;

  const infra = createInfraReadOnlyClient();
  const { data } = await infra
    .from("feature_flags")
    .select("key, enabled")
    .eq("service", "sporive")
    .in("key", [...keys]);

  for (const row of data ?? []) {
    if ((keys as readonly string[]).includes(row.key)) {
      result[row.key as K] = row.enabled;
    }
  }

  return result;
}

/** 単一の機能フラグを取得する */
export async function getFeatureFlag(key: FeatureFlagKey): Promise<boolean> {
  const flags = await getFeatureFlags([key]);
  return flags[key];
}

/**
 * 緊急メンテナンスモード（要件定義書 §8-3, §10-3）が有効かどうか。
 * 未取得時は「無効」を既定値とする（他フラグと異なり、この値だけは
 * フェイルオープンにすると誤って全サイトを止めてしまうため）。
 */
export async function isEmergencyMaintenanceActive(): Promise<boolean> {
  const infra = createInfraReadOnlyClient();
  const { data } = await infra
    .from("feature_flags")
    .select("enabled")
    .eq("service", "sporive")
    .eq("key", "emergency_maintenance")
    .maybeSingle();
  return data?.enabled ?? false;
}
