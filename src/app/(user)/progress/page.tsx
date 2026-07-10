import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import ProgressCharts from "@/components/progress/ProgressChartsLoader";
import type { DailyProgressPoint } from "@/components/progress/ProgressCharts";

export const metadata: Metadata = { title: "進捗" };

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/** 進捗タブ：トレーニングログ・グラフ・頻度表示（requirements.md §6, §9-2） */
export default async function ProgressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const since = daysAgo(30);

  const { data: streak } = await supabase
    .from("streaks")
    .select("current_streak, longest_streak")
    .eq("user_id", user!.id)
    .maybeSingle();

  const { data: logs } = await supabase
    .from("workout_logs")
    .select(
      "id, plan_item_id, performed_on, sets_done, reps_done, weight_kg, duration_min"
    )
    .eq("user_id", user!.id)
    .gte("performed_on", since)
    .order("performed_on", { ascending: false });

  const planItemIds = Array.from(
    new Set((logs ?? []).map((log) => log.plan_item_id).filter(Boolean))
  ) as string[];

  const { data: planItems } =
    planItemIds.length > 0
      ? await supabase
          .from("plan_items")
          .select("id, exercise_name")
          .in("id", planItemIds)
      : { data: null };

  const exerciseNameById = new Map(
    (planItems ?? []).map((item) => [item.id, item.exercise_name])
  );

  const dailyMap = new Map<
    string,
    { totalReps: number; weightSum: number; weightCount: number }
  >();
  for (const log of logs ?? []) {
    const entry = dailyMap.get(log.performed_on) ?? {
      totalReps: 0,
      weightSum: 0,
      weightCount: 0,
    };
    entry.totalReps += log.reps_done ?? 0;
    if (log.weight_kg !== null) {
      entry.weightSum += log.weight_kg;
      entry.weightCount += 1;
    }
    dailyMap.set(log.performed_on, entry);
  }

  const chartData: DailyProgressPoint[] = Array.from(dailyMap.entries())
    .map(([date, entry]) => ({
      date,
      totalReps: entry.totalReps,
      avgWeightKg:
        entry.weightCount > 0
          ? Math.round((entry.weightSum / entry.weightCount) * 10) / 10
          : null,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const distinctDaysLast7 = new Set(
    (logs ?? [])
      .filter((log) => log.performed_on >= daysAgo(6))
      .map((log) => log.performed_on)
  ).size;

  const distinctDaysLast30 = dailyMap.size;

  return (
    <div className="py-6">
      <h1 className="text-xl font-bold">進捗</h1>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-navy-400">連続達成</p>
          <p className="mt-1 text-2xl font-bold text-accent-teal">
            {streak?.current_streak ?? 0}
            <span className="text-sm font-normal text-navy-400">日</span>
          </p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-navy-400">最長記録</p>
          <p className="mt-1 text-2xl font-bold text-navy-800">
            {streak?.longest_streak ?? 0}
            <span className="text-sm font-normal text-navy-400">日</span>
          </p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-navy-400">今週のトレーニング日数</p>
          <p className="mt-1 text-2xl font-bold text-navy-800">
            {distinctDaysLast7}
            <span className="text-sm font-normal text-navy-400">日</span>
          </p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-navy-400">過去30日の頻度</p>
          <p className="mt-1 text-2xl font-bold text-navy-800">
            {distinctDaysLast30}
            <span className="text-sm font-normal text-navy-400">日</span>
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-navy-800">推移グラフ</h2>
        <div className="mt-3">
          <ProgressCharts data={chartData} />
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-navy-800">記録一覧</h2>
        {!logs || logs.length === 0 ? (
          <p className="mt-2 text-sm leading-relaxed text-navy-400">
            まだ記録がありません。ホームタブから実績を記録しましょう。
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {logs.map((log) => (
              <li
                key={log.id}
                className="flex items-center justify-between border-b border-navy-100 pb-2 text-xs last:border-0"
              >
                <div>
                  <span className="font-bold text-navy-700">
                    {log.performed_on.slice(5).replace("-", "/")}
                  </span>
                  <span className="ml-2 text-navy-500">
                    {log.plan_item_id
                      ? exerciseNameById.get(log.plan_item_id) ?? "運動"
                      : "運動"}
                  </span>
                </div>
                <div className="text-navy-400">
                  {log.sets_done ? `${log.sets_done}セット` : ""}
                  {log.reps_done ? ` × ${log.reps_done}回` : ""}
                  {log.weight_kg ? ` × ${log.weight_kg}kg` : ""}
                  {log.duration_min ? ` ${log.duration_min}分` : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
