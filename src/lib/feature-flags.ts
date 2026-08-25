import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * 機能フラグ（要件定義書 §10-3）。DBの feature_flags テーブルと対応する。
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
  "calendar_integration",
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
  client: SupabaseClient<Database>,
  keys: readonly K[]
): Promise<Record<K, boolean>> {
  const result = Object.fromEntries(keys.map((k) => [k, true])) as Record<
    K,
    boolean
  >;

  const { data } = await client
    .from("feature_flags")
    .select("key, enabled")
    .in("key", [...keys]);

  for (const row of data ?? []) {
    if ((keys as readonly string[]).includes(row.key)) {
      result[row.key as K] = row.enabled;
    }
  }

  return result;
}

/** 単一の機能フラグを取得する */
export async function getFeatureFlag(
  client: SupabaseClient<Database>,
  key: FeatureFlagKey
): Promise<boolean> {
  const flags = await getFeatureFlags(client, [key]);
  return flags[key];
}

/**
 * 緊急メンテナンスモード（要件定義書 §8-3, §10-3）が有効かどうか。
 * 未取得時は「無効」を既定値とする（他フラグと異なり、この値だけは
 * フェイルオープンにすると誤って全サイトを止めてしまうため）。
 */
export async function isEmergencyMaintenanceActive(
  client: SupabaseClient<Database>
): Promise<boolean> {
  const { data } = await client
    .from("feature_flags")
    .select("enabled")
    .eq("key", "emergency_maintenance")
    .maybeSingle();
  return data?.enabled ?? false;
}
