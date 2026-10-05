import { createAdminClient } from "@/lib/supabase/admin";

/**
 * 表示名は全サービス共通データのため、authアプリの auth_app.user_profiles が所有する
 * （Sporiveの profiles には持たない）。管理者画面の一覧・CSV出力で、利用者ID→表示名の
 * 対応表が必要な場合のみ、service_roleで読み取る（一般利用者の表示名は
 * lib/authApp.ts の GET /api/profile 経由）。取得に失敗した場合は例外を投げる
 * （握りつぶすと、一覧・CSVが表示名なしのまま成功扱いで返ってしまうため）。
 */
export async function getDisplayNameMap(
  admin: ReturnType<typeof createAdminClient>
): Promise<Map<string, string>> {
  const { data, error } = await admin
    .schema("auth_app")
    .from("user_profiles")
    .select("id, display_name");
  if (error) {
    throw new Error("表示名の取得に失敗しました。");
  }
  return new Map((data ?? []).map((p) => [p.id, p.display_name]));
}
