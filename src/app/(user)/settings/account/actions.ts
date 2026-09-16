"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateDisplayName } from "@/lib/authApp";
import { summarizeGoal } from "@/lib/gemini";
import { getFeatureFlags } from "@/lib/feature-flags";
import { getCurrentJstYear } from "@/lib/week";
import type { GenderType } from "@/types/database";

/**
 * ログイン・パスワード変更・メールアドレス変更・MFA・パスキー・アカウント削除・
 * 全デバイスからのログアウトは auth.saka2931.jp に一元化されているため、
 * Sporive自身はそれらのServer Actionを持たない
 * (旧 signOutEverywhere/deleteAccount/updateEmail/changePassword はここから削除済み)。
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("https://auth.saka2931.jp/login");
}

export type ActionState = {
  error?: string;
  success?: string;
} | null;

const MIN_AGE = 13;
const GOAL_MAX_LENGTH = 500;
const DISPLAY_NAME_MAX_LENGTH = 100;
const GENDER_TYPES: readonly GenderType[] = ["male", "female", "other"];

function isGenderType(value: string): value is GenderType {
  return (GENDER_TYPES as readonly string[]).includes(value);
}

/**
 * プロフィール（表示名・生年・目標・性別）の更新。
 * 表示名はSporive固有のデータではなく全サービス共通のため、authアプリの
 * `user_profiles`が所有する。このServer Actionからはauthアプリの
 * `PATCH /api/profile`経由でのみ書き込み、Sporive自身の`profiles`テーブルには
 * 生年・目標・性別（Sporive固有データ）のみを保存する。
 */
export async function updateProfile(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const birthYear = Number(formData.get("birth_year"));
  const goalInput = String(formData.get("goal") ?? "").trim();
  const genderInput = String(formData.get("gender") ?? "");

  if (!displayName) {
    return { error: "表示名を入力してください。" };
  }
  if (displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    return { error: `表示名は${DISPLAY_NAME_MAX_LENGTH}文字以内で入力してください。` };
  }
  // new Date().getFullYear()はサーバーのローカル(Vercelは既定でUTC)基準の年
  // になり、UTCの大晦日15:00〜23:59(JSTでは既に1月1日)の間、生年の許容範囲が
  // 1年分ズレる。また、モジュールトップレベルで一度だけ評価すると、サーバー
  // レス関数がウォームのまま年をまたいだ場合も古い年で比較され続けてしまう
  // (コード監査で発見)。リクエストごとにJST基準で計算する
  const currentYear = getCurrentJstYear();
  if (
    !Number.isInteger(birthYear) ||
    birthYear < currentYear - 100 ||
    birthYear > currentYear - MIN_AGE
  ) {
    return { error: "生年を正しく入力してください。" };
  }
  if (!goalInput) {
    return { error: "目標を入力してください。" };
  }
  if (goalInput.length > GOAL_MAX_LENGTH) {
    return { error: `目標は${GOAL_MAX_LENGTH}文字以内で入力してください。` };
  }
  if (genderInput && !isGenderType(genderInput)) {
    return { error: "性別の選択が不正です。" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("https://auth.saka2931.jp/login");
  }

  // Gemini APIで要望を簡潔な文章に整形する。API障害時・機能フラグ停止時も
  // 更新自体は止めず、入力された文章をそのまま保存してフォールバックする。
  let goal = goalInput;
  const flags = await getFeatureFlags(["ai_master", "ai_goal_summarize"]);
  if (flags.ai_master && flags.ai_goal_summarize) {
    try {
      goal = await summarizeGoal(goalInput);
    } catch (error) {
      console.error("Gemini goal summarization failed", error);
    }
  }

  const [{ error }, displayNameOk] = await Promise.all([
    supabase
      .from("profiles")
      .update({
        birth_year: birthYear,
        goal,
        gender: genderInput ? (genderInput as GenderType) : null,
      })
      .eq("id", user.id),
    updateDisplayName(displayName),
  ]);

  if (error || !displayNameOk) {
    return { error: "プロフィールの更新に失敗しました。" };
  }

  revalidatePath("/settings/account/profile");
  return { success: "プロフィールを更新しました。" };
}
