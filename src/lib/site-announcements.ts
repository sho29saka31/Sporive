import { createInfraReadOnlyClient } from "@/lib/supabase/infra";

export type UnreadAnnouncement = {
  id: string;
  title: string;
  level: "info" | "notice" | "warning";
};

export type AnnouncementItem = {
  id: string;
  title: string;
  body: string;
  level: "info" | "notice" | "warning";
};

/**
 * saka2931-infra（adacの管理画面が書き込む）から、Sporive向け（'sporive'または
 * 'general'）の有効なお知らせを新しい順に取得する。RLSにより公開済み
 * （is_active=true かつ scheduled_atが未来でない）行のみが返る。
 */
async function getSporiveAnnouncements(): Promise<
  (AnnouncementItem & { publishedAt: string; showInBar: boolean })[]
> {
  const infra = createInfraReadOnlyClient();
  const { data, error } = await infra
    .from("service_announcements")
    .select("id, title, body, level, published_at, show_in_bar")
    .in("service", ["sporive", "general"])
    .order("published_at", { ascending: false });

  if (error) {
    throw new Error(`お知らせの取得に失敗しました: ${error.message}`);
  }

  return (data ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    level: a.level as AnnouncementItem["level"],
    publishedAt: a.published_at,
    showInBar: a.show_in_bar,
  }));
}

/**
 * 本人が未読の、公開済みのお知らせを新しい順に取得する。
 * ヘッダーのベルバッジ（お知らせの有無を示すだけなので、通知バー表示設定に
 * かかわらず全件を対象にする）で使う。
 */
export async function getUnreadAnnouncements(
  readIds: Set<string>
): Promise<UnreadAnnouncement[]> {
  const announcements = await getSporiveAnnouncements();
  return announcements
    .filter((a) => !readIds.has(a.id))
    .map((a) => ({ id: a.id, title: a.title, level: a.level }));
}

/**
 * 全ページ上部のお知らせバーに表示する、未読かつ「通知バーに表示する」設定が
 * 有効なお知らせを新しい順に取得する（adacの管理画面で個別に表示可否を設定できる）。
 */
export async function getBarAnnouncements(
  readIds: Set<string>
): Promise<UnreadAnnouncement[]> {
  const announcements = await getSporiveAnnouncements();
  return announcements
    .filter((a) => a.showInBar && !readIds.has(a.id))
    .map((a) => ({ id: a.id, title: a.title, level: a.level }));
}

/** お知らせ一覧画面（既読・未読を問わず全件）用の取得 */
export async function getAllAnnouncements(): Promise<AnnouncementItem[]> {
  const announcements = await getSporiveAnnouncements();
  return announcements.map(({ id, title, body, level }) => ({
    id,
    title,
    body,
    level,
  }));
}
