import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPush } from "@/lib/push";
import { processDailyCheck } from "@/lib/daily-check";
import { generateWeeklyReport } from "@/lib/gemini";
import { getFeatureFlags, isEmergencyMaintenanceActive } from "@/lib/feature-flags";
import {
  addDays,
  getCurrentWeekStartDate,
  getJstMinutesOfDay,
  getTodayDate,
  getTodayDayOfWeek,
} from "@/lib/week";

// pg_net側のリクエストタイムアウト（15秒、supabase/migrations/0009_notify_pg_cron.sql）より
// 先にVercel関数がkillされないよう、Hobbyプランの上限（60秒）内で余裕を持たせる
export const maxDuration = 20;

/**
 * 日次判定（負債記録・ストリーク更新）を実行するJST時間帯（03:30〜08:59）。
 * 定期メンテナンスのロックダウン窓（2:30〜3:30、src/lib/maintenance.ts）は
 * Supabase側の定期クリーンアップジョブに書き込みを専念させる目的のため、
 * 全アクティブ利用者分の書き込みを伴うこのバッチと時間帯が重ならないよう
 * ロックダウン終了後に開始する
 */
const DAILY_CHECK_START_MIN = 3 * 60 + 30;
const DAILY_CHECK_END_MIN = 9 * 60;

/** 再エンゲージメント通知の送信時刻（固定、要件定義書 §8-1） */
const REENGAGEMENT_TIME_MIN = 17 * 60;

/** 週次レポートの送信曜日（0=日曜、固定、要件定義書 §8-1） */
const WEEKLY_REPORT_DAY_OF_WEEK = 0;

/** "HH:MM:SS" 形式の time 文字列を「その日の経過分数」に変換 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** 非通知時間帯・非通知曜日（要件定義書 §8-1）に該当するかどうか */
function isQuietTime(
  nowMinutes: number,
  todayDow: number,
  quietHoursStart: string | null,
  quietHoursEnd: string | null,
  quietDays: number[]
): boolean {
  if (quietDays.includes(todayDow)) return true;
  if (!quietHoursStart || !quietHoursEnd) return false;
  const start = timeToMinutes(quietHoursStart);
  const end = timeToMinutes(quietHoursEnd);
  // 日をまたぐ範囲（例: 22:00〜翌7:00）にも対応する
  return start <= end
    ? nowMinutes >= start && nowMinutes < end
    : nowMinutes >= start || nowMinutes < end;
}

/**
 * 通知送信＋日次バッチのエンドポイント。Supabase pg_cron + pg_net から
 * 10分おきに呼ばれる（CRON_SECRET で認証）。
 *
 * pg_cronは厳密な間隔を保証するものではないため、「現在の10分スロットと時刻の一致」
 * ではなく、「指定時刻を過ぎていて、今日まだその種別を通知判定していない利用者」へ
 * 送信する方式にする。種別ごとに時刻が異なる（要件定義書 §8-1）ため、
 * 判定済みフラグ（*_last_notified_on）も種別ごとに独立して持つ。
 *
 * 1. JST 03:00〜08:59の実行では、前日分の負債記録・ストリーク更新も実行（冪等）
 * 2. 通知種別：
 *    - 当日予定通知：常時有効。今日のトレーニング予定がある場合
 *    - 負債リマインダー：常時有効。未消化の負債がある場合
 *    - 再エンゲージメント通知：17:00固定。3日以上記録がない場合
 *    - 週次レポート：日曜固定。Geminiで1週間の振り返りを生成
 *    複数該当する場合は1通にまとめて送る。失効した購読（410/404）は削除する。
 *    非通知時間帯・非通知曜日に該当する場合は、いずれの種別も送信をスキップする
 *    （判定済みとして記録し、後追い送信はしない）。
 */
