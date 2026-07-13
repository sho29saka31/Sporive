import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminStats, resolveDateRange } from "@/lib/admin-stats";

/**
 * 管理者向けデータエクスポート（CSV）。
 * type:
 *   summary      日別サマリー（DAU・予定数・記録数・達成率・負債発生数）
 *   workout_logs 実績ログの明細
 *   debts        負債の明細
 *   ai_proposals AI提案ログの明細
 * from/to: 期間（YYYY-MM-DD。ダッシュボードの期間指定と同じ解決ルール）
 *
 * is_adminの利用者のみ利用可能。ExcelでのUTF-8日本語表示のためBOM付きで返す。
 */

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers, ...rows].map((row) =>
    row.map(csvEscape).join(",")
  );
  return "﻿" + lines.join("\r\n");
}

function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("unauthorized", { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) {
    return new Response("forbidden", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "summary";
  const range = resolveDateRange(
    searchParams.get("from") ?? undefined,
    searchParams.get("to") ?? undefined
  );
  const admin = createAdminClient();
  const suffix = `${range.from}_${range.to}`;

  // user_id → 表示名の対応表（明細エクスポートで使用）
  async function getDisplayNames(): Promise<Map<string, string>> {
    const { data } = await admin.from("profiles").select("id, display_name");
    return new Map((data ?? []).map((p) => [p.id, p.display_name]));
  }

  if (type === "summary") {
    const stats = await getAdminStats(admin, range);
    const achievementByDate = new Map(
      stats.achievementSeries.map((a) => [a.date, a])
    );
    const debtsByDate = new Map(stats.debtSeries.map((d) => [d.date, d]));
    const rows = stats.dauSeries.map((d) => {
      const a = achievementByDate.get(d.date);
      return [
        d.date,
        d.count,
        a?.planned ?? "",
        a?.done ?? "",
        a?.rate ?? "",
        debtsByDate.get(d.date)?.created ?? 0,
      ];
    });
    return csvResponse(
      `sporive_summary_${suffix}.csv`,
      toCsv(
        ["日付", "DAU", "予定項目数", "記録済み項目数", "達成率(%)", "負債発生数"],
        rows
      )
    );
  }

  if (type === "workout_logs") {
    const [{ data: logs }, names] = await Promise.all([
      admin
        .from("workout_logs")
        .select(
          "user_id, plan_item_id, performed_on, sets_done, reps_done, weight_kg, duration_min, note"
        )
        .gte("performed_on", range.from)
        .lte("performed_on", range.to)
        .order("performed_on", { ascending: true }),
      getDisplayNames(),
    ]);
    const itemIds = Array.from(
      new Set((logs ?? []).map((l) => l.plan_item_id).filter(Boolean))
    ) as string[];
    const { data: items } =
      itemIds.length > 0
        ? await admin
            .from("plan_items")
            .select("id, exercise_name")
            .in("id", itemIds)
        : { data: [] };
    const nameById = new Map(
      (items ?? []).map((i) => [i.id, i.exercise_name])
    );
    const rows = (logs ?? []).map((l) => [
      l.performed_on,
      names.get(l.user_id) ?? l.user_id,
      l.plan_item_id ? nameById.get(l.plan_item_id) ?? "" : "",
      l.sets_done,
      l.reps_done,
      l.weight_kg,
      l.duration_min,
      l.note,
    ]);
    return csvResponse(
      `sporive_workout_logs_${suffix}.csv`,
      toCsv(
        ["日付", "利用者", "種目", "セット数", "回数", "重量(kg)", "時間(分)", "メモ"],
        rows
      )
    );
  }

  if (type === "debts") {
    const [{ data: debts }, names] = await Promise.all([
      admin
        .from("debts")
        .select(
          "user_id, plan_item_id, missed_on, sets_remaining, reps_remaining, resolved_at"
        )
        .gte("missed_on", range.from)
        .lte("missed_on", range.to)
        .order("missed_on", { ascending: true }),
      getDisplayNames(),
    ]);
    const itemIds = Array.from(
      new Set((debts ?? []).map((d) => d.plan_item_id).filter(Boolean))
    ) as string[];
    const { data: items } =
      itemIds.length > 0
        ? await admin
            .from("plan_items")
            .select("id, exercise_name")
            .in("id", itemIds)
        : { data: [] };
    const nameById = new Map(
      (items ?? []).map((i) => [i.id, i.exercise_name])
    );
    const rows = (debts ?? []).map((d) => [
      d.missed_on,
      names.get(d.user_id) ?? d.user_id,
      d.plan_item_id ? nameById.get(d.plan_item_id) ?? "" : "",
      d.sets_remaining,
      d.reps_remaining,
      d.resolved_at ? "解消済み" : "未消化",
      d.resolved_at ?? "",
    ]);
    return csvResponse(
      `sporive_debts_${suffix}.csv`,
      toCsv(
        ["未達成日", "利用者", "種目", "残セット数", "残回数", "状態", "解消日時"],
        rows
      )
    );
  }

  if (type === "ai_proposals") {
    const [{ data: aiLogs }, names] = await Promise.all([
      admin
        .from("ai_proposal_logs")
        .select("user_id, goal, accepted, created_at, proposal_json")
        .gte("created_at", `${range.from}T00:00:00+09:00`)
        .lte("created_at", `${range.to}T23:59:59+09:00`)
        .order("created_at", { ascending: true }),
      getDisplayNames(),
    ]);
    const rows = (aiLogs ?? []).map((l) => {
      const proposal = l.proposal_json as {
        items?: { exerciseName?: string }[];
      } | null;
      const exercises = (proposal?.items ?? [])
        .map((i) => i.exerciseName)
        .filter(Boolean)
        .join(" / ");
      return [
        l.created_at,
        names.get(l.user_id) ?? l.user_id,
        l.goal,
        l.accepted === null ? "" : l.accepted ? "採用" : "不採用",
        exercises,
      ];
    });
    return csvResponse(
      `sporive_ai_proposals_${suffix}.csv`,
      toCsv(["日時", "利用者", "目標", "採用", "提案種目"], rows)
    );
  }

  return new Response("invalid type", { status: 400 });
}
