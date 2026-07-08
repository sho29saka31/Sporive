import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWeekStartDate, getWeekDates, DAY_LABELS } from "@/lib/week";
import PlanBuilder from "@/components/schedule/PlanBuilder";
import type { PlanItemDraft } from "@/lib/gemini";

export const metadata: Metadata = { title: "スケジュール" };

/** スケジュールタブ：AI提案 or 手動でのトレーニング計画作成・週間予定・完了状態（requirements.md §5, §6, §9-2） */
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

  const weekStartDate = getCurrentWeekStartDate();
  const weekDates = getWeekDates(weekStartDate);

  const { data: existingPlan } = await supabase
    .from("training_plans")
    .select("id")
    .eq("user_id", user!.id)
    .eq("week_start_date", weekStartDate)
    .maybeSingle();

  let initialItems: PlanItemDraft[] = [];
  let overviewByDay: {
    id: string;
    exerciseName: string;
    isDone: boolean;
  }[][] = Array.from({ length: 7 }, () => []);

  if (existingPlan) {
    const { data: planItems } = await supabase
      .from("plan_items")
      .select(
        "id, day_of_week, exercise_name, category, sets, reps, weight_kg, duration_min"
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

    const planItemIds = (planItems ?? []).map((item) => item.id);
    const { data: weekLogs } =
      planItemIds.length > 0
        ? await supabase
            .from("workout_logs")
            .select("plan_item_id")
            .eq("user_id", user!.id)
            .in("plan_item_id", planItemIds)
            .gte("performed_on", weekDates[0])
            .lte("performed_on", weekDates[6])
        : { data: null };

    const loggedPlanItemIds = new Set(
      (weekLogs ?? []).map((log) => log.plan_item_id)
    );

    overviewByDay = Array.from({ length: 7 }, (_, dayOfWeek) =>
      (planItems ?? [])
        .filter((item) => item.day_of_week === dayOfWeek)
        .map((item) => ({
          id: item.id,
          exerciseName: item.exercise_name,
          isDone: loggedPlanItemIds.has(item.id),
        }))
    );
  }

  return (
    <div className="py-6">
      <h1 className="text-xl font-bold">週間スケジュール</h1>

      {existingPlan && (
        <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-navy-800">今週の予定</h2>
          <div className="mt-2 flex flex-col gap-2">
            {DAY_LABELS.map((label, dayOfWeek) => {
              const items = overviewByDay[dayOfWeek];
              const dateLabel = weekDates[dayOfWeek].slice(5).replace("-", "/");
              return (
                <div key={dayOfWeek} className="flex gap-2 text-xs">
                  <span className="w-12 shrink-0 font-bold text-navy-500">
                    {dateLabel}({label})
                  </span>
                  {items.length === 0 ? (
                    <span className="text-navy-300">休息日</span>
                  ) : (
                    <ul className="flex flex-1 flex-wrap gap-x-3 gap-y-1">
                      {items.map((item) => (
                        <li
                          key={item.id}
                          className={
                            item.isDone
                              ? "text-accent-teal"
                              : "text-navy-500"
                          }
                        >
                          {item.isDone ? "✓ " : "・"}
                          {item.exerciseName}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4">
        <PlanBuilder
          goal={profile?.goal ?? "lose_weight"}
          initialItems={initialItems}
        />
      </div>
    </div>
  );
}
