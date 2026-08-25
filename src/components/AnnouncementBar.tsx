import { createClient } from "@/lib/supabase/server";
import { getUnreadAnnouncements } from "@/lib/site-announcements";
import AnnouncementBarList from "@/components/AnnouncementBarList";

/**
 * 全ページ上部に表示する、未読のお知らせバー（要件定義書 §10-3）。
 * ×で閉じると既読になり、以後表示されなくなる。
 */
export default async function AnnouncementBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const unread = await getUnreadAnnouncements(supabase, user.id);
  if (unread.length === 0) return null;

  return <AnnouncementBarList items={unread} />;
}
