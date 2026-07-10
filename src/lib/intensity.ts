import {
  INTENSITY_THRESHOLDS,
  type AgeBandThreshold,
} from "@/config/intensity-thresholds";
import { DAY_LABELS } from "@/lib/week";
import type { PlanItemDraft } from "@/lib/gemini";

/**
 * 運動強度の妥当性検証（Phase 8）。
 * ルールベースの閾値チェックで、AI提案・手動計画の両方に適用する。
 * 判定理由（どの種目がどの基準を超えているか）を日本語で返し、利用者に明示する。
 * 閾値定義は src/config/intensity-thresholds.ts で管理。
 */

export type IntensityWarning = {
  dayOfWeek: number;
  exerciseName: string;
  reason: string;
};

function findBand(age: number): AgeBandThreshold {
  return (
    INTENSITY_THRESHOLDS.find((b) => age >= b.minAge && age <= b.maxAge) ??
    INTENSITY_THRESHOLDS[INTENSITY_THRESHOLDS.length - 1]
  );
}

/** 計画全体の負荷の目安（セット×回数の総量。重量は種目差が大きいため別途チェック） */
function totalVolume(items: PlanItemDraft[]): number {
  return items.reduce(
    (sum, item) => sum + (item.sets ?? 1) * (item.reps ?? 0),
    0
  );
}

export function validatePlanIntensity(params: {
  birthYear: number;
  items: PlanItemDraft[];
  /** 前週の計画項目（増加率チェック用。前週の計画がない場合はnull） */
  previousItems?: PlanItemDraft[] | null;
}): IntensityWarning[] {
  const age = new Date().getFullYear() - params.birthYear;
  const band = findBand(age);
  const warnings: IntensityWarning[] = [];

  // 1) 種目ごとの上限チェック（年齢層別）
  for (const item of params.items) {
    if (item.weightKg !== null && item.weightKg > band.maxWeightKg) {
      warnings.push({
        dayOfWeek: item.dayOfWeek,
        exerciseName: item.exerciseName,
        reason: `重量${item.weightKg}kgが${band.label}の上限（${band.maxWeightKg}kg）を超えています`,
      });
    }
    if (item.sets !== null && item.sets > band.maxSets) {
      warnings.push({
        dayOfWeek: item.dayOfWeek,
        exerciseName: item.exerciseName,
        reason: `${item.sets}セットが${band.label}の上限（${band.maxSets}セット）を超えています`,
      });
    }
    if (item.reps !== null && item.reps > band.maxReps) {
      warnings.push({
        dayOfWeek: item.dayOfWeek,
        exerciseName: item.exerciseName,
        reason: `${item.reps}回が${band.label}の上限（${band.maxReps}回）を超えています`,
      });
    }
  }

  // 2) 1日の合計運動時間の上限チェック
  for (let dow = 0; dow < 7; dow++) {
    const dayItems = params.items.filter((i) => i.dayOfWeek === dow);
    const dailyMin = dayItems.reduce(
      (sum, i) => sum + (i.durationMin ?? 0),
      0
    );
    if (dailyMin > band.maxDailyDurationMin) {
      warnings.push({
        dayOfWeek: dow,
        exerciseName: `${DAY_LABELS[dow]}曜日の合計`,
        reason: `1日の合計運動時間${dailyMin}分が${band.label}の上限（${band.maxDailyDurationMin}分）を超えています`,
      });
    }
  }

  // 3) 週あたりの増加率チェック（前週の計画がある場合のみ）
  const prev = params.previousItems;
  if (prev && prev.length > 0) {
    // 総量（セット×回数）の増加率
    const prevVolume = totalVolume(prev);
    const newVolume = totalVolume(params.items);
    if (
      prevVolume > 0 &&
      newVolume > prevVolume * band.maxWeeklyIncreaseRate
    ) {
      const ratePct = Math.round((band.maxWeeklyIncreaseRate - 1) * 100);
      const actualPct = Math.round((newVolume / prevVolume - 1) * 100);
      warnings.push({
        dayOfWeek: -1,
        exerciseName: "週全体",
        reason: `週全体の運動量（セット×回数）が前週比+${actualPct}%で、推奨増加率（+${ratePct}%以内）を超えています`,
      });
    }

    // 同名種目の重量の増加率
    const prevMaxWeightByName = new Map<string, number>();
    for (const item of prev) {
      if (item.weightKg !== null) {
        const current = prevMaxWeightByName.get(item.exerciseName) ?? 0;
        prevMaxWeightByName.set(
          item.exerciseName,
          Math.max(current, item.weightKg)
        );
      }
    }
    const reported = new Set<string>();
    for (const item of params.items) {
      const prevWeight = prevMaxWeightByName.get(item.exerciseName);
      if (
        prevWeight !== undefined &&
        prevWeight > 0 &&
        item.weightKg !== null &&
        item.weightKg > prevWeight * band.maxWeeklyIncreaseRate &&
        !reported.has(item.exerciseName)
      ) {
        reported.add(item.exerciseName);
        const ratePct = Math.round((band.maxWeeklyIncreaseRate - 1) * 100);
        warnings.push({
          dayOfWeek: item.dayOfWeek,
          exerciseName: item.exerciseName,
          reason: `重量が前週${prevWeight}kg→${item.weightKg}kgで、推奨増加率（+${ratePct}%以内）を超えています`,
        });
      }
    }
  }

  return warnings;
}
