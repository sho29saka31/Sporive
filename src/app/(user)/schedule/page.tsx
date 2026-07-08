import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWeekStartDate, getWeekDates, DAY_LABELS } from "@/lib/week";

export const metadata: Metadata = { title: "スケジュール" };

const SOURCE_LABELS: Record<string, string> = {
  ai: "AI提案",
  manual: "手動作成",
};

/** スケジュールタブ：登録済みの週間予定の表示（requirements.md §5, §6, §9-2） */
export default async function SchedulePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const weekStartDate = getCurrentWeekStartDate();
  const weekDates = getWeekDates(weekStartDate);

  const { data: existingPlan } = await supabase
    .from("training_plans")
    .select("id, source, summary")
    .eq("user_id", user!.id)
    .eq("week_start_date", weekStartDate)
    .maybeSingle();

  if (!existingPlan) {
    redirect("/schedule/edit");
  }

  const { data: planItems } = await supabase
    .from("plan_items")
    .select(
      "id, day_of_week, exercise_name, category, sets, reps, weight_kg, duration_min"
    )
    .eq("plan_id", existingPlan.id)
    .order("day_of_week")
    .order("sort_order");

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

  const itemsByDay = Array.from({ length: 7 }, (_, dayOfWeek) =>
    (planItems ?? []).filter((item) => item.day_of_week === dayOfWeek)
  );

  return (
    <div className="py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">週間スケジュール</h1>
        <Link
          href="/schedule/edit"
          className="rounded-lg border border-navy-200 px-3 py-1.5 text-xs font-medium text-navy-600 hover:bg-navy-50"
        >
          編集する
        </Link>
      </div>

      {existingPlan.summary && (
        <p className="mt-4 rounded-xl bg-navy-50 p-3 text-xs text-navy-600">
          {existingPlan.summary}
        </p>
      )}

      <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-navy-800">今週の予定</h2>
        <div className="mt-2 flex flex-col gap-2">
          {DAY_LABELS.map((label, dayOfWeek) => {
            const items = itemsByDay[dayOfWeek];
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
                          loggedPlanItemIds.has(item.id)
                            ? "text-accent-teal"
                            : "text-navy-500"
                        }
                      >
                        {loggedPlanItemIds.has(item.id) ? "✓ " : "・"}
                        {item.exercise_name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-navy-800">詳細情報</h2>
          {existingPlan.source && (
            <span className="rounded-full bg-navy-50 px-2 py-0.5 text-[10px] font-medium text-navy-500">
              {SOURCE_LABELS[existingPlan.source] ?? existingPlan.source}
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-col gap-4">
          {DAY_LABELS.map((label, dayOfWeek) => {
            const items = itemsByDay[dayOfWeek];
            if (items.length === 0) return null;
            return (
              <div key={dayOfWeek}>
                <p className="text-xs font-bold text-navy-500">{label}曜日</p>
                <div className="mt-1 flex flex-col gap-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-navy-100 p-2 text-xs"
                    >
                      <p className="font-medium text-navy-800">
                        {item.exercise_name}
                        {item.category && (
                          <span className="ml-1 text-navy-300">
                            （{item.category}）
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-navy-400">
                        {item.sets ? `${item.sets}セット` : ""}
                        {item.reps ? ` × ${item.reps}回` : ""}
                        {item.weight_kg ? ` × ${item.weight_kg}kg` : ""}
                        {item.duration_min ? ` ${item.duration_min}分` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
