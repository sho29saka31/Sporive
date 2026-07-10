"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** 負債を解消済みにする（本人の負債のみ。RLSでも保護） */
export async function resolveDebt(debtId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("認証が必要です。");
  }

  const { error } = await supabase
    .from("debts")
    .update({ resolved_at: new Date().toISOString() })
    .eq("id", debtId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error("負債の更新に失敗しました。");
  }

  revalidatePath("/home");
  revalidatePath("/debts");
}
