import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateWeeklyPlan } from "@/lib/gemini";

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
    .select("birth_year, goal")
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

  try {
    const plan = await generateWeeklyPlan({
      birthYear: profile.birth_year,
      goal: profile.goal,
      weeklyFrequency,
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
