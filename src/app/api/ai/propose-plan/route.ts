import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateWeeklyPlan } from "@/lib/gemini";
import { getWeekBusySummary } from "@/lib/calendar";
import { getCurrentWeekStartDate } from "@/lib/week";

/** プロフィール・希望頻度からAIが週間トレーニング計画を新規提案する */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("birth_year, goal, gender")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json(
      { error: "プロフィールが未登録です。" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const weeklyFrequency = Number(body.weeklyFrequency);

  if (
    !Number.isInteger(weeklyFrequency) ||
    weeklyFrequency < 1 ||
    weeklyFrequency > 7
  ) {
    return NextResponse.json(
      { error: "希望頻度は1〜7の整数で指定してください。" },
      { status: 400 }
    );
  }

  // カレンダー連携済みなら今週の忙しい時間帯を取得してプロンプトに反映する。
  // 取得に失敗しても提案自体は続行する（連携は補助情報のため）。
  let calendarContext: string | null = null;
  const { data: calendarToken } = await supabase
    .from("calendar_tokens")
    .select("refresh_token")
    .eq("user_id", user.id)
    .maybeSingle();
  if (calendarToken) {
    try {
      calendarContext = await getWeekBusySummary(
        calendarToken.refresh_token,
        getCurrentWeekStartDate()
      );
    } catch (error) {
      console.error("Calendar freebusy fetch failed", error);
    }
  }

  try {
    const plan = await generateWeeklyPlan({
      birthYear: profile.birth_year,
      goal: profile.goal,
      gender: profile.gender,
      weeklyFrequency,
      calendarContext,
    });
    return NextResponse.json({ plan });
  } catch (error) {
    console.error("Gemini plan generation failed", error);
    return NextResponse.json(
      { error: "AI提案の生成に失敗しました。時間をおいて再度お試しください。" },
      { status: 502 }
    );
  }
}
