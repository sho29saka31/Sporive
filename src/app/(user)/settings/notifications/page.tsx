import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import AnnouncementList, {
  type AnnouncementItem,
} from "@/components/settings/AnnouncementList";

export const metadata: Metadata = { title: "お知らせ" };

function formatSentAt(sentAt: string): string {
  return new Date(sentAt).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * お知らせ画面：送信済みプッシュ通知の履歴と、管理者が発行したお知らせを
 * タブで切り替えて表示する（要件定義書 §8-4、旧称：通知履歴）。
 */
export default async function NotificationHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; notice?: string }>;
}) {
  const { tab, notice } = await searchParams;
  // お知らせバー・プッシュ通知からの直リンク（?notice=8桁）はtab未指定でも
  // お知らせタブを表示する
  const activeTab =
    tab === "announcements" || notice ? "announcements" : "history";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const logs =
    activeTab === "history"
      ? (
          await supabase
            .from("notification_logs")
            .select("id, title, body, sent_at")
            .eq("user_id", user!.id)
            .order("sent_at", { ascending: false })
            .limit(30)
        ).data
      : null;

  let announcements: AnnouncementItem[] = [];
  if (activeTab === "announcements") {
    const [{ data: siteAnnouncements }, { data: reads }] = await Promise.all([
      supabase
        .from("site_announcements")
        .select("id, notice_code, title, body, level, scheduled_at")
        .eq("is_active", true)
        .order("published_at", { ascending: false }),
      supabase
        .from("announcement_reads")
        .select("announcement_id")
        .eq("user_id", user!.id),
    ]);

    const now = new Date().toISOString();
    const readIds = new Set((reads ?? []).map((r) => r.announcement_id));
    announcements = (siteAnnouncements ?? [])
      // 予約公開時刻に達していないものは利用者側には見せない
      .filter((a) => !a.scheduled_at || a.scheduled_at <= now)
      .map((a) => ({
        id: a.id,
        noticeCode: a.notice_code,
        title: a.title,
        body: a.body,
        level: a.level,
        isRead: readIds.has(a.id),
      }));
  }

  return (
    <div className="py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">お知らせ</h1>
        <Link
          href="/settings/account/notifications"
          prefetch={false}
          className="text-xs font-medium text-navy-600 underline"
        >
          通知設定
        </Link>
      </div>

      <div className="mt-4 flex overflow-hidden rounded-lg border border-navy-200">
        <Link
          href="?tab=history"
          prefetch={false}
          className={`flex-1 py-2 text-center text-xs font-medium ${
            activeTab === "history"
              ? "bg-navy-700 text-white"
              : "bg-white text-navy-500"
          }`}
        >
          通知履歴
        </Link>
        <Link
          href="?tab=announcements"
          prefetch={false}
          className={`flex-1 py-2 text-center text-xs font-medium ${
            activeTab === "announcements"
              ? "bg-navy-700 text-white"
              : "bg-white text-navy-500"
          }`}
        >
          お知らせ
        </Link>
      </div>

      {activeTab === "history" ? (
        logs && logs.length > 0 ? (
          <div className="mt-4 flex flex-col gap-3">
            {logs.map((log) => (
              <div key={log.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-navy-800">
                    {log.title}
                  </p>
                  <p className="text-[10px] text-navy-300">
                    {formatSentAt(log.sent_at)}
                  </p>
                </div>
                <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-navy-500">
                  {log.body}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-center text-sm leading-relaxed text-navy-400">
            まだ通知は送信されていません。
          </p>
        )
      ) : (
        // AnnouncementListはuseSearchParamsでモーダル開閉を管理するため
        // Suspenseでラップする（Next.jsのビルド要件）
        <Suspense fallback={null}>
          <AnnouncementList announcements={announcements} />
        </Suspense>
      )}
    </div>
  );
}
