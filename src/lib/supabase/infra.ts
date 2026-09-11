import { createClient } from "@supabase/supabase-js";

/**
 * saka2931-infra（adacと共有）の読み取り専用クライアント。
 * anonキーのみを使用し、RLSによりservice_announcementsへのSELECT以外の
 * 操作は一切許可されない。お知らせの作成・編集・削除はadacの管理画面から
 * service_roleキー経由でのみ行う。
 */
export function createInfraReadOnlyClient() {
  const url = process.env.NEXT_PUBLIC_INFRA_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_INFRA_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_INFRA_SUPABASE_URL / NEXT_PUBLIC_INFRA_SUPABASE_ANON_KEY が設定されていません。"
    );
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false },
  });
}
