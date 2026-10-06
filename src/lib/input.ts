import type { GenderType } from "@/types/database";

/** 入力欄の文字列を数値に変換する。空欄・数値でない値は null。 */
export function toNumberOrNull(value: string): number | null {
  if (value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// プロフィール入力（初回登録・設定変更）の検証で共通に使う値
export const MIN_AGE = 13;
export const GOAL_MAX_LENGTH = 500;
export const GENDER_TYPES: readonly GenderType[] = ["male", "female", "other"];

export function isGenderType(value: string): value is GenderType {
  return (GENDER_TYPES as readonly string[]).includes(value);
}
