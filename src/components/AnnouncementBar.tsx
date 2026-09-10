import { createClient } from "@/lib/supabase/server";
import { getUnreadAnnouncements } from "@/lib/site-announcements";
import AnnouncementBarList from "@/components/AnnouncementBarList";

/**
 * 全ページ上部に表示する、未読のお知らせバー（要件定義書 §10-3）。
 * ×で閉じると既読になり、以後表示されなくなる。
 * お知らせ本体はsaka2931-infra（adacの管理画面が書き込む）から取得し、
 * 既読状態のみSporive自身のDB（announcement_reads）で管理する。
 */
export default async function AnnouncementBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: reads } = await supabase
    .from("announcement_reads")
    .select("announcement_id")
    .eq("user_id", user.id);
  const readIds = new Set((reads ?? []).map((r) => r.announcement_id));

  const unread = await getUnreadAnnouncements(readIds);
  if (unread.length === 0) return null;

  return <AnnouncementBarList items={unread} />;
}
