"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWeekStartDate } from "@/lib/week";
import { syncPlanToCalendar, type CalendarDayPlan } from "@/lib/calendar";
import { getFeatureFlag } from "@/lib/feature-flags";
import type { PlanItemDraft, WeeklyPlanDraft } from "@/lib/gemini";
import { validateWorkoutValue } from "@/lib/workout-limits";

/** 種目1件をカレンダーの説明用テキストにする（例：スクワット（3セット×10回×45kg 20分）） */
function toExerciseLine(item: PlanItemDraft): string {
  const parts = [
    item.sets ? `${item.sets}セット` : null,
    item.reps ? `${item.reps}回` : null,
    item.weightKg ? `${item.weightKg}kg` : null,
  ].filter(Boolean);
  const detail =
    parts.join("×") + (item.durationMin ? ` ${item.durationMin}分` : "");
  return detail ? `${item.exerciseName}（${detail.trim()}）` : item.exerciseName;
}

/**
 * 確認済みの週間計画を保存する。
 * 同じ週にすでに計画がある場合は置き換える。保存処理全体は
 * upsert_training_plan（DB関数）に委譲し、単一トランザクションで行う
 * （旧計画の削除・新計画の作成・項目の入れ替えを別々のクエリで行うと、
 * 連打や複数タブでの同時保存時に計画が重複したり、編集のたびに全項目が
 * 新規IDで作り直されて当日の記録・負債との紐付けが失われたりするため）。
 */
export async function saveTrainingPlan(
  plan: WeeklyPlanDraft,
  source: "ai" | "manual",
  goal: string,
  accepted: boolean
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("認証が必要です。");
  }

  // AI改善案がまれに空配列を返した場合に、確認なく既存の週間計画を
  // 空で上書きしてしまわないようにする
  if (plan.items.length === 0) {
    throw new Error("計画に運動が1件もありません。");
  }

  for (const item of plan.items) {
    // AI改善案（suggestion）はクライアント側の入力フォームの検証を経由しないため、
    // 種目名の空文字チェックはここでも必須で行う
    if (!item.exerciseName.trim()) {
      throw new Error("種目名が空の項目があります。");
    }
    const invalid =
      validateWorkoutValue("sets", item.sets) ??
      validateWorkoutValue("reps", item.reps) ??
      validateWorkoutValue("weightKg", item.weightKg) ??
      validateWorkoutValue("durationMin", item.durationMin);
    if (invalid) {
      throw new Error(invalid);
    }
  }

  const weekStartDate = getCurrentWeekStartDate();

  const { data: result, error: rpcError } = await supabase
    .rpc("upsert_training_plan", {
      p_week_start_date: weekStartDate,
      p_status: "active",
      p_source: source,
      p_summary: plan.summary || null,
      p_items: plan.items.map((item, index) => ({
        day_of_week: item.dayOfWeek,
        exercise_name: item.exerciseName,
        category: item.category,
        sets: item.sets,
        reps: item.reps,
        weight_kg: item.weightKg,
        duration_min: item.durationMin,
        sort_order: index,
      })),
    })
    .single();

  if (rpcError) {
    throw new Error("計画の保存に失敗しました。");
  }
  if (result?.conflict) {
    throw new Error(
      "他の操作と競合しました。画面を更新してもう一度お試しください。"
    );
  }

  await supabase.from("ai_proposal_logs").insert({
    user_id: user.id,
    goal,
    proposal_json: plan,
    accepted,
  });

  // カレンダー連携済みならトレーニング予定をGoogleカレンダーへ自動追加（Phase 6）。
  // Google APIとの通信は数秒かかることがあるため、after()でレスポンス返却後に実行し、
  // 保存ボタンの待ち時間を短くする（同期失敗は計画保存の成功を妨げない）。
  const calendarIntegrationEnabled = await getFeatureFlag(
    supabase,
    "calendar_integration"
  );
  const { data: calendarToken } = calendarIntegrationEnabled
    ? await supabase
        .from("calendar_tokens")
        .select("refresh_token")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };
  if (calendarToken) {
    const byDay = new Map<number, string[]>();
    for (const item of plan.items) {
      byDay.set(item.dayOfWeek, [
        ...(byDay.get(item.dayOfWeek) ?? []),
        toExerciseLine(item),
      ]);
    }
    const dayPlans: CalendarDayPlan[] = Array.from(byDay.entries()).map(
      ([dayOfWeek, exerciseLines]) => ({ dayOfWeek, exerciseLines })
    );
    after(async () => {
      try {
        await syncPlanToCalendar(
          calendarToken.refresh_token,
          weekStartDate,
          dayPlans
        );
      } catch (error) {
        console.error("Calendar sync failed", error);
      }
    });
  }

  revalidatePath("/schedule");
  revalidatePath("/home");
}
