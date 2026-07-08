import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWeekStartDate } from "@/lib/week";
import PlanBuilder from "@/components/schedule/PlanBuilder";
import type { PlanItemDraft } from "@/lib/gemini";

export const metadata: Metadata = { title: "スケジュール編集" };

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
          goal={profile?.goal ?? "lose_weight"}
          initialItems={initialItems}
        />
      </div>
    </div>
  );
}
