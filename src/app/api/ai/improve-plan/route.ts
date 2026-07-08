import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateImprovementSuggestion, type WeeklyPlanDraft } from "@/lib/gemini";

/** 登録直前の計画（AI提案 or 手動作成）に対してAIが改善案を提示する */
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
  const currentPlan = body.currentPlan as WeeklyPlanDraft | undefined;

  if (!currentPlan || !Array.isArray(currentPlan.items)) {
    return NextResponse.json(
      { error: "計画データが不正です。" },
      { status: 400 }
    );
  }

  try {
    const suggestion = await generateImprovementSuggestion({
      birthYear: profile.birth_year,
      goal: profile.goal,
      currentPlan,
    });
    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error("Gemini improvement suggestion failed", error);
    return NextResponse.json(
      { error: "改善案の生成に失敗しました。時間をおいて再度お試しください。" },
      { status: 502 }
    );
  }
}
