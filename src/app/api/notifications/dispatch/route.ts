import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPush } from "@/lib/push";
import { processDailyCheck } from "@/lib/daily-check";
import {
  getCurrentWeekStartDate,
  getTodayDate,
  getTodayDayOfWeek,
} from "@/lib/week";

/** 日次判定（負債記録・ストリーク更新）を実行するJST時間帯（03:00〜08:59） */
const DAILY_CHECK_START_MIN = 3 * 60;
const DAILY_CHECK_END_MIN = 9 * 60;

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
 * GitHub Actionsのcronは5分間隔を保証せず、混雑時は数十分以上遅延することがある。
 * そのため「現在の5分スロットとnotify_timeの一致」ではなく、
 * 「notify_timeを過ぎていて、今日まだ通知していない利用者」へ送信する方式にする
 * （last_notified_onで同日の重複送信を防ぐ）。遅延しても、遅延後の最初の実行で
 * 必ず通知が届く。
 *
 * 1. JST 03:00〜08:59の実行では、前日分の負債記録・ストリーク更新も実行（冪等）
 * 2. 通知の内容：
 *    - 当日予定通知（daily_reminder_enabled）：今日のトレーニング予定がある場合
 *    - 負債リマインダー（debt_reminder_enabled）：未消化の負債がある場合
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
  const today = getTodayDate();

  // 日次判定（前日の負債記録・ストリーク更新）。処理自体が冪等なので
  // 時間帯内の複数回実行でも問題ない
  let dailyCheck: { debtsCreated: number; streaksUpdated: number } | null =
    null;
  if (
    nowMinutes >= DAILY_CHECK_START_MIN &&
    nowMinutes < DAILY_CHECK_END_MIN
  ) {
    try {
      dailyCheck = await processDailyCheck(admin);
    } catch (error) {
      console.error("Daily check failed", error);
    }
  }

  const { data: settings, error: settingsError } = await admin
    .from("notification_settings")
    .select(
      "user_id, notify_time, daily_reminder_enabled, debt_reminder_enabled, last_notified_on"
    )
    .or("daily_reminder_enabled.eq.true,debt_reminder_enabled.eq.true");

  if (settingsError) {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  // 通知時刻を過ぎていて、今日まだ通知判定をしていない利用者
  const targets = (settings ?? []).filter(
    (s) =>
      timeToMinutes(s.notify_time) <= nowMinutes &&
      s.last_notified_on !== today
  );

  const weekStart = getCurrentWeekStartDate();
  const todayDow = getTodayDayOfWeek();
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
          .eq("day_of_week", todayDow);

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

    // 送る内容がない日も「判定済み」として記録し、同日の再判定を防ぐ
    await admin
      .from("notification_settings")
      .update({ last_notified_on: today })
      .eq("user_id", target.user_id);

    if (bodyLines.length === 0) continue;

    const { data: subscriptions } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", target.user_id);

    const body = bodyLines.join("\n");
    let deliveredToUser = false;

    for (const sub of subscriptions ?? []) {
      const result = await sendPush(sub, {
        title: "Sporive",
        body,
        url: "/home",
      });
      if (result === "sent") {
        sentCount++;
        deliveredToUser = true;
      } else if (result === "expired") {
        await admin
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", sub.endpoint);
      }
    }

    // 履歴表示（/settings/notifications）用に、実際に届いた通知の内容を記録する
    if (deliveredToUser) {
      await admin.from("notification_logs").insert({
        user_id: target.user_id,
        title: "Sporive",
        body,
      });
    }
  }

  return NextResponse.json({ ok: true, sent: sentCount, dailyCheck });
}
