"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { GenderType, GoalType } from "@/types/database";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export type ActionState = { error?: string; success?: string } | null;

const CURRENT_YEAR = new Date().getFullYear();
const GOAL_TYPES: readonly GoalType[] = [
  "lose_weight",
  "gain_muscle",
  "strength",
  "senior_maintenance",
];
const GENDER_TYPES: readonly GenderType[] = ["male", "female", "other"];

function isGoalType(value: string): value is GoalType {
  return (GOAL_TYPES as readonly string[]).includes(value);
}

function isGenderType(value: string): value is GenderType {
  return (GENDER_TYPES as readonly string[]).includes(value);
}

/** プロフィール（表示名・生年・目標・性別）の更新 */
export async function updateProfile(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const birthYear = Number(formData.get("birth_year"));
  const goal = String(formData.get("goal") ?? "");
  const genderInput = String(formData.get("gender") ?? "");

  if (!displayName) {
    return { error: "表示名を入力してください。" };
  }
  if (
    !Number.isInteger(birthYear) ||
    birthYear < CURRENT_YEAR - 100 ||
    birthYear > CURRENT_YEAR - 5
  ) {
    return { error: "生年を正しく入力してください。" };
  }
  if (!isGoalType(goal)) {
    return { error: "目標を選択してください。" };
  }
  if (genderInput && !isGenderType(genderInput)) {
    return { error: "性別の選択が不正です。" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      birth_year: birthYear,
      goal,
      gender: genderInput ? (genderInput as GenderType) : null,
    })
    .eq("id", user.id);

  if (error) {
    return { error: "プロフィールの更新に失敗しました。" };
  }

  revalidatePath("/settings/account");
  return { success: "プロフィールを更新しました。" };
}

/** メールアドレスの変更（Supabaseから確認メールが送信される） */
export async function updateEmail(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "有効なメールアドレスを入力してください。" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email });

  if (error) {
    return { error: error.message };
  }

  return {
    success:
      "確認メールを送信しました。新しいメールアドレス宛のメールを確認し、リンクをクリックして変更を完了してください。",
  };
}
