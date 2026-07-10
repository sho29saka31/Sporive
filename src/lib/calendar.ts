import { DAY_LABELS, getWeekDates } from "@/lib/week";

/**
 * Google Calendar API ヘルパー（Phase 6）。
 * Phase 1 のOAuth時に保存した refresh token（calendar_tokens）でアクセストークンを取得し、
 * - freebusy: 今週の忙しい時間帯を取得してAI提案のプロンプトに反映
 * - events: 計画確定時にトレーニング予定をカレンダーへ自動追加
 * を行う。googleapisパッケージは使わず、REST APIを直接fetchする（バンドル軽量化）。
 */

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";
const JST = "Asia/Tokyo";

async function getAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET が設定されていません。"
    );
  }

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error("Googleアクセストークンの取得に失敗しました。");
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new Error("Googleアクセストークンの取得に失敗しました。");
  }
  return json.access_token;
}

function jstDateOf(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: JST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function jstTimeOf(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: JST,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/**
 * 今週（weekStartDateから7日間）の忙しい時間帯を日別にまとめた
 * 日本語テキストを返す（AI提案のプロンプト用）。
 * 予定が1件もない場合は null を返す。
 */
export async function getWeekBusySummary(
  refreshToken: string,
  weekStartDate: string
): Promise<string | null> {
  const accessToken = await getAccessToken(refreshToken);
  const dates = getWeekDates(weekStartDate);
  const timeMin = `${dates[0]}T00:00:00+09:00`;
  const timeMaxDate = new Date(`${dates[6]}T00:00:00+09:00`);
  timeMaxDate.setUTCDate(timeMaxDate.getUTCDate() + 1);
  const timeMax = timeMaxDate.toISOString();

  const res = await fetch(`${CALENDAR_BASE}/freeBusy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin,
      timeMax,
      timeZone: JST,
      items: [{ id: "primary" }],
    }),
  });

  if (!res.ok) {
    throw new Error("カレンダーの空き時間取得に失敗しました。");
  }

  const json = (await res.json()) as {
    calendars?: { primary?: { busy?: { start: string; end: string }[] } };
  };
  const busy = json.calendars?.primary?.busy ?? [];
  if (busy.length === 0) return null;

  // 日付ごとに「HH:MM〜HH:MM」を集める
  const byDate = new Map<string, string[]>();
  for (const period of busy) {
    const date = jstDateOf(period.start);
    const range = `${jstTimeOf(period.start)}〜${jstTimeOf(period.end)}`;
    byDate.set(date, [...(byDate.get(date) ?? []), range]);
  }

  const lines: string[] = [];
  dates.forEach((date, dow) => {
    const ranges = byDate.get(date);
    if (ranges && ranges.length > 0) {
      lines.push(`${date}（${DAY_LABELS[dow]}）: ${ranges.join(", ")}`);
    }
  });
  return lines.length > 0 ? lines.join("\n") : null;
}

/** カレンダーに追加する1日分のトレーニング予定 */
export type CalendarDayPlan = {
  dayOfWeek: number; // 0=日曜〜6=土曜
  exerciseLines: string[]; // 「スクワット（3セット×10回×45kg）」等
};

function nextDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * 確定した週間計画をGoogleカレンダーへ同期する。
 * 同じ週に対して以前Sporiveが作成したイベントは削除してから作り直す
 * （extendedProperties.private.sporiveWeek で識別）。
 * イベントは終日イベントとして作成し、その日の種目一覧を説明に載せる。
 */
export async function syncPlanToCalendar(
  refreshToken: string,
  weekStartDate: string,
  dayPlans: CalendarDayPlan[]
): Promise<void> {
  const accessToken = await getAccessToken(refreshToken);
  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  // 以前この週に作成したイベントを削除
  const listRes = await fetch(
    `${CALENDAR_BASE}/calendars/primary/events?maxResults=50&privateExtendedProperty=${encodeURIComponent(
      `sporiveWeek=${weekStartDate}`
    )}`,
    { headers: authHeaders }
  );
  if (listRes.ok) {
    const listJson = (await listRes.json()) as { items?: { id: string }[] };
    for (const event of listJson.items ?? []) {
      await fetch(`${CALENDAR_BASE}/calendars/primary/events/${event.id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
    }
  }

  const dates = getWeekDates(weekStartDate);
  for (const dayPlan of dayPlans) {
    if (dayPlan.exerciseLines.length === 0) continue;
    const date = dates[dayPlan.dayOfWeek];
    const res = await fetch(`${CALENDAR_BASE}/calendars/primary/events`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        summary: `【Sporive】トレーニング（${dayPlan.exerciseLines.length}種目）`,
        description: dayPlan.exerciseLines.join("\n"),
        start: { date },
        end: { date: nextDate(date) },
        extendedProperties: { private: { sporiveWeek: weekStartDate } },
      }),
    });
    if (!res.ok) {
      throw new Error("カレンダーへの予定追加に失敗しました。");
    }
  }
}
