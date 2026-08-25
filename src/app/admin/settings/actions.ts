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
    .update({ enabled, updated_by: userId })
    .eq("key", key as FeatureFlagKey);

  if (error) {
    throw new Error("機能フラグの更新に失敗しました。");
  }

  revalidatePath("/admin/settings");
}

/** お知らせを新規作成する */
export async function createAnnouncement(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const userId = await requireSuperAdmin();

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

  // 警告レベルはblocked_pages、お知らせ・注意レベルはaffected_pagesのみを保存する
  // （用途が異なるため混在させない）
  const selectedPages = formData
    .getAll("pages")
    .map((v) => String(v))
    .filter((v) => (ANNOUNCEMENT_PAGE_VALUES as readonly string[]).includes(v));

  const admin = createAdminClient();
  const { error } = await admin.from("site_announcements").insert({
    title,
    body,
    level,
    affected_pages: level === "warning" ? [] : selectedPages,
    blocked_pages: level === "warning" ? selectedPages : [],
    created_by: userId,
  });

  if (error) {
    return { error: "お知らせの作成に失敗しました。" };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/settings/notifications");
  return { success: "お知らせを作成しました。" };
}

/** お知らせの有効/無効を切り替える */
export async function toggleAnnouncementActive(
  id: string,
  isActive: boolean
): Promise<void> {
  await requireSuperAdmin();

  const admin = createAdminClient();
  const { error } = await admin
    .from("site_announcements")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    throw new Error("お知らせの更新に失敗しました。");
  }

  revalidatePath("/admin/settings");
  revalidatePath("/settings/notifications");
}
