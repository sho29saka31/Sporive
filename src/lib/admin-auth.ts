import { createClient } from "@/lib/supabase/server";

export class AdminAuthError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

/**
 * middleware.ts（src/lib/supabase/middleware.ts）は/api/**をルートガードの
 * 対象外にしており（認証確認は各Route Handler側の責務という設計）、そのため
 * MFA（AAL2）の検証もmiddlewareでは行われない。admin配下のAPI Routeはこれまで
 * getUser()とis_admin/is_super_adminのみを確認しており、MFAを有効にした
 * 管理者のパスワードだけを入手した攻撃者が、AAL1セッションのまま管理データを
 * 取得できてしまう抜け穴があった（コード監査で発見）。
 * MFA未登録の管理者はcurrentLevelが恒久的にaal1のままになる（MFA自体は必須
 * ではないため）ので、「aal2への昇格待ちなのに完了していない」場合のみを
 * ブロックする（middleware.tsのmfaPending判定と同じロジック）。
 */
export async function requireAdminApiSession(): Promise<{ id: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new AdminAuthError(401, "unauthorized");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, is_super_admin")
    .eq("id", user.id)
    .maybeSingle();
  // is_super_admin は is_admin の上位権限（requirements.md §10-2）のため許可する
  if (!profile?.is_admin && !profile?.is_super_admin) {
    throw new AdminAuthError(403, "forbidden");
  }

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const mfaPending =
    !!aal && aal.nextLevel === "aal2" && aal.currentLevel !== aal.nextLevel;
  if (mfaPending) {
    throw new AdminAuthError(403, "mfa_required");
  }

  return { id: user.id };
}
