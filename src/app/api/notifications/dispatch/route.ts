import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPush } from "@/lib/push";
import { getCurrentWeekStartDate, getTodayDayOfWeek } from "@/lib/week";

const SLOT_MINUTES = 5;

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
 * 通知送信エンドポイント。GitHub Actions の scheduled workflow から
 * 5分おきに呼ばれる（CRON_SECRET で認証）。
 *
 * 現在時刻が属する5分スロット内に notify_time を設定している利用者のうち、
 * 当日予定通知が有効で、かつ今日のトレーニング予定がある利用者へ
 * Web Push を送信する。失効した購読（410/404）は削除する。
 *
 * 負債リマインダー（debt_reminder_enabled）は Phase 7 で有効化する。
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // 現在の5分スロット [slotStart, slotStart + 5)
  const nowMinutes = getJstMinutesOfDay();
  const slotStart = Math.floor(nowMinutes / SLOT_MINUTES) * SLOT_MINUTES;

  const { data: settings, error: settingsError } = await admin
    .from("notification_settings")
    .select("user_id, notify_time, daily_reminder_enabled")
    .eq("daily_reminder_enabled", true);

  if (settingsError) {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  const targets = (settings ?? []).filter((s) => {
    const t = timeToMinutes(s.notify_time);
    return t >= slotStart && t < slotStart + SLOT_MINUTES;
  });

  if (targets.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const weekStart = getCurrentWeekStartDate();
  const today = getTodayDayOfWeek();
  let sentCount = 0;

  for (const target of targets) {
    // 今日のトレーニング予定があるか（今週のactiveな計画の当日項目）
    const { data: plans } = await admin
      .from("training_plans")
      .select("id")
      .eq("user_id", target.user_id)
      .eq("week_start_date", weekStart)
      .eq("status", "active");

    if (!plans || plans.length === 0) continue;

    const { data: todayItems } = await admin
      .from("plan_items")
      .select("id")
      .in(
        "plan_id",
        plans.map((p) => p.id)
      )
      .eq("day_of_week", today);

    const count = todayItems?.length ?? 0;
    if (count === 0) continue;

    const { data: subscriptions } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", target.user_id);

    for (const sub of subscriptions ?? []) {
      const result = await sendPush(sub, {
        title: "Sporive",
        body: `今日は${count}件のトレーニング予定があります。頑張りましょう！`,
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

  return NextResponse.json({ ok: true, sent: sentCount });
}
