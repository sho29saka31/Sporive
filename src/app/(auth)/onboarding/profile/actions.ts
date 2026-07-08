"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { GoalType } from "@/types/database";

const CURRENT_YEAR = new Date().getFullYear();
const GOAL_TYPES: readonly GoalType[] = [
  "lose_weight",
  "gain_muscle",
  "strength",
  "senior_maintenance",
];

function isGoalType(value: string): value is GoalType {
  return (GOAL_TYPES as readonly string[]).includes(value);
}

export async function createProfile(formData: FormData) {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const birthYear = Number(formData.get("birth_year"));
  const goal = String(formData.get("goal") ?? "");

  if (
    !displayName ||
    !Number.isInteger(birthYear) ||
    birthYear < CURRENT_YEAR - 100 ||
    birthYear > CURRENT_YEAR - 5 ||
    !isGoalType(goal)
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
  });

  if (error) {
    throw new Error("プロフィールの登録に失敗しました。");
  }

  redirect("/home");
}
