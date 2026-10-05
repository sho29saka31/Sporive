import { createAdminClient } from "@/lib/supabase/admin";
import DataManagementPanel from "@/components/admin/DataManagementPanel";
import { getDisplayNameMap } from "@/lib/display-names";

export const dynamic = "force-dynamic";

/**
 * 高度な設定：データ管理タブ（要件定義書 §10-3）。
 * 機能フラグ・お知らせの作成・編集はadacの管理画面に一元化したため、
 * このページからは削除した（利用者向けの機能フラグ判定・お知らせ表示は
 * Sporive自身のコードに残る）。
 * アクセス制御（is_super_admin）は layout.tsx で実施済み。
 * 全利用者に影響する設定のため service_role クライアントで取得・更新する。
 */
export default async function AdminSettingsPage() {
  const admin = createAdminClient();

  const [{ data, error }, names] = await Promise.all([
    admin.from("profiles").select("id"),
    getDisplayNameMap(admin),
  ]);
  if (error) {
    throw new Error("利用者一覧の取得に失敗しました。");
  }
  // 表示名はauthアプリが所有する（未設定の利用者は「(表示名未設定)」と表示）
  const users = (data ?? [])
    .map((u) => ({ id: u.id, displayName: names.get(u.id) ?? "(表示名未設定)" }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "ja"));

  return <DataManagementPanel users={users} />;
}
