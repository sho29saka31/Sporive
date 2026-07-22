import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentWeekStartDate,
  getTodayDate,
  getTodayDayOfWeek,
} from "@/lib/week";
import WorkoutLogger, {
  type TodayExercise,
} from "@/components/home/WorkoutLogger";
import DebtList, { type DebtEntry } from "@/components/debts/DebtList";

export const metadata: Metadata = { title: "ホーム" };

/** ホームタブ：今日のトレーニング計画表示・実績記録（requirements.md §5, §6, §9-2） */
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const todayDayOfWeek = getTodayDayOfWeek();
  const today = getTodayDate();

  // 計画と負債は互いに依存しないため並列で取得する（読み込み速度対策）
  const [{ data: plan }, { data: debtRows }] = await Promise.all([
    supabase
      .from("training_plans")
      .select("id")
      .eq("user_id", user!.id)
      .eq("week_start_date", getCurrentWeekStartDate())
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("debts")
      .select("id, plan_item_id, missed_on, sets_remaining, reps_remaining")
      .eq("user_id", user!.id)
      .is("resolved_at", null)
      .order("missed_on", { ascending: true }),
  ]);

  // 「今日の計画項目→実績ログ」の連鎖と「負債の種目名」の連鎖は互いに依存しないため
  // 並列で取得する（読み込み速度対策）
  const [{ todayItems, todayLogs }, { debtItems }] = await Promise.all([
    (async () => {
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
              .select(
                "plan_item_id, sets_done, reps_done, weight_kg, duration_min"
              )
              .eq("user_id", user!.id)
              .eq("performed_on", today)
              .in("plan_item_id", planItemIds)
          : { data: null };

      return { todayItems, todayLogs };
    })(),
    (async () => {
      const debtItemIds = Array.from(
        new Set((debtRows ?? []).map((d) => d.plan_item_id).filter(Boolean))
      ) as string[];
      const { data: debtItems } =
        debtItemIds.length > 0
          ? await supabase
              .from("plan_items")
              .select("id, exercise_name")
              .in("id", debtItemIds)
          : { data: null };
      return { debtItems };
    })(),
  ]);

  const logsByPlanItemId = new Map(
    (todayLogs ?? []).map((log) => [log.plan_item_id, log])
  );

  const debtNameById = new Map(
    (debtItems ?? []).map((item) => [item.id, item.exercise_name])
  );
  const debts: DebtEntry[] = (debtRows ?? []).map((d) => ({
    id: d.id,
    exerciseName: d.plan_item_id
      ? debtNameById.get(d.plan_item_id) ?? "運動"
      : "運動",
    missedOn: d.missed_on,
    setsRemaining: d.sets_remaining,
    repsRemaining: d.reps_remaining,
  }));

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

      {debts.length > 0 && (
        <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-accent-coral">
              負債の補填（{debts.length}件）
            </h2>
            <Link href="/debts" className="text-xs text-navy-500 underline">
              負債管理へ
            </Link>
          </div>
          <p className="mt-1 text-xs text-navy-400">
            未達成分は今日の計画に上乗せして取り返しましょう。実施できたら「解消した」を押してください。
          </p>
          <div className="mt-2">
            <DebtList debts={debts} />
          </div>
        </div>
      )}
    </div>
  );
}
