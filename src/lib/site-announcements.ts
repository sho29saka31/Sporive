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
  { value: "/settings/account", label: "アカウント設定" },
  { value: "*", label: "すべて" },
] as const;

/**
 * ブロック対象にしてはいけないページ。"*"（すべて）が選択された場合でも、
 * これらのページは常にアクセス可能でなければならない。
 * - /settings/notifications：お知らせ自体の内容を確認する画面。ここが
 *   ブロックされると、利用者が原因を確認できず抜け出せなくなる
 * - /mfa-challenge：MFA認証コード入力画面。ログインを完走するために必須
 * - /settings/account/security：メール・パスワード変更、MFA設定に加えて
 *   「全デバイスからログアウト」を含む。スマホ紛失・不正ログインに気づいた
 *   利用者の唯一の自衛手段のため、「アカウント設定」（/settings/account）が
 *   警告レベルのお知らせでブロック対象に選ばれた場合でも、この画面だけは
 *   常にアクセス可能にする
 */
const NEVER_BLOCKED_PAGES = [
  "/settings/notifications",
  "/mfa-challenge",
  "/settings/account/security",
];

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
 * まだ予約公開時刻に達していない（scheduled_atが未来の）行を除外する。
 * 利用者側に見せる一覧はすべてこのフィルタを通す必要がある
 * （管理画面の一覧だけは予約中のものも見せたいので通さない）。
 */
function isPublished(row: { scheduled_at: string | null }): boolean {
  // SupabaseがtimestamptzをPostgREST経由で返す書式（例："+00:00"）と
  // Date.prototype.toISOString()の書式（"Z"）が異なるため、文字列比較ではなく
  // Dateへ変換してから比較する
  return !row.scheduled_at || new Date(row.scheduled_at).getTime() <= Date.now();
}

/**
 * 本人が未読の、公開済み（予約時刻に達した）お知らせを新しい順に取得する。
 * ヘッダーのベルバッジ・全ページ上部のお知らせバーの両方で使う。
 */
export async function getUnreadAnnouncements(
  client: SupabaseClient<Database>,
  userId: string
): Promise<UnreadAnnouncement[]> {
  const [{ data: announcements }, { data: reads }] = await Promise.all([
    client
      .from("site_announcements")
      .select("id, title, level, scheduled_at")
      .eq("is_active", true)
      .order("published_at", { ascending: false }),
    client
      .from("announcement_reads")
      .select("announcement_id")
      .eq("user_id", userId),
  ]);

  const readIds = new Set((reads ?? []).map((r) => r.announcement_id));
  return (announcements ?? [])
    .filter(isPublished)
    .filter((a) => !readIds.has(a.id));
}

/**
 * 指定パスへのアクセスをブロックしている、有効かつ公開済みの警告レベルの
 * お知らせを取得する。複数該当する場合は最新のもの（published_atが最も
 * 新しいもの）を返す。
 */
export async function getBlockingAnnouncement(
  client: SupabaseClient<Database>,
  requestPath: string
): Promise<{ id: string; title: string } | null> {
  if (NEVER_BLOCKED_PAGES.some((p) => requestPath === p || requestPath.startsWith(`${p}/`))) {
    return null;
  }

  const { data } = await client
    .from("site_announcements")
    .select("id, title, blocked_pages, scheduled_at")
    .eq("is_active", true)
    .eq("level", "warning")
    .order("published_at", { ascending: false });

  for (const row of (data ?? []).filter(isPublished)) {
    if (matchesAnnouncementPages(requestPath, row.blocked_pages)) {
      return { id: row.id, title: row.title };
    }
  }
  return null;
}
