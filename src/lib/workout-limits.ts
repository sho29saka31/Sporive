/**
 * トレーニング実績の入力値の妥当範囲。
 * クライアント（入力欄のmin/max・保存前チェック）とサーバー（Server Action）の
 * 両方で同じ定義を使い、ありえない値（例：時間10000分）の保存を防ぐ。
 */
export const WORKOUT_LIMITS = {
  sets: { min: 1, max: 30, label: "セット数", unit: "セット", integer: true },
  reps: { min: 1, max: 200, label: "回数", unit: "回", integer: true },
  weightKg: { min: 0, max: 500, label: "重量", unit: "kg", integer: false },
  durationMin: { min: 1, max: 480, label: "時間", unit: "分", integer: true },
} as const;

type LimitKey = keyof typeof WORKOUT_LIMITS;

/**
 * 1項目の検証。null（未入力）は許可する。
 * 不正な場合は日本語のエラーメッセージ、正常ならnullを返す。
 */
export function validateWorkoutValue(
  key: LimitKey,
  value: number | null
): string | null {
  if (value === null) return null;
  const limit = WORKOUT_LIMITS[key];
  if (!Number.isFinite(value)) {
    return `${limit.label}の入力値が不正です。`;
  }
  if (limit.integer && !Number.isInteger(value)) {
    return `${limit.label}は整数で入力してください。`;
  }
  if (value < limit.min || value > limit.max) {
    return `${limit.label}は${limit.min}〜${limit.max}${limit.unit}の範囲で入力してください。`;
  }
  return null;
}

/** 実績入力ひとまとめの検証。最初に見つかったエラーを返す（正常ならnull） */
export function validateWorkoutInput(input: {
  setsDone: number | null;
  repsDone: number | null;
  weightKg: number | null;
  durationMin: number | null;
}): string | null {
  return (
    validateWorkoutValue("sets", input.setsDone) ??
    validateWorkoutValue("reps", input.repsDone) ??
    validateWorkoutValue("weightKg", input.weightKg) ??
    validateWorkoutValue("durationMin", input.durationMin)
  );
}
