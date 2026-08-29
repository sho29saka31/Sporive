"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** MFA（TOTP）認証コードの入力フォーム */
export default function MfaChallengeForm() {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    async function loadFactor() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.mfa.listFactors();
        const totp = data?.totp.find((f) => f.status === "verified");
        if (error || !totp) {
          setLoadError(true);
          return;
        }
        setFactorId(totp.id);
      } catch {
        setLoadError(true);
      }
    }
    void loadFactor();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });
      if (challengeError || !challenge) {
        throw challengeError ?? new Error("challenge failed");
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: code.trim(),
      });
      if (verifyError) {
        setError("認証コードが正しくありません。");
        setLoading(false);
        return;
      }

      // クライアントルーターのキャッシュ起因の遷移不具合を避けるため、
      // 認証状態が変わった直後はフルページ遷移でmiddlewareを再評価させる。
      // ?next=/admin/... が付いていれば元々アクセスしようとしていたページへ、
      // なければホームへ（実際の遷移先の妥当性はmiddleware側でも再検証される）
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next && next.startsWith("/admin") ? next : "/home";
    } catch {
      setError("認証に失敗しました。時間をおいて再度お試しください。");
      setLoading(false);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs text-accent-coral">
          認証情報の取得に失敗しました。お手数ですが、一度ログアウトしてやり直してください。
        </p>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-lg border border-navy-200 px-4 py-3 text-sm font-medium text-navy-600 hover:bg-navy-50"
        >
          ログアウト
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        maxLength={6}
        required
        placeholder="123456"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
        className="w-full rounded-lg border border-navy-200 px-3 py-3 text-center text-lg tracking-[0.3em] focus:border-navy-500 focus:outline-none"
      />
      {error && <p className="text-xs text-accent-coral">{error}</p>}
      <button
        type="submit"
        disabled={loading || !factorId || code.length !== 6}
        className="rounded-lg bg-navy-700 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-navy-600 disabled:opacity-60"
      >
        {loading ? "確認中..." : "確認する"}
      </button>
      <button
        type="button"
        onClick={handleSignOut}
        className="text-center text-xs text-navy-400 underline"
      >
        別のアカウントでログインし直す
      </button>
    </form>
  );
}
