import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import FeatureFlagsPanel from "@/components/admin/FeatureFlagsPanel";
import AnnouncementsPanel from "@/components/admin/AnnouncementsPanel";
import DataManagementPanel from "@/components/admin/DataManagementPanel";

export const dynamic = "force-dynamic";

const TABS = [
  { value: "features", label: "機能" },
  { value: "announcements", label: "お知らせ" },
  { value: "data", label: "データ管理" },
] as const;
type Tab = (typeof TABS)[number]["value"];

/**
 * 高度な設定：機能タブ・お知らせタブ・データ管理タブ（要件定義書 §10-3）。
 * アクセス制御（is_super_admin）は layout.tsx で実施済み。
 * 全利用者に影響する設定のため service_role クライアントで取得・更新する。
 */
export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab: Tab = TABS.some((t) => t.value === tab)
    ? (tab as Tab)
    : "features";

  const admin = createAdminClient();

  // 取得に失敗した場合、空配列のままだと「機能フラグ／お知らせが1件もない」
  // という誤った状態がエラーなく表示され、管理者が状況を誤認しかねないため、
  // 明示的にエラーとして扱う
  let flags: { key: string; enabled: boolean; description: string }[] = [];
  if (activeTab === "features") {
    const { data, error } = await admin
      .from("feature_flags")
      .select("key, enabled, description");
    if (error) {
      throw new Error("機能フラグの取得に失敗しました。");
    }
    flags = data ?? [];
  }

  let announcements: {
    id: string;
    title: string;
    body: string;
    level: "info" | "notice" | "warning";
    blocked_pages: string[];
    is_active: boolean;
    published_at: string;
    scheduled_at: string | null;
  }[] = [];
  if (activeTab === "announcements") {
    const { data, error } = await admin
      .from("site_announcements")
      .select(
        "id, title, body, level, blocked_pages, is_active, published_at, scheduled_at"
      )
      .order("published_at", { ascending: false });
    if (error) {
      throw new Error("お知らせの取得に失敗しました。");
    }
    announcements = data ?? [];
  }

  // 利用者選択セレクト用の一覧（データ管理タブでのみ必要）
  let users: { id: string; displayName: string }[] = [];
  if (activeTab === "data") {
    const { data, error } = await admin
      .from("profiles")
      .select("id, display_name")
      .order("display_name");
    if (error) {
      throw new Error("利用者一覧の取得に失敗しました。");
    }
    users = (data ?? []).map((u) => ({ id: u.id, displayName: u.display_name }));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex overflow-hidden rounded-lg border border-navy-200 bg-white">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/admin/settings?tab=${t.value}`}
            className={`flex-1 px-4 py-2 text-center text-sm font-medium ${
              activeTab === t.value
                ? "bg-navy-700 text-white"
                : "text-navy-500 hover:bg-navy-50"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {activeTab === "features" && <FeatureFlagsPanel flags={flags} />}
      {activeTab === "announcements" && (
        <AnnouncementsPanel
          announcements={announcements.map((a) => ({
            id: a.id,
            title: a.title,
            body: a.body,
            level: a.level,
            blockedPages: a.blocked_pages,
            isActive: a.is_active,
            publishedAt: a.published_at,
            scheduledAt: a.scheduled_at,
          }))}
        />
      )}
      {activeTab === "data" && <DataManagementPanel users={users} />}
    </div>
  );
}
