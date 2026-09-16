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
 *
 * 以前はMFA未登録の管理者を「mfaPending」判定の対象外にしていた（currentLevelが
 * 恒久的にaal1のままになるため）が、これは裏を返すと管理者がTOTPを一切登録
 * しなければパスワード1要素のみで管理APIに到達できてしまうということであり、
 * 全利用者データをCSV出力できる/api/admin/exportの保護として不十分だった
 * （セキュリティ監査3周目で指摘。adacはTOTP未登録も要登録として扱い
 * /mfa-challengeへ強制する設計を既に採っており、それに合わせる）。
 * 管理者ロールに限りTOTP登録自体を必須化し、未登録・AAL2未達成のいずれも
 * ブロックする。
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

  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
  const hasVerifiedTotp = (factors?.totp ?? []).some((f) => f.status === "verified");
  if (factorsError || !hasVerifiedTotp) {
    throw new AdminAuthError(403, "mfa_required");
  }

  const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalError || aal?.currentLevel !== "aal2") {
    throw new AdminAuthError(403, "mfa_required");
  }

  return { id: user.id };
}
