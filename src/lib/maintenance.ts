import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getJstMinutesOfDay } from "@/lib/week";
import { isEmergencyMaintenanceActive } from "@/lib/feature-flags";

/**
 * 定期メンテナンスモード（要件定義書 §8-3）。
 * 毎日1:00〜2:30はお知らせバーで予告し、2:30〜3:30はトップページ以外への
 * アクセス・ログインを不可にして、Supabase側の定期クリーンアップジョブ
 * （§8-2）に書き込み負荷を集中させないようにする。
 */
const NOTICE_START_MIN = 1 * 60; // 1:00
const LOCKDOWN_START_MIN = 2 * 60 + 30; // 2:30
const LOCKDOWN_END_MIN = 3 * 60 + 30; // 3:30

/** 予告バーを表示すべき時間帯か（ロックダウン中は予告ではなく実施中のため対象外） */
export function isMaintenanceNoticeTime(nowMinutes: number): boolean {
  return nowMinutes >= NOTICE_START_MIN && nowMinutes < LOCKDOWN_START_MIN;
}

/** トップページ以外へのアクセス・ログインを不可にすべき時間帯か */
export function isMaintenanceLockdownTime(nowMinutes: number): boolean {
  return nowMinutes >= LOCKDOWN_START_MIN && nowMinutes < LOCKDOWN_END_MIN;
}

/** 現在時刻（JST）での定期メンテナンス状態をまとめて返す（予告バー用。時刻ベースのみ） */
export function getMaintenanceState(): {
  isNotice: boolean;
  isLockdown: boolean;
} {
  const nowMinutes = getJstMinutesOfDay();
  return {
    isNotice: isMaintenanceNoticeTime(nowMinutes),
    isLockdown: isMaintenanceLockdownTime(nowMinutes),
  };
}

/**
 * 実際にロックダウン中かどうか（定期メンテナンスの時間帯、または
 * super-adminが機能フラグで有効にした緊急メンテナンスモードのいずれか）。
 * トップページの表示分岐は、middlewareのロックダウン判定（emergency_maintenance
 * フラグを含む）と一致させる必要があるため、時刻のみで判定するgetMaintenanceState()
 * とは別に、DB照会を伴うこちらを使う。
 */
export async function isLockdownActive(
  supabase: SupabaseClient<Database>
): Promise<boolean> {
  if (isMaintenanceLockdownTime(getJstMinutesOfDay())) return true;
  return isEmergencyMaintenanceActive(supabase);
}
