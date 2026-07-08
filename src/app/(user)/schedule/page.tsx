import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWeekStartDate } from "@/lib/week";
import PlanBuilder from "@/components/schedule/PlanBuilder";
import type { PlanItemDraft } from "@/lib/gemini";

export const metadata: Metadata = { title: "スケジュール" };

/** スケジュールタブ：AI提案 or 手動でのトレーニング計画作成・週間予定（requirements.md §5, §6, §9-2） */
export default async function SchedulePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("goal")
    .eq("id", user!.id)
    .single();

  const { data: existingPlan } = await supabase
    .from("training_plans")
    .select("id")
    .eq("user_id", user!.id)
    .eq("week_start_date", getCurrentWeekStartDate())
    .maybeSingle();

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
      <h1 className="text-xl font-bold">週間スケジュール</h1>
      <div className="mt-4">
        <PlanBuilder
          goal={profile?.goal ?? "lose_weight"}
          initialItems={initialItems}
        />
      </div>
    </div>
  );
}
