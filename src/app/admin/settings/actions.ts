"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FEATURE_FLAG_KEYS, type FeatureFlagKey } from "@/lib/feature-flags";
import { ANNOUNCEMENT_PAGES } from "@/lib/site-announcements";

export type SettingsActionState = {
  error?: string;
  success?: string;
} | null;

const ANNOUNCEMENT_LEVELS = ["info", "notice", "warning"] as const;
type AnnouncementLevel = (typeof ANNOUNCEMENT_LEVELS)[number];
const ANNOUNCEMENT_PAGE_VALUES = ANNOUNCEMENT_PAGES.map((p) => p.value);
const TITLE_MAX_LENGTH = 60;
const BODY_MAX_LENGTH = 1000;

/**
 * 呼び出し元がsuper-adminであることを確認する。
 * レイアウトでもガードしているが、Server Actionは直接呼び出される可能性があるため
 * 書き込み系の操作では必ずここでも再確認する。
 */
async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("認証が必要です。");
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_super_admin) {
    throw new Error("権限がありません。");
  }
  return user.id;
}

function isAnnouncementLevel(value: string): value is AnnouncementLevel {
  return (ANNOUNCEMENT_LEVELS as readonly string[]).includes(value);
}

const SCHEDULED_AT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/**
 * <input type="datetime-local"> の値（"YYYY-MM-DDTHH:mm"、JST想定）を
 * ISO文字列（UTC）に変換する。未入力ならnull（即時公開）を返す。
 */
function parseScheduledAt(
  formData: FormData
): { error: string } | { scheduledAt: string | null } {
  const raw = String(formData.get("scheduled_at") ?? "").trim();
  if (!raw) return { scheduledAt: null };
  if (!SCHEDULED_AT_PATTERN.test(raw)) {
    return { error: "予約日時を正しく入力してください。" };
  }
  const date = new Date(`${raw}:00+09:00`);
  if (Number.isNaN(date.getTime())) {
    return { error: "予約日時を正しく入力してください。" };
  }
  return { scheduledAt: date.toISOString() };
}

/** お知らせ一覧・お知らせバー・ヘッダーバッジなど、影響するページをまとめて再検証する */
function revalidateAnnouncementSurfaces() {
  revalidatePath("/admin/settings");
  revalidatePath("/settings/notifications");
  // ヘッダーのベルバッジ・全ページ上部のお知らせバーは(user)レイアウトに
  // 常駐しているため、レイアウト単位で再検証する
  revalidatePath("/", "layout");
}

/**
 * 入力内容を検証し、タイトル・本文・レベル・対象ページ・予約日時を取り出す
 * （作成・編集共通）
 */
function parseAnnouncementForm(
  formData: FormData
):
  | { error: string }
  | {
      title: string;
      body: string;
      level: AnnouncementLevel;
      blockedPages: string[];
      scheduledAt: string | null;
    } {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const level = String(formData.get("level") ?? "");

  if (!title || title.length > TITLE_MAX_LENGTH) {
    return { error: `タイトルは1〜${TITLE_MAX_LENGTH}文字で入力してください。` };
  }
  if (!body || body.length > BODY_MAX_LENGTH) {
    return { error: `本文は1〜${BODY_MAX_LENGTH}文字で入力してください。` };
  }
  if (!isAnnouncementLevel(level)) {
    return { error: "レベルを選択してください。" };
  }

  const scheduled = parseScheduledAt(formData);
  if ("error" in scheduled) return scheduled;

  // 開けなくするページを選択できるのは警告レベルのみ
  const selectedPages =
    level === "warning"
      ? formData
          .getAll("pages")
          .map((v) => String(v))
          .filter((v) =>
            (ANNOUNCEMENT_PAGE_VALUES as readonly string[]).includes(v)
          )
      : [];

  return {
    title,
    body,
    level,
    blockedPages: selectedPages,
    scheduledAt: scheduled.scheduledAt,
  };
}

/**
 * お知らせを新規作成する。
 * 予約日時が未指定なら発信日時＝作成時刻（即時公開）、指定した場合は
 * 発信日時＝予約日時とする（利用者側には予約日時が来るまで表示しない）。
 */
export async function createAnnouncement(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const userId = await requireSuperAdmin();

  const parsed = parseAnnouncementForm(formData);
  if ("error" in parsed) return parsed;

  const admin = createAdminClient();
  const { error } = await admin.from("site_announcements").insert({
    title: parsed.title,
    body: parsed.body,
    level: parsed.level,
    blocked_pages: parsed.blockedPages,
    scheduled_at: parsed.scheduledAt,
    published_at: parsed.scheduledAt ?? new Date().toISOString(),
    created_by: userId,
  });

  if (error) {
    return { error: "お知らせの作成に失敗しました。" };
  }

  revalidateAnnouncementSurfaces();
  return {
    success: parsed.scheduledAt
      ? "お知らせを予約しました。"
      : "お知らせを作成しました。",
  };
}

/**
 * お知らせを編集する（発信日時＝予約日時、または編集時刻（即時公開の場合）に更新し、
 * 全利用者の既読状態をリセットする。内容が変わって再度周知する意図のため、
 * 読み直してもらう）。
 */
export async function updateAnnouncement(
  id: string,
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  await requireSuperAdmin();

  const parsed = parseAnnouncementForm(formData);
  if ("error" in parsed) return parsed;

  const admin = createAdminClient();
  const { error } = await admin
    .from("site_announcements")
    .update({
      title: parsed.title,
      body: parsed.body,
      level: parsed.level,
      blocked_pages: parsed.blockedPages,
      scheduled_at: parsed.scheduledAt,
      published_at: parsed.scheduledAt ?? new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { error: "お知らせの更新に失敗しました。" };
  }

  await admin.from("announcement_reads").delete().eq("announcement_id", id);

  revalidateAnnouncementSurfaces();
  return { success: "お知らせを更新しました。" };
}

/**
 * お知らせの有効/無効を切り替える。
 * 無効→有効にする場合は発信日時を更新し、全利用者の既読状態をリセットする
 * （再度有効化＝再周知の意図のため）。
 */
export async function toggleAnnouncementActive(
  id: string,
  isActive: boolean
): Promise<void> {
  await requireSuperAdmin();

  const admin = createAdminClient();
  const { error } = await admin
    .from("site_announcements")
    .update(
      isActive
        ? {
            is_active: true,
            published_at: new Date().toISOString(),
            scheduled_at: null,
          }
        : { is_active: false }
    )
    .eq("id", id);

  if (error) {
    throw new Error("お知らせの更新に失敗しました。");
  }

  if (isActive) {
    await admin.from("announcement_reads").delete().eq("announcement_id", id);
  }

  revalidateAnnouncementSurfaces();
}

/** お知らせを削除する（既読状態もON DELETE CASCADEで連動して削除される） */
export async function deleteAnnouncement(id: string): Promise<void> {
  await requireSuperAdmin();

  const admin = createAdminClient();
  const { error } = await admin
    .from("site_announcements")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error("お知らせの削除に失敗しました。");
  }

  revalidateAnnouncementSurfaces();
}

/** 機能フラグのON/OFFを切り替える */
export async function toggleFeatureFlag(
  key: string,
  enabled: boolean
): Promise<void> {
  const userId = await requireSuperAdmin();
  if (!(FEATURE_FLAG_KEYS as readonly string[]).includes(key)) {
    throw new Error("不正なフラグです。");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("feature_flags")
    .update({
      enabled,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("key", key as FeatureFlagKey);

  if (error) {
    throw new Error("機能フラグの更新に失敗しました。");
  }

  revalidatePath("/admin/settings");
}
