"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type SettingsActionState = {
  error?: string;
  success?: string;
} | null;

/**
 * 呼び出し元がsuper-adminであることを確認する。
 * レイアウトでもガードしているが、Server Actionは直接呼び出される可能性があるため
 * 書き込み系の操作では必ずここでも再確認する。
 */
async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("認証が必要です。");
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_super_admin) {
    throw new Error("権限がありません。");
  }
  return user.id;
}

type DeletableTable =
  | "training_plans"
  | "workout_logs"
  | "debts"
  | "ai_proposal_logs"
  | "notification_logs";

/**
 * データ管理タブ共通の削除処理。userIdを指定すればその利用者のみ、
 * nullなら全利用者分を対象に削除する。
 */
async function deleteRowsForUserOrAll(
  table: DeletableTable,
  userId: string | null
): Promise<string | null> {
  const admin = createAdminClient();
  const base = admin.from(table).delete();
  // PostgRESTのDELETEはWHERE句なしでは実行できないため、全削除時は
  // 常に真になる条件（idがnullでない＝全行）を明示する
  const { error } = userId
    ? await base.eq("user_id", userId)
    : await base.not("id", "is", null);
  return error ? error.message : null;
}

/**
 * トレーニング計画・実績（データ管理タブ、ユーザー指示）を削除する。
 * plan_itemsはtraining_plans削除でON DELETE CASCADEにより連動して消えるが、
 * workout_logsはplan_item_id経由のON DELETE SET NULLでは削除されないため、
 * 別テーブルとして個別に削除する。
 */
export async function deleteTrainingData(userId: string | null): Promise<void> {
  await requireSuperAdmin();

  const plansError = await deleteRowsForUserOrAll("training_plans", userId);
  if (plansError) {
    throw new Error("トレーニング計画の削除に失敗しました。");
  }

  const logsError = await deleteRowsForUserOrAll("workout_logs", userId);
  if (logsError) {
    throw new Error("実績ログの削除に失敗しました。");
  }

  revalidatePath("/admin");
}

/** 負債データ（データ管理タブ、ユーザー指示）を削除する */
export async function deleteDebtsData(userId: string | null): Promise<void> {
  await requireSuperAdmin();

  const error = await deleteRowsForUserOrAll("debts", userId);
  if (error) {
    throw new Error("負債データの削除に失敗しました。");
  }

  revalidatePath("/admin");
}

/** AI提案ログ（データ管理タブ、ユーザー指示）を削除する */
export async function deleteAiProposalLogsData(
  userId: string | null
): Promise<void> {
  await requireSuperAdmin();

  const error = await deleteRowsForUserOrAll("ai_proposal_logs", userId);
  if (error) {
    throw new Error("AI提案ログの削除に失敗しました。");
  }

  revalidatePath("/admin");
}

/** 通知履歴（データ管理タブ、ユーザー指示）を削除する */
export async function deleteNotificationLogsData(
  userId: string | null
): Promise<void> {
  await requireSuperAdmin();

  const error = await deleteRowsForUserOrAll("notification_logs", userId);
  if (error) {
    throw new Error("通知履歴の削除に失敗しました。");
  }

  revalidatePath("/admin");
}
