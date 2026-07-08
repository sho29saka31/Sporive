import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWeekStartDate, getTodayDate } from "@/lib/week";
import WorkoutLogger, {
  type TodayExercise,
} from "@/components/home/WorkoutLogger";

export const metadata: Metadata = { title: "ホーム" };

/** ホームタブ：今日のトレーニング計画表示・実績記録（requirements.md §5, §6, §9-2） */
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: plan } = await supabase
    .from("training_plans")
    .select("id")
    .eq("user_id", user!.id)
    .eq("week_start_date", getCurrentWeekStartDate())
    .eq("status", "active")
    .maybeSingle();

  const todayDayOfWeek = new Date().getDay();
  const today = getTodayDate();

  const { data: todayItems } = plan
    ? await supabase
        .from("plan_items")
        .select("id, exercise_name, sets, reps, weight_kg, duration_min")
        .eq("plan_id", plan.id)
        .eq("day_of_week", todayDayOfWeek)
        .order("sort_order")
    : { data: null };

  const planItemIds = (todayItems ?? []).map((item) => item.id);
  const { data: todayLogs } =
    planItemIds.length > 0
      ? await supabase
          .from("workout_logs")
          .select("plan_item_id, sets_done, reps_done, weight_kg, duration_min")
          .eq("user_id", user!.id)
          .eq("performed_on", today)
          .in("plan_item_id", planItemIds)
      : { data: null };

  const logsByPlanItemId = new Map(
    (todayLogs ?? []).map((log) => [log.plan_item_id, log])
  );

  const exercises: TodayExercise[] = (todayItems ?? []).map((item) => {
    const log = logsByPlanItemId.get(item.id);
    return {
      planItemId: item.id,
      exerciseName: item.exercise_name,
      plannedSets: item.sets,
      plannedReps: item.reps,
      plannedWeightKg: item.weight_kg,
      plannedDurationMin: item.duration_min,
      loggedSetsDone: log?.sets_done ?? null,
      loggedRepsDone: log?.reps_done ?? null,
      loggedWeightKg: log?.weight_kg ?? null,
      loggedDurationMin: log?.duration_min ?? null,
      isLogged: Boolean(log),
    };
  });

  return (
    <div className="py-6">
      <h1 className="text-xl font-bold">今日のトレーニング</h1>
      {!plan ? (
        <div className="mt-4 rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm leading-relaxed text-navy-400">
            今週の計画がまだありません。
            <Link href="/schedule" className="text-navy-600 underline">
              スケジュールタブ
            </Link>
            からAI提案または手動で作成してください。
          </p>
        </div>
      ) : exercises.length === 0 ? (
        <div className="mt-4 rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm leading-relaxed text-navy-400">
            今日は休息日です。無理せずゆっくり過ごしましょう。
          </p>
        </div>
      ) : (
        <div className="mt-4">
          <WorkoutLogger exercises={exercises} performedOn={today} />
        </div>
      )}
    </div>
  );
}
