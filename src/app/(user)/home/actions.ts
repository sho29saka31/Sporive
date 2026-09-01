"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateWorkoutInput } from "@/lib/workout-limits";
import { getTodayDate } from "@/lib/week";

export interface WorkoutLogInput {
  planItemId: string;
  performedOn: string;
  setsDone: number | null;
  repsDone: number | null;
  weightKg: number | null;
  durationMin: number | null;
}

/**
 * トレーニング実績を記録する。
 * 同じ利用者・plan_item・日付の記録がすでにあれば更新し、なければ新規作成する。
 * (user_id, plan_item_id, performed_on) の一意制約（0026マイグレーション）に
 * 対するupsertとして行うことで、連打・オフライン復帰時の再送等が短時間に
 * 重なっても重複行ができないようにする。
 */
export async function logWorkout(input: WorkoutLogInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("認証が必要です。");
  }

  const validationError = validateWorkoutInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  // ホーム画面には「今日」の実績しか記録できるUIがないため、Server Actionを
  // 直接呼び出して任意の日付（未来日・遠い過去日）に記録を改ざんできないよう、
  // 常にJST基準の当日のみ許可する
  if (input.performedOn !== getTodayDate()) {
    throw new Error("実施日が不正です。");
  }

  const { error } = await supabase.from("workout_logs").upsert(
    {
      user_id: user.id,
      plan_item_id: input.planItemId,
      performed_on: input.performedOn,
      sets_done: input.setsDone,
      reps_done: input.repsDone,
      weight_kg: input.weightKg,
      duration_min: input.durationMin,
    },
    { onConflict: "user_id,plan_item_id,performed_on" }
  );
  if (error) throw new Error("記録の保存に失敗しました。");

  revalidatePath("/home");
  revalidatePath("/schedule");
  revalidatePath("/progress");
}
