"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildLoginUrl } from "@/lib/authApp";
import { summarizeGoal } from "@/lib/gemini";
import { getFeatureFlags } from "@/lib/feature-flags";
import { getCurrentJstYear } from "@/lib/week";
import type { GenderType } from "@/types/database";

const MIN_AGE = 13;
const GOAL_MAX_LENGTH = 500;
const GENDER_TYPES: readonly GenderType[] = ["male", "female", "other"];

function isGenderType(value: string): value is GenderType {
  return (GENDER_TYPES as readonly string[]).includes(value);
}

export type OnboardingActionState = {
  error?: string;
} | null;

export async function createProfile(
  _prevState: OnboardingActionState,
  formData: FormData
): Promise<OnboardingActionState> {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const birthYear = Number(formData.get("birth_year"));
  const goalInput = String(formData.get("goal") ?? "").trim();
  const genderInput = String(formData.get("gender") ?? "");

  // new Date().getFullYear()はサーバーのローカル(Vercelは既定でUTC)基準の年
  // になり、UTCの大晦日15:00〜23:59(JSTでは既に1月1日)の間、生年の許容範囲が
  // 1年分ズレる。また、モジュールトップレベルで一度だけ評価すると、サーバー
  // レス関数がウォームのまま年をまたいだ場合も古い年で比較され続けてしまう
  // (コード監査で発見)。リクエストごとにJST基準で計算する
  const currentYear = getCurrentJstYear();
  if (
    !displayName ||
    !Number.isInteger(birthYear) ||
    birthYear < currentYear - 100 ||
    birthYear > currentYear - MIN_AGE ||
    !goalInput ||
    goalInput.length > GOAL_MAX_LENGTH ||
    (genderInput && !isGenderType(genderInput))
  ) {
    return { error: "入力内容を確認してください。" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(buildLoginUrl("/onboarding/profile"));
  }

  const flags = await getFeatureFlags([
    "new_signup",
    "ai_master",
    "ai_goal_summarize",
  ]);
  if (!flags.new_signup) {
    return {
      error: "現在新規登録の受付を停止しています。時間をおいて再度お試しください。",
    };
  }

  // Gemini APIで要望を簡潔な文章に整形する。API障害時・機能フラグ停止時も
  // 登録自体は止めず、入力された文章をそのまま保存してフォールバックする。
  let goal = goalInput;
  if (flags.ai_master && flags.ai_goal_summarize) {
    try {
      goal = await summarizeGoal(goalInput);
    } catch (error) {
      console.error("Gemini goal summarization failed", error);
    }
  }

  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    display_name: displayName,
    birth_year: birthYear,
    goal,
    gender: genderInput ? (genderInput as GenderType) : null,
  });

  if (error) {
    return { error: "プロフィールの登録に失敗しました。" };
  }

  redirect("/home");
}
