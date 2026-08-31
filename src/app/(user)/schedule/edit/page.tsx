import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWeekStartDate } from "@/lib/week";
import PlanBuilder from "@/components/schedule/PlanBuilder";
import type { PlanItemDraft } from "@/lib/gemini";

export const metadata: Metadata = { title: "スケジュール編集" };

// このページから呼ばれるsaveTrainingPlan（Server Action）は、保存後に
// syncPlanToCalendar（アクセストークン取得＋既存イベント削除＋新規イベント作成で
// 最大十数回の逐次外部HTTPリクエスト）をafter()内で実行することがあり、
// Vercel無料プランの既定タイムアウト（10秒）では不足しうる。
// Server Actionのmaxduration設定は呼び出し元のpage.tsx/layout.tsxからのみ
// 有効なため（actions.ts等の"use server"ファイルへの直接指定は無効）、ここで指定する
export const maxDuration = 45;

/** スケジュール編集画面：AI提案 or 手動でのトレーニング計画作成・編集（requirements.md §5, §6, §9-2） */
export default async function ScheduleEditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const weekStartDate = getCurrentWeekStartDate();

  // profileとexistingPlanは互いに依存しないため並列に取得する
  const [{ data: profile }, { data: existingPlan }] = await Promise.all([
    supabase.from("profiles").select("goal").eq("id", user!.id).single(),
    supabase
      .from("training_plans")
      .select("id")
      .eq("user_id", user!.id)
      .eq("week_start_date", weekStartDate)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  let initialItems: PlanItemDraft[] = [];
  if (existingPlan) {
    const { data: planItems } = await supabase
      .from("plan_items")
      .select(
        "day_of_week, exercise_name, category, sets, reps, weight_kg, duration_min"
      )
      .eq("plan_id", existingPlan.id)
      .order("sort_order");

    initialItems = (planItems ?? []).map((item) => ({
      dayOfWeek: item.day_of_week,
      exerciseName: item.exercise_name,
      category: item.category,
      sets: item.sets,
      reps: item.reps,
      weightKg: item.weight_kg,
      durationMin: item.duration_min,
    }));
  }

  return (
    <div className="py-6">
      <h1 className="text-xl font-bold">週間スケジュールを編集</h1>
      <div className="mt-4">
        <PlanBuilder
          goal={profile?.goal ?? ""}
          initialItems={initialItems}
        />
      </div>
    </div>
  );
}
