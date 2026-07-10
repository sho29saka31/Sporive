"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** パスワード再設定メールの送信フォーム（requirements.md §4） */
export default function ResetPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          "/signup/set-password?reason=reset"
        )}`,
      });
      if (error) throw error;
      setSent(true);
    } catch {
      setError("送信に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <p className="text-sm leading-relaxed text-navy-600">
        入力いただいたメールアドレス宛にパスワード再設定用のメールを送信しました（該当するアカウントが存在する場合）。メール内のリンクからパスワードを再設定してください。
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label htmlFor="email" className="text-xs font-medium text-navy-500">
          メールアドレス
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-navy-200 px-3 py-2 text-sm focus:border-navy-500 focus:outline-none"
        />
      </div>
      {error && <p className="text-xs text-accent-coral">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="mt-1 rounded-lg bg-navy-700 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-navy-600 disabled:opacity-60"
      >
        {loading ? "送信中..." : "パスワード再設定メールを送信"}
      </button>
    </form>
  );
}
