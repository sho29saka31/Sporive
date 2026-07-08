import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWeekStartDate } from "@/lib/week";

export const metadata: Metadata = { title: "ホーム" };

/** ホームタブ：今日のトレーニング計画表示（requirements.md §5, §9-2） */
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

  const { data: todayItems } = plan
    ? await supabase
        .from("plan_items")
        .select("id, exercise_name, sets, reps, weight_kg, duration_min")
        .eq("plan_id", plan.id)
        .eq("day_of_week", todayDayOfWeek)
        .order("sort_order")
    : { data: null };

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
      ) : !todayItems || todayItems.length === 0 ? (
        <div className="mt-4 rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm leading-relaxed text-navy-400">
            今日は休息日です。無理せずゆっくり過ごしましょう。
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {todayItems.map((item) => (
            <div
              key={item.id}
              className="rounded-xl bg-white p-4 shadow-sm"
            >
              <p className="text-sm font-bold text-navy-800">
                {item.exercise_name}
              </p>
              <p className="mt-1 text-xs text-navy-400">
                {item.sets ? `${item.sets}セット` : ""}
                {item.reps ? ` × ${item.reps}回` : ""}
                {item.weight_kg ? ` × ${item.weight_kg}kg` : ""}
                {item.duration_min ? ` ${item.duration_min}分` : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
