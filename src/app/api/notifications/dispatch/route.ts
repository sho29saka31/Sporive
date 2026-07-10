import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPush } from "@/lib/push";
import { processDailyCheck } from "@/lib/daily-check";
import { getCurrentWeekStartDate, getTodayDayOfWeek } from "@/lib/week";

const SLOT_MINUTES = 5;
/** 日次判定（負債記録・ストリーク更新）を実行するJSTスロット（03:00〜03:04） */
const DAILY_CHECK_SLOT_START = 3 * 60;

/** 現在のJST時刻を「その日の経過分数」で返す */
function getJstMinutesOfDay(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  const [h, m] = parts.split(":").map(Number);
  return h * 60 + m;
}

/** "HH:MM:SS" 形式の time 文字列を「その日の経過分数」に変換 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * 通知送信＋日次バッチのエンドポイント。GitHub Actions の scheduled workflow から
 * 5分おきに呼ばれる（CRON_SECRET で認証）。
 *
 * 1. 深夜の判定スロット（03:00）では、前日分の負債記録・ストリーク更新を実行（Phase 7）
 * 2. 現在の5分スロット内に notify_time を設定している利用者へ通知を送信
 *    - 当日予定通知（daily_reminder_enabled）：今日のトレーニング予定がある場合
 *    - 負債リマインダー（debt_reminder_enabled）：未消化の負債がある場合（Phase 7）
 *    両方ある場合は1通にまとめて送る。失効した購読（410/404）は削除する。
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const nowMinutes = getJstMinutesOfDay();
  const slotStart = Math.floor(nowMinutes / SLOT_MINUTES) * SLOT_MINUTES;

  // 日次判定（前日の負債記録・ストリーク更新）
  let dailyCheck: { debtsCreated: number; streaksUpdated: number } | null =
    null;
  if (slotStart === DAILY_CHECK_SLOT_START) {
    try {
      dailyCheck = await processDailyCheck(admin);
    } catch (error) {
      console.error("Daily check failed", error);
    }
  }

  const { data: settings, error: settingsError } = await admin
    .from("notification_settings")
    .select("user_id, notify_time, daily_reminder_enabled, debt_reminder_enabled")
    .or("daily_reminder_enabled.eq.true,debt_reminder_enabled.eq.true");

  if (settingsError) {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  const targets = (settings ?? []).filter((s) => {
    const t = timeToMinutes(s.notify_time);
    return t >= slotStart && t < slotStart + SLOT_MINUTES;
  });

  const weekStart = getCurrentWeekStartDate();
  const today = getTodayDayOfWeek();
  let sentCount = 0;

  for (const target of targets) {
    const bodyLines: string[] = [];

    if (target.daily_reminder_enabled) {
      const { data: plans } = await admin
        .from("training_plans")
        .select("id")
        .eq("user_id", target.user_id)
        .eq("week_start_date", weekStart)
        .eq("status", "active");

      if (plans && plans.length > 0) {
        const { data: todayItems } = await admin
          .from("plan_items")
          .select("id")
          .in(
            "plan_id",
            plans.map((p) => p.id)
          )
          .eq("day_of_week", today);

        const count = todayItems?.length ?? 0;
        if (count > 0) {
          bodyLines.push(
            `今日は${count}件のトレーニング予定があります。頑張りましょう！`
          );
        }
      }
    }

    if (target.debt_reminder_enabled) {
      const { data: debts } = await admin
        .from("debts")
        .select("id")
        .eq("user_id", target.user_id)
        .is("resolved_at", null);

      const debtCount = debts?.length ?? 0;
      if (debtCount > 0) {
        bodyLines.push(
          `未消化の負債が${debtCount}件あります。今日の分に上乗せして取り返しましょう。`
        );
      }
    }

    if (bodyLines.length === 0) continue;

    const { data: subscriptions } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", target.user_id);

    for (const sub of subscriptions ?? []) {
      const result = await sendPush(sub, {
        title: "Sporive",
        body: bodyLines.join("\n"),
        url: "/home",
      });
      if (result === "sent") {
        sentCount++;
      } else if (result === "expired") {
        await admin
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", sub.endpoint);
      }
    }
  }

  return NextResponse.json({ ok: true, sent: sentCount, dailyCheck });
}
