"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type MfaFactor = {
  id: string;
  friendlyName: string;
};

type EnrollState = {
  factorId: string;
  qrCode: string;
  secret: string;
};

/**
 * MFA（多要素認証、TOTP方式）の設定UI（要件定義書 §4-1）。
 * 認証アプリ（Google Authenticator等）でQRコードを読み取り、
 * 表示された6桁のコードを入力して有効化する。
 */
export default function MfaSettings({
  initialFactors,
}: {
  initialFactors: MfaFactor[];
}) {
  const [factors, setFactors] = useState(initialFactors);
  const [enrolling, setEnrolling] = useState<EnrollState | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function startEnroll() {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const supabase = createClient();
      // 前回の登録をキャンセルボタンを押さずに離脱した場合、検証未完了の
      // TOTP因子がサーバー側に残ったままになる。放置すると際限なく蓄積し、
      // 将来のenroll()が失敗する原因になりうるため、新規登録前に一掃する
      const { data: existing } = await supabase.auth.mfa.listFactors();
      const unverified = (existing?.totp ?? []).filter(
        (f) => f.status !== "verified"
      );
      for (const f of unverified) {
        await supabase.auth.mfa.unenroll({ factorId: f.id }).catch(() => {});
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
      });
      if (error || !data) throw error ?? new Error("enroll failed");
      setEnrolling({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
    } catch {
      setError("認証アプリの登録開始に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!enrolling) return;
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: enrolling.factorId });
      if (challengeError || !challenge) {
        throw challengeError ?? new Error("challenge failed");
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrolling.factorId,
        challengeId: challenge.id,
        code: code.trim(),
      });
      if (verifyError) {
        setError("認証コードが正しくありません。");
        setLoading(false);
        return;
      }

      setFactors((prev) => [
        ...prev,
        { id: enrolling.factorId, friendlyName: "認証アプリ" },
      ]);
      setEnrolling(null);
      setCode("");
      setSuccess("多要素認証を有効にしました。次回ログイン時から認証コードの入力が必要になります。");
    } catch {
      setError("認証に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelEnroll() {
    if (enrolling) {
      const supabase = createClient();
      // unenroll()はAuthError以外の例外（ネットワーク瞬断等）を再throwすることが
      // あり、ここで捕捉しないとキャンセル操作自体がフリーズしてしまう
      // （どのみち次回startEnroll時に未検証因子は一掃されるため、ここでの
      // 失敗は無視してよい）
      await supabase.auth.mfa
        .unenroll({ factorId: enrolling.factorId })
        .catch(() => {});
    }
    setEnrolling(null);
    setCode("");
    setError(null);
  }

  async function handleRemove(factorId: string) {
    if (!window.confirm("多要素認証を無効にします。よろしいですか？")) return;
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      setFactors((prev) => prev.filter((f) => f.id !== factorId));
      setSuccess("多要素認証を無効にしました。");
    } catch {
      setError("無効化に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  if (enrolling) {
    return (
      <form onSubmit={handleVerify} className="flex flex-col gap-3">
        <p className="text-xs leading-relaxed text-navy-500">
          Google Authenticator等の認証アプリでQRコードを読み取り、表示された6桁のコードを入力してください。
        </p>
        <div className="flex justify-center rounded-lg border border-navy-200 bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- SupabaseがSVGのdata URIを返すためnext/imageの対象外 */}
          <img src={enrolling.qrCode} alt="認証アプリ設定用QRコード" width={180} height={180} />
        </div>
        <p className="break-all text-center text-[10px] text-navy-300">
          QRコードを読み取れない場合は、このキーを手入力してください：{enrolling.secret}
        </p>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          required
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
          className="w-full rounded-lg border border-navy-200 px-3 py-3 text-center text-lg tracking-[0.3em] focus:border-navy-500 focus:outline-none"
        />
        {error && <p className="text-xs text-accent-coral">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="flex-1 rounded-lg bg-navy-700 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-navy-600 disabled:opacity-60"
          >
            {loading ? "確認中..." : "有効にする"}
          </button>
          <button
            type="button"
            onClick={handleCancelEnroll}
            className="rounded-lg border border-navy-200 px-4 py-3 text-sm font-medium text-navy-500 hover:bg-navy-50"
          >
            キャンセル
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs leading-relaxed text-navy-400">
        認証アプリ（Google Authenticator等）を使った多要素認証を設定できます。有効にすると、次回以降のログイン時に認証コードの入力が必要になります。
      </p>
      {factors.length > 0 && (
        <div className="flex flex-col gap-2">
          {factors.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between rounded-lg border border-navy-200 px-3 py-2 text-xs"
            >
              <span className="font-medium text-navy-700">{f.friendlyName}</span>
              <button
                type="button"
                onClick={() => handleRemove(f.id)}
                disabled={loading}
                className="font-medium text-accent-coral underline disabled:opacity-60"
              >
                無効にする
              </button>
            </div>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-accent-coral">{error}</p>}
      {success && <p className="text-xs text-accent-teal">{success}</p>}
      <button
        type="button"
        onClick={startEnroll}
        disabled={loading}
        className="rounded-lg border border-navy-200 px-4 py-3 text-sm font-medium text-navy-600 transition-colors hover:bg-navy-50 disabled:opacity-60"
      >
        {loading ? "処理中..." : "認証アプリを追加する"}
      </button>
    </div>
  );
}