/** タイミング攻撃対策の定数時間比較（長さが異なる場合は即falseを返す） */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (
    !cronSecret ||
    !authHeader ||
    !safeEqual(authHeader, `Bearer ${cronSecret}`)
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // 緊急メンテナンスモード（要件定義書 §8-3, §10-3）中は、日次判定（負債記録・
  // ストリーク更新）・通知送信のいずれも行わない。super-adminが全サイトを
  // 止めている間もこのバッチだけ動き続けると、利用者に見せない画面の裏側で
  // 負債やストリークの状態が変わってしまい、メンテナンス解除後の状態と
  // 利用者の認識がずれるため
  if (await isEmergencyMaintenanceActive(admin)) {
    return NextResponse.json({ ok: true, sent: 0, dailyCheck: null, skipped: "emergency_maintenance" });
  }

  const nowMinutes = getJstMinutesOfDay();
  const today = getTodayDate();
  const todayDow = getTodayDayOfWeek();

  // 機能フラグ（要件定義書 §10-3）：通知機能全体・負債管理機能の一括停止に対応。
  // ai_masterは週次レポート生成（Gemini呼び出し）に使う。他のAI機能同様、
  // Gemini API障害・混雑時にsuper-adminが一括停止できる対象に含める
  const flags = await getFeatureFlags(admin, [
    "notifications",
    "debt_management",
    "ai_master",
  ]);

  // 日次判定（前日の負債記録・ストリーク更新）。処理自体が冪等なので
  // 時間帯内の複数回実行でも問題ない
  let dailyCheck: { debtsCreated: number; streaksUpdated: number } | null =
    null;
  if (
    nowMinutes >= DAILY_CHECK_START_MIN &&
    nowMinutes < DAILY_CHECK_END_MIN
  ) {
    try {
      dailyCheck = await processDailyCheck(admin, {
        debtManagementEnabled: flags.debt_management,
      });
    } catch (error) {
      console.error("Daily check failed", error);
    }
  }

  // 通知機能全体が停止中の場合は、判定済みフラグの更新も含めて何もしない
  // （再開後、次回cronで通常通り通知判定が行われる）
  if (!flags.notifications) {
    return NextResponse.json({ ok: true, sent: 0, dailyCheck });
  }

  const { data: settings, error: settingsError } = await admin
    .from("notification_settings")
    .select(
      "user_id, daily_reminder_time, debt_reminder_time, reengagement_enabled, weekly_report_enabled, weekly_report_time, quiet_hours_start, quiet_hours_end, quiet_days, daily_last_notified_on, debt_last_notified_on, reengagement_last_notified_on, weekly_report_last_notified_on"
    );

  if (settingsError) {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  const weekStart = getCurrentWeekStartDate();
  let sentCount = 0;

  for (const target of settings ?? []) {
    const quiet = isQuietTime(
      nowMinutes,
      todayDow,
      target.quiet_hours_start,
      target.quiet_hours_end,
      target.quiet_days
    );

    const bodyLines: string[] = [];
    const notifiedUpdate: Partial<{
      daily_last_notified_on: string;
      debt_last_notified_on: string;
      reengagement_last_notified_on: string;
      weekly_report_last_notified_on: string;
    }> = {};

    // 当日予定通知（常時有効）。quiet中でも「判定済み」は記録し、後追い送信を防ぐ
    if (
      timeToMinutes(target.daily_reminder_time) <= nowMinutes &&
      target.daily_last_notified_on !== today
    ) {
      if (!quiet) {
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
      notifiedUpdate.daily_last_notified_on = today;
    }

    // 負債リマインダー（常時有効）。quiet中・負債管理機能停止中でも
    // 「判定済み」は記録し、後追い送信を防ぐ
    if (
      timeToMinutes(target.debt_reminder_time) <= nowMinutes &&
      target.debt_last_notified_on !== today
    ) {
      if (!quiet && flags.debt_management) {
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
      notifiedUpdate.debt_last_notified_on = today;
    }

    // 再エンゲージメント通知（17:00固定）。quiet中でも「判定済み」は記録し、後追い送信を防ぐ
    if (
      target.reengagement_enabled &&
      REENGAGEMENT_TIME_MIN <= nowMinutes &&
      target.reengagement_last_notified_on !== today
    ) {
      if (!quiet) {
        const threeDaysAgo = addDays(today, -2);
        const { data: recentLogs } = await admin
          .from("workout_logs")
          .select("id")
          .eq("user_id", target.user_id)
          .gte("performed_on", threeDaysAgo)
          .limit(1);

        if (!recentLogs || recentLogs.length === 0) {
          bodyLines.push(
            "3日以上トレーニング記録がありません。無理のない範囲で再開しましょう！"
          );
        }
      }
      notifiedUpdate.reengagement_last_notified_on = today;
    }

    // 週次レポート（日曜固定）。quiet中でも「判定済み」は記録し、後追い送信を防ぐ
    if (
      target.weekly_report_enabled &&
      todayDow === WEEKLY_REPORT_DAY_OF_WEEK &&
      timeToMinutes(target.weekly_report_time) <= nowMinutes &&
      target.weekly_report_last_notified_on !== today
    ) {
      let reportFailed = false;
      if (!quiet && flags.ai_master) {
        try {
          const { data: profile } = await admin
            .from("profiles")
            .select("birth_year, goal, gender")
            .eq("id", target.user_id)
            .single();

          if (profile) {
            const weekAgo = addDays(today, -6);
            const { data: weekLogs } = await admin
              .from("workout_logs")
              .select("performed_on, sets_done")
              .eq("user_id", target.user_id)
              .gte("performed_on", weekAgo);

            const distinctDays = new Set(
              (weekLogs ?? []).map((l) => l.performed_on)
            ).size;
            const totalSets = (weekLogs ?? []).reduce(
              (sum, l) => sum + (l.sets_done ?? 0),
              0
            );

            const report = await generateWeeklyReport({
              birthYear: profile.birth_year,
              goal: profile.goal,
              gender: profile.gender,
              summaryLines: [
                `実施日数: ${distinctDays}日`,
                `合計セット数: ${totalSets}セット`,
              ],
            });
            bodyLines.push(`【今週の振り返り】\n${report}`);
          }
        } catch (error) {
          console.error("Weekly report generation failed", error);
          reportFailed = true;
        }
      }
      // 生成失敗時は「通知済み」を記録せず、同日中の次回cron実行で
      // リトライできるようにする（非通知時間帯によるスキップは既存どおり記録する）
      if (!reportFailed) {
        notifiedUpdate.weekly_report_last_notified_on = today;
      }
    }

    if (Object.keys(notifiedUpdate).length > 0) {
      await admin
        .from("notification_settings")
        .update(notifiedUpdate)
        .eq("user_id", target.user_id);
    }

    if (bodyLines.length === 0) continue;

    const { data: subscriptions } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", target.user_id);

    const body = bodyLines.join("\n\n");
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
