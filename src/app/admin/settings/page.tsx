import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import FeatureFlagsPanel from "@/components/admin/FeatureFlagsPanel";
import AnnouncementsPanel from "@/components/admin/AnnouncementsPanel";

export const dynamic = "force-dynamic";

/**
 * 高度な設定：機能タブ・お知らせタブ（要件定義書 §10-3）。
 * アクセス制御（is_super_admin）は layout.tsx で実施済み。
 * 全利用者に影響する設定のため service_role クライアントで取得・更新する。
 */
export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab === "announcements" ? "announcements" : "features";

  const admin = createAdminClient();

  const flags =
    activeTab === "features"
      ? (
          await admin
            .from("feature_flags")
            .select("key, enabled, description")
        ).data ?? []
      : [];

  const announcements =
    activeTab === "announcements"
      ? (
          await admin
            .from("site_announcements")
            .select(
              "id, title, body, level, blocked_pages, is_active, published_at, scheduled_at"
            )
            .order("published_at", { ascending: false })
        ).data ?? []
      : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex overflow-hidden rounded-lg border border-navy-200 bg-white">
        <Link
          href="/admin/settings?tab=features"
          className={`flex-1 px-4 py-2 text-center text-sm font-medium ${
            activeTab === "features"
              ? "bg-navy-700 text-white"
              : "text-navy-500 hover:bg-navy-50"
          }`}
        >
          機能
        </Link>
        <Link
          href="/admin/settings?tab=announcements"
          className={`flex-1 px-4 py-2 text-center text-sm font-medium ${
            activeTab === "announcements"
              ? "bg-navy-700 text-white"
              : "text-navy-500 hover:bg-navy-50"
          }`}
        >
          お知らせ
        </Link>
      </div>

      {activeTab === "features" ? (
        <FeatureFlagsPanel flags={flags} />
      ) : (
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
    </div>
  );
}
