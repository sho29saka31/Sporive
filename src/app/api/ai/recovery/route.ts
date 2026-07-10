import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateRecoveryAdvice } from "@/lib/gemini";

/** 未消化の負債に対するAIリカバリー提案（Phase 7） */
export async function POST() {
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

  const { data: debts } = await supabase
    .from("debts")
    .select("plan_item_id, missed_on, sets_remaining, reps_remaining")
    .eq("user_id", user.id)
    .is("resolved_at", null)
    .order("missed_on", { ascending: true });

  if (!debts || debts.length === 0) {
    return NextResponse.json(
      { error: "未消化の負債はありません。" },
      { status: 400 }
    );
  }

  const itemIds = Array.from(
    new Set(debts.map((d) => d.plan_item_id).filter(Boolean))
  ) as string[];
  const { data: items } =
    itemIds.length > 0
      ? await supabase
          .from("plan_items")
          .select("id, exercise_name")
          .in("id", itemIds)
      : { data: null };
  const nameById = new Map(
    (items ?? []).map((item) => [item.id, item.exercise_name])
  );

  const debtLines = debts.map((d) => {
    const name = d.plan_item_id
      ? nameById.get(d.plan_item_id) ?? "運動"
      : "運動";
    const remaining = [
      d.sets_remaining > 0 ? `+${d.sets_remaining}セット` : null,
      d.reps_remaining > 0 ? `+${d.reps_remaining}回` : null,
    ]
      .filter(Boolean)
      .join("×");
    return `${name}：${remaining}（${d.missed_on}の未達成分）`;
  });

  try {
    const advice = await generateRecoveryAdvice({
      birthYear: profile.birth_year,
      goal: profile.goal,
      gender: profile.gender,
      debtLines,
    });
    return NextResponse.json({ advice });
  } catch (error) {
    console.error("Gemini recovery advice failed", error);
    return NextResponse.json(
      { error: "リカバリー案の生成に失敗しました。時間をおいて再度お試しください。" },
      { status: 502 }
    );
  }
}
