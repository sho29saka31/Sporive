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
 *
 * @param existingScheduledAt 編集対象の既存の予約日時（ISO文字列）。
 *   フォームの値がこれと変わっていない場合は「現在より後」の検証を
 *   スキップする。予約公開が既に過ぎて公開済みになったお知らせを、
 *   予約日時欄に触れずに（本文の誤字修正等で）編集しようとすると、
 *   このガードがないと保存できなくなってしまうため
 */
function parseScheduledAt(
  formData: FormData,
  existingScheduledAt?: string | null
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
  // <input type="datetime-local">は分単位までしか扱えないため、DB側の値に
  // 秒未満の端数が付いている場合でも「変更なし」と判定できるよう、分単位に
  // 丸めてから比較する（フォーム側は常に秒0で送信するため通常は完全一致するが、
  // 将来別の書き込み経路が追加される等で端数が付いた場合の編集ロックを防ぐ）
  const unchanged =
    existingScheduledAt != null &&
    Math.floor(date.getTime() / 60000) ===
      Math.floor(new Date(existingScheduledAt).getTime() / 60000);
  if (!unchanged && date.getTime() <= Date.now()) {
    return { error: "予約日時は現在より後の日時を指定してください。" };
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
  formData: FormData,
  existingScheduledAt?: string | null
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

  const scheduled = parseScheduledAt(formData, existingScheduledAt);
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

  const admin = createAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("site_announcements")
    .select("scheduled_at")
    .eq("id", id)
    .maybeSingle();
  // 取得に失敗した場合、existingScheduledAtがnull扱いになりparseScheduledAtの
  // 「変更なし」判定が効かなくなる（予約日時欄に触れていないのに「現在より後の
  // 日時を指定してください」という誤ったバリデーションエラーが出うる）ため、
  // ここで保存自体を失敗として扱う
  if (existingError) {
    return { error: "お知らせの更新に失敗しました。" };
  }

  const parsed = parseAnnouncementForm(formData, existing?.scheduled_at ?? null);
  if ("error" in parsed) return parsed;

  const { error, count } = await admin
    .from("site_announcements")
    .update(
      {
        title: parsed.title,
        body: parsed.body,
        level: parsed.level,
        blocked_pages: parsed.blockedPages,
        scheduled_at: parsed.scheduledAt,
        published_at: parsed.scheduledAt ?? new Date().toISOString(),
      },
      { count: "exact" }
    )
    .eq("id", id);

  if (error) {
    return { error: "お知らせの更新に失敗しました。" };
  }
  if (!count) {
    return { error: "対象のお知らせが見つかりません。" };
  }

  const { error: readsError } = await admin
    .from("announcement_reads")
    .delete()
    .eq("announcement_id", id);
  if (readsError) {
    // site_announcements自体の更新は既に成功しているため巻き戻さないが、
    // 既読状態がリセットできておらず再周知の意図（読み直してもらう）を
    // 達成できていないため、それが伝わるメッセージにする
    return {
      error: "お知らせは更新しましたが、既読状態のリセットに失敗しました。",
    };
  }

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

  // 予約公開日時がまだ未来の項目を再有効化する場合は、予約日時を維持する。
  // 無条件でscheduled_atをnullにすると、一覧上は「有効」チェックがONに見える
  // 予約中のお知らせを一度OFF→ONにしただけで、意図せず即時公開されてしまうため
  let scheduledAtToKeep: string | null = null;
  if (isActive) {
    const { data: existing, error: existingError } = await admin
      .from("site_announcements")
      .select("scheduled_at")
      .eq("id", id)
      .maybeSingle();
    // 取得に失敗した場合、scheduledAtToKeepがnullのまま「予約日時なし」として
    // 処理が進み、本来まだ先の予約日時だったお知らせが意図せず即時公開されて
    // しまう（エラーも一切表示されない）ため、ここで処理を中断する
    if (existingError) {
      throw new Error("お知らせの更新に失敗しました。");
    }
    if (existing?.scheduled_at && new Date(existing.scheduled_at).getTime() > Date.now()) {
      scheduledAtToKeep = existing.scheduled_at;
    }
  }

  const { error, count } = await admin
    .from("site_announcements")
    .update(
      isActive
        ? {
            is_active: true,
            published_at: scheduledAtToKeep ?? new Date().toISOString(),
            scheduled_at: scheduledAtToKeep,
          }
        : { is_active: false },
      { count: "exact" }
    )
    .eq("id", id);

  if (error) {
    throw new Error("お知らせの更新に失敗しました。");
  }
  if (!count) {
    throw new Error("対象のお知らせが見つかりません。");
  }

  if (isActive) {
    const { error: readsError } = await admin
      .from("announcement_reads")
      .delete()
      .eq("announcement_id", id);
    if (readsError) {
      // is_active自体の更新は成功しているため巻き戻さないが、既読状態が
      // 残ったままだと再有効化＝再周知の意図を達成できていないため、
      // 単なる成功として扱わずエラーを呼び出し元に伝える
      throw new Error("お知らせは更新しましたが、既読状態のリセットに失敗しました。");
    }
  }

  revalidateAnnouncementSurfaces();
}

/** お知らせを削除する（既読状態もON DELETE CASCADEで連動して削除される） */
export async function deleteAnnouncement(id: string): Promise<void> {
  await requireSuperAdmin();

  const admin = createAdminClient();
  const { error, count } = await admin
    .from("site_announcements")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    throw new Error("お知らせの削除に失敗しました。");
  }
  if (!count) {
    throw new Error("対象のお知らせが見つかりません。");
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
  const { error, count } = await admin
    .from("feature_flags")
    .update(
      {
        enabled,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      },
      { count: "exact" }
    )
    .eq("key", key as FeatureFlagKey);

  if (error) {
    throw new Error("機能フラグの更新に失敗しました。");
  }
  if (!count) {
    // FEATURE_FLAG_KEYSに含まれるがDB側にseed行がない（将来のフラグ追加漏れ等）
    // 場合、更新は0件ヒットのままエラーなく成功扱いになり、UIのトグルだけが
    // 静かに元の状態へ巻き戻ってしまうため、明示的にエラーとして扱う
    throw new Error("対象の機能フラグが見つかりません。");
  }

  revalidatePath("/admin/settings");
}
