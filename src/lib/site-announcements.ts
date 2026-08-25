import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * お知らせ（要件定義書 §10-3）で選択可能なページの一覧。
 * 警告レベルのblocked_pagesにのみ使う（お知らせ・注意はページ選択なし）。
 * value は site_announcements.blocked_pages に保存する文字列。
 * "*" はワイルドカード（すべてのページ）。
 */
export const ANNOUNCEMENT_PAGES = [
  { value: "/home", label: "ホーム" },
  { value: "/schedule", label: "スケジュール" },
  { value: "/progress", label: "進捗" },
  { value: "/debts", label: "負債管理" },
  { value: "/settings/notifications", label: "お知らせ" },
  { value: "/settings/account", label: "アカウント設定" },
  { value: "*", label: "すべて" },
] as const;

export function announcementPageLabel(value: string): string {
  return ANNOUNCEMENT_PAGES.find((p) => p.value === value)?.label ?? value;
}

/** 指定したパスが、登録済みページ一覧（"*"含む）のいずれかに該当するか */
export function matchesAnnouncementPages(
  requestPath: string,
  registeredPaths: string[]
): boolean {
  if (registeredPaths.includes("*")) return true;
  return registeredPaths.some(
    (p) => requestPath === p || requestPath.startsWith(`${p}/`)
  );
}

export type UnreadAnnouncement = {
  id: string;
  title: string;
  level: "info" | "notice" | "warning";
};

/**
 * 本人が未読の、有効なお知らせを新しい順に取得する。
 * ヘッダーのベルバッジ・全ページ上部のお知らせバーの両方で使う。
 */
export async function getUnreadAnnouncements(
  client: SupabaseClient<Database>,
  userId: string
): Promise<UnreadAnnouncement[]> {
  const [{ data: announcements }, { data: reads }] = await Promise.all([
    client
      .from("site_announcements")
      .select("id, title, level")
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    client
      .from("announcement_reads")
      .select("announcement_id")
      .eq("user_id", userId),
  ]);

  const readIds = new Set((reads ?? []).map((r) => r.announcement_id));
  return (announcements ?? []).filter((a) => !readIds.has(a.id));
}

/**
 * 指定パスへのアクセスをブロックしている、有効な警告レベルのお知らせを取得する。
 * 複数該当する場合は最新のもの（published_atが最も新しいもの）を返す。
 */
export async function getBlockingAnnouncement(
  client: SupabaseClient<Database>,
  requestPath: string
): Promise<{ id: string; title: string } | null> {
  const { data } = await client
    .from("site_announcements")
    .select("id, title, blocked_pages")
    .eq("is_active", true)
    .eq("level", "warning")
    .order("published_at", { ascending: false });

  for (const row of data ?? []) {
    if (matchesAnnouncementPages(requestPath, row.blocked_pages)) {
      return { id: row.id, title: row.title };
    }
  }
  return null;
}
