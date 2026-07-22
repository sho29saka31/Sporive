"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { summarizeGoal } from "@/lib/gemini";
import type { GenderType } from "@/types/database";

const CURRENT_YEAR = new Date().getFullYear();
const MIN_AGE = 13;
const GOAL_MAX_LENGTH = 500;
const GENDER_TYPES: readonly GenderType[] = ["male", "female", "other"];

function isGenderType(value: string): value is GenderType {
  return (GENDER_TYPES as readonly string[]).includes(value);
}

export async function createProfile(formData: FormData) {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const birthYear = Number(formData.get("birth_year"));
  const goalInput = String(formData.get("goal") ?? "").trim();
  const genderInput = String(formData.get("gender") ?? "");

  if (
    !displayName ||
    !Number.isInteger(birthYear) ||
    birthYear < CURRENT_YEAR - 100 ||
    birthYear > CURRENT_YEAR - MIN_AGE ||
    !goalInput ||
    goalInput.length > GOAL_MAX_LENGTH ||
    (genderInput && !isGenderType(genderInput))
  ) {
    throw new Error("入力内容を確認してください。");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Gemini APIで要望を簡潔な文章に整形する。API障害時も登録自体は止めず、
  // 入力された文章をそのまま保存してフォールバックする。
  let goal = goalInput;
  try {
    goal = await summarizeGoal(goalInput);
  } catch (error) {
    console.error("Gemini goal summarization failed", error);
  }

  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    display_name: displayName,
    birth_year: birthYear,
    goal,
    gender: genderInput ? (genderInput as GenderType) : null,
  });

  if (error) {
    throw new Error("プロフィールの登録に失敗しました。");
  }

  redirect("/home");
}
