import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { addDays, getDayOfWeekOf, getTodayDate, getWeekStartDateOf } from "@/lib/week";

/**
 * 管理者ダッシュボード用の集計（Phase 9）。
 * 全利用者のデータを横断するため service_role クライアントで実行する
 * （呼び出し側で is_admin の確認を済ませていること）。
 *
 * 「アクティブ」の定義：その日にトレーニング実績（workout_logs）を記録した利用者。
 */

export type AdminStats = {
  totalUsers: number;
  dauSeries: { date: string; count: number }[]; // 直近14日
  wauSeries: { weekStart: string; count: number }[]; // 直近8週
  retentionRate: number | null; // 先週アクティブのうち今週もアクティブな割合（%）
  achievementSeries: {
    date: string;
    planned: number;
    done: number;
    rate: number | null; // %
  }[]; // 直近14日
  debtSeries: { date: string; created: number }[]; // 直近14日
  debtResolutionRate: number | null; // 全期間の解消率（%）
  totalDebts: number;
  popularExercises: { name: string; count: number }[]; // AI提案の頻出種目 上位10
  aiAcceptanceRate: number | null; // AI提案の採用率（%）
  aiProposalCount: number;
};

const DAILY_RANGE = 14;
const WEEKLY_RANGE = 8;

export async function getAdminStats(
  admin: SupabaseClient<Database>
): Promise<AdminStats> {
  const today = getTodayDate();
  const dailyStart = addDays(today, -(DAILY_RANGE - 1));
  const currentWeekStart = getWeekStartDateOf(today);
  const weeklyStart = addDays(currentWeekStart, -7 * (WEEKLY_RANGE - 1));

  const [{ count: totalUsers }, logsResult, plansResult, debtsResult, aiLogsResult] =
    await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin
        .from("workout_logs")
        .select("user_id, performed_on, plan_item_id")
        .gte("performed_on", weeklyStart),
      admin
        .from("training_plans")
        .select("id, user_id, week_start_date")
        .eq("status", "active")
        .gte("week_start_date", addDays(dailyStart, -7)),
      admin.from("debts").select("missed_on, resolved_at"),
      admin.from("ai_proposal_logs").select("proposal_json, accepted"),
    ]);

  const logs = logsResult.data ?? [];
  const plans = plansResult.data ?? [];
  const debts = debtsResult.data ?? [];
  const aiLogs = aiLogsResult.data ?? [];

  const { data: planItems } =
    plans.length > 0
      ? await admin
          .from("plan_items")
          .select("id, plan_id, day_of_week")
          .in(
            "plan_id",
            plans.map((p) => p.id)
          )
      : { data: [] };
  const itemsByPlanId = new Map<string, { id: string; day_of_week: number }[]>();
  for (const item of planItems ?? []) {
    itemsByPlanId.set(item.plan_id, [
      ...(itemsByPlanId.get(item.plan_id) ?? []),
      item,
    ]);
  }

  // DAU（直近14日）
  const dauSeries: AdminStats["dauSeries"] = [];
  for (let i = 0; i < DAILY_RANGE; i++) {
    const date = addDays(dailyStart, i);
    const users = new Set(
      logs.filter((l) => l.performed_on === date).map((l) => l.user_id)
    );
    dauSeries.push({ date, count: users.size });
  }

  // WAU（直近8週）と今週/先週のアクティブユーザー（リテンション用）
  const wauSeries: AdminStats["wauSeries"] = [];
  const weeklyUsers: Set<string>[] = [];
  for (let i = 0; i < WEEKLY_RANGE; i++) {
    const weekStart = addDays(weeklyStart, i * 7);
    const weekEnd = addDays(weekStart, 6);
    const users = new Set(
      logs
        .filter((l) => l.performed_on >= weekStart && l.performed_on <= weekEnd)
        .map((l) => l.user_id)
    );
    weeklyUsers.push(users);
    wauSeries.push({ weekStart, count: users.size });
  }
  const lastWeekUsers = weeklyUsers[WEEKLY_RANGE - 2] ?? new Set();
  const thisWeekUsers = weeklyUsers[WEEKLY_RANGE - 1] ?? new Set();
  const retained = Array.from(lastWeekUsers).filter((u) =>
    thisWeekUsers.has(u)
  ).length;
  const retentionRate =
    lastWeekUsers.size > 0
      ? Math.round((retained / lastWeekUsers.size) * 100)
      : null;

  // 達成率（直近14日）：その日に予定されていた項目数に対する記録済み項目数
  const loggedItemKeySet = new Set(
    logs
      .filter((l) => l.plan_item_id)
      .map((l) => `${l.performed_on}:${l.plan_item_id}`)
  );
  const achievementSeries: AdminStats["achievementSeries"] = [];
  for (let i = 0; i < DAILY_RANGE; i++) {
    const date = addDays(dailyStart, i);
    if (date > today) break;
    const dow = getDayOfWeekOf(date);
    const weekStart = getWeekStartDateOf(date);
    let planned = 0;
    let done = 0;
    for (const plan of plans) {
      if (plan.week_start_date !== weekStart) continue;
      for (const item of itemsByPlanId.get(plan.id) ?? []) {
        if (item.day_of_week !== dow) continue;
        planned++;
        if (loggedItemKeySet.has(`${date}:${item.id}`)) done++;
      }
    }
    achievementSeries.push({
      date,
      planned,
      done,
      rate: planned > 0 ? Math.round((done / planned) * 100) : null,
    });
  }

  // 負債（直近14日の発生数と全期間の解消率）
  const debtSeries: AdminStats["debtSeries"] = [];
  for (let i = 0; i < DAILY_RANGE; i++) {
    const date = addDays(dailyStart, i);
    debtSeries.push({
      date,
      created: debts.filter((d) => d.missed_on === date).length,
    });
  }
  const totalDebts = debts.length;
  const resolvedDebts = debts.filter((d) => d.resolved_at !== null).length;
  const debtResolutionRate =
    totalDebts > 0 ? Math.round((resolvedDebts / totalDebts) * 100) : null;

  // AI提案分析：頻出種目（上位10）と採用率
  const exerciseCounts = new Map<string, number>();
  let accepted = 0;
  let judged = 0;
  for (const log of aiLogs) {
    const proposal = log.proposal_json as {
      items?: { exerciseName?: string }[];
    } | null;
    for (const item of proposal?.items ?? []) {
      if (!item.exerciseName) continue;
      exerciseCounts.set(
        item.exerciseName,
        (exerciseCounts.get(item.exerciseName) ?? 0) + 1
      );
    }
    if (log.accepted !== null) {
      judged++;
      if (log.accepted) accepted++;
    }
  }
  const popularExercises = Array.from(exerciseCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const aiAcceptanceRate =
    judged > 0 ? Math.round((accepted / judged) * 100) : null;

  return {
    totalUsers: totalUsers ?? 0,
    dauSeries,
    wauSeries,
    retentionRate,
    achievementSeries,
    debtSeries,
    debtResolutionRate,
    totalDebts,
    popularExercises,
    aiAcceptanceRate,
    aiProposalCount: aiLogs.length,
  };
}
