"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { GenderType, GoalType } from "@/types/database";

const CURRENT_YEAR = new Date().getFullYear();
const MIN_AGE = 13;
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

export async function createProfile(formData: FormData) {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const birthYear = Number(formData.get("birth_year"));
  const goal = String(formData.get("goal") ?? "");
  const genderInput = String(formData.get("gender") ?? "");

  if (
    !displayName ||
    !Number.isInteger(birthYear) ||
    birthYear < CURRENT_YEAR - 100 ||
    birthYear > CURRENT_YEAR - MIN_AGE ||
    !isGoalType(goal) ||
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
