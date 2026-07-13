import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  addDays,
  getDayOfWeekOf,
  getTodayDate,
  getWeekStartDateOf,
} from "@/lib/week";

/**
 * 管理者ダッシュボード用の集計（Phase 9）。
 * 全利用者のデータを横断するため service_role クライアントで実行する
 * （呼び出し側で is_admin の確認を済ませていること）。
 *
 * 「アクティブ」の定義：その日にトレーニング実績（workout_logs）を記録した利用者。
 * 集計対象の期間 [from, to] は呼び出し側（画面の期間指定）から渡される。
 */

export type DateRange = { from: string; to: string };

export type AdminStats = {
  range: DateRange;
  totalUsers: number;
  dauSeries: { date: string; count: number }[];
  wauSeries: { weekStart: string; count: number }[];
  retentionRate: number | null; // 期間末尾の週の前週アクティブのうち、末尾の週もアクティブな割合（%）
  achievementSeries: {
    date: string;
    planned: number;
    done: number;
    rate: number | null; // %
  }[];
  debtSeries: { date: string; created: number }[];
  debtResolutionRate: number | null; // 期間内に発生した負債の解消率（%）
  totalDebts: number; // 期間内に発生した負債数
  popularExercises: { name: string; count: number }[]; // AI提案の頻出種目 上位10
  aiAcceptanceRate: number | null; // AI提案の採用率（%）
  aiProposalCount: number; // 期間内のAI提案ログ数
};

/** 期間の最大日数（クエリ量の上限） */
export const MAX_RANGE_DAYS = 92;
/** デフォルトの期間日数 */
export const DEFAULT_RANGE_DAYS = 14;

function eachDate(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    dates.push(d);
    if (dates.length > MAX_RANGE_DAYS) break;
  }
  return dates;
}

/** クエリパラメータから集計期間を決める（不正値はデフォルトに落とす） */
export function resolveDateRange(
  fromParam?: string,
  toParam?: string
): DateRange {
  const today = getTodayDate();
  const isDate = (v?: string): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

  let to = isDate(toParam) ? toParam : today;
  if (to > today) to = today;
  let from = isDate(fromParam) ? fromParam : addDays(to, -(DEFAULT_RANGE_DAYS - 1));
  if (from > to) from = addDays(to, -(DEFAULT_RANGE_DAYS - 1));
  if (eachDate(from, to).length > MAX_RANGE_DAYS) {
    from = addDays(to, -(MAX_RANGE_DAYS - 1));
  }
  return { from, to };
}

export async function getAdminStats(
  admin: SupabaseClient<Database>,
  range: DateRange
): Promise<AdminStats> {
  const { from, to } = range;
  const dates = eachDate(from, to);
  const today = getTodayDate();

  // 週の系列：fromを含む週の日曜〜toを含む週の日曜
  const weekStarts: string[] = [];
  for (
    let w = getWeekStartDateOf(from);
    w <= getWeekStartDateOf(to);
    w = addDays(w, 7)
  ) {
    weekStarts.push(w);
  }

  const logsFrom = weekStarts[0]; // 週集計のため期間先頭の週の日曜から取得

  const [
    { count: totalUsers },
    logsResult,
    plansResult,
    debtsResult,
    aiLogsResult,
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin
      .from("workout_logs")
      .select("user_id, performed_on, plan_item_id")
      .gte("performed_on", logsFrom)
      .lte("performed_on", to),
    admin
      .from("training_plans")
      .select("id, user_id, week_start_date")
      .eq("status", "active")
      .gte("week_start_date", weekStarts[0])
      .lte("week_start_date", weekStarts[weekStarts.length - 1]),
    admin
      .from("debts")
      .select("missed_on, resolved_at")
      .gte("missed_on", from)
      .lte("missed_on", to),
    admin
      .from("ai_proposal_logs")
      .select("proposal_json, accepted, created_at")
      .gte("created_at", `${from}T00:00:00+09:00`)
      .lte("created_at", `${to}T23:59:59+09:00`),
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

  // DAU
  const dauSeries: AdminStats["dauSeries"] = dates.map((date) => ({
    date,
    count: new Set(
      logs.filter((l) => l.performed_on === date).map((l) => l.user_id)
    ).size,
  }));

  // WAU とリテンション
  const weeklyUsers = weekStarts.map(
    (weekStart) =>
      new Set(
        logs
          .filter(
            (l) =>
              l.performed_on >= weekStart &&
              l.performed_on <= addDays(weekStart, 6)
          )
          .map((l) => l.user_id)
      )
  );
  const wauSeries: AdminStats["wauSeries"] = weekStarts.map(
    (weekStart, i) => ({ weekStart, count: weeklyUsers[i].size })
  );
  const prevWeekUsers = weeklyUsers[weeklyUsers.length - 2] ?? new Set();
  const lastWeekUsers = weeklyUsers[weeklyUsers.length - 1] ?? new Set();
  const retained = Array.from(prevWeekUsers).filter((u) =>
    lastWeekUsers.has(u)
  ).length;
  const retentionRate =
    prevWeekUsers.size > 0
      ? Math.round((retained / prevWeekUsers.size) * 100)
      : null;

  // 達成率
  const loggedItemKeySet = new Set(
    logs
      .filter((l) => l.plan_item_id)
      .map((l) => `${l.performed_on}:${l.plan_item_id}`)
  );
  const achievementSeries: AdminStats["achievementSeries"] = [];
  for (const date of dates) {
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

  // 負債（期間内の発生数と解消率）
  const debtSeries: AdminStats["debtSeries"] = dates.map((date) => ({
    date,
    created: debts.filter((d) => d.missed_on === date).length,
  }));
  const totalDebts = debts.length;
  const resolvedDebts = debts.filter((d) => d.resolved_at !== null).length;
  const debtResolutionRate =
    totalDebts > 0 ? Math.round((resolvedDebts / totalDebts) * 100) : null;

  // AI提案分析（期間内）
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
    range,
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
