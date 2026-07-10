import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  addDays,
  getDayOfWeekOf,
  getWeekStartDateOf,
  getYesterdayDate,
} from "@/lib/week";

/**
 * 日次判定（Phase 7）：前日の計画と実績を突き合わせて
 * - 未達成分を debts（負債）に記録する
 * - streaks（連続達成記録）を更新する
 *
 * 通知dispatchと同じcron経路（GitHub Actions → /api/notifications/dispatch）から、
 * 1日1回（深夜の判定スロット）に service_role クライアントで呼ばれる。
 * 同じ日に複数回呼ばれても二重登録しないよう冪等に作る。
 */
export async function processDailyCheck(
  admin: SupabaseClient<Database>
): Promise<{ debtsCreated: number; streaksUpdated: number }> {
  const yesterday = getYesterdayDate();
  const dow = getDayOfWeekOf(yesterday);
  const weekStart = getWeekStartDateOf(yesterday);

  const { data: plans } = await admin
    .from("training_plans")
    .select("id, user_id")
    .eq("week_start_date", weekStart)
    .eq("status", "active");

  let debtsCreated = 0;
  let streaksUpdated = 0;

  for (const plan of plans ?? []) {
    const { data: items } = await admin
      .from("plan_items")
      .select("id, exercise_name, sets, reps")
      .eq("plan_id", plan.id)
      .eq("day_of_week", dow);

    // 昨日が休息日ならストリークは変化させない（休息日は連続を切らない）
    if (!items || items.length === 0) continue;

    const { data: logs } = await admin
      .from("workout_logs")
      .select("plan_item_id, sets_done, reps_done")
      .eq("user_id", plan.user_id)
      .eq("performed_on", yesterday)
      .in(
        "plan_item_id",
        items.map((i) => i.id)
      );

    const logByItemId = new Map(
      (logs ?? []).map((log) => [log.plan_item_id, log])
    );

    // すでに昨日分の負債を登録済みならスキップ（冪等性）
    const { data: existingDebts } = await admin
      .from("debts")
      .select("id")
      .eq("user_id", plan.user_id)
      .eq("missed_on", yesterday)
      .limit(1);
    const alreadyProcessed = (existingDebts?.length ?? 0) > 0;

    let allAchieved = true;

    for (const item of items) {
      const log = logByItemId.get(item.id);
      const setsRemaining = item.sets
        ? Math.max(0, item.sets - (log?.sets_done ?? 0))
        : 0;
      const repsRemaining = item.reps
        ? Math.max(0, item.reps - (log?.reps_done ?? 0))
        : 0;
      const missed = !log || setsRemaining > 0 || repsRemaining > 0;

      if (missed) {
        allAchieved = false;
        // セット/回数ベースで補填できる負債のみ記録する
        // （時間のみの種目で記録がない場合は補填量を表現できないため対象外）
        if (setsRemaining > 0 || repsRemaining > 0) {
          if (!alreadyProcessed) {
            const { error } = await admin.from("debts").insert({
              user_id: plan.user_id,
              plan_item_id: item.id,
              missed_on: yesterday,
              sets_remaining: setsRemaining,
              reps_remaining: repsRemaining,
            });
            if (!error) debtsCreated++;
          }
        }
      }
    }

    // ストリーク更新（同日再実行時も同じ結果になる冪等な計算）
    const { data: streak } = await admin
      .from("streaks")
      .select("current_streak, longest_streak, last_achieved_on")
      .eq("user_id", plan.user_id)
      .maybeSingle();

    if (allAchieved) {
      if (streak?.last_achieved_on === yesterday) continue; // 既に反映済み
      // 直近の達成が「一昨日以前の直近トレーニング日」かどうかは休息日を挟む場合の
      // 判定が複雑になるため、シンプルに「前回達成日から7日以内なら継続」とする
      const continued =
        streak?.last_achieved_on != null &&
        streak.last_achieved_on >= addDays(yesterday, -7);
      const current = continued ? (streak?.current_streak ?? 0) + 1 : 1;
      const longest = Math.max(current, streak?.longest_streak ?? 0);
      await admin.from("streaks").upsert({
        user_id: plan.user_id,
        current_streak: current,
        longest_streak: longest,
        last_achieved_on: yesterday,
      });
      streaksUpdated++;
    } else {
      if ((streak?.current_streak ?? 0) !== 0) {
        await admin.from("streaks").upsert({
          user_id: plan.user_id,
          current_streak: 0,
          longest_streak: streak?.longest_streak ?? 0,
          last_achieved_on: streak?.last_achieved_on ?? null,
        });
        streaksUpdated++;
      }
    }
  }

  return { debtsCreated, streaksUpdated };
}
