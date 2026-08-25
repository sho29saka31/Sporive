"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** お知らせを開いた（既読にした）ことを記録する */
export async function markAnnouncementRead(announcementId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // 既に既読の場合はread_atを保持したいため、重複時は何もしない
  await supabase.from("announcement_reads").upsert(
    { user_id: user.id, announcement_id: announcementId },
    { onConflict: "user_id,announcement_id", ignoreDuplicates: true }
  );

  revalidatePath("/settings/notifications");
  // ヘッダーのベルバッジ・全ページ上部のお知らせバーは(user)レイアウトに
  // 常駐しているため、レイアウト単位で再検証して未読状態を反映させる
  revalidatePath("/", "layout");
}
