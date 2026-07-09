"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** メールでログインリンクを送るフォーム（パスワードレスログイン） */
export default function MagicLinkForm() {
  const [expanded, setExpanded] = useState(false);
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
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch {
      setError("送信に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="text-center text-xs text-navy-500 underline"
      >
        メールでログインリンクを受け取る
      </button>
    );
  }

  if (sent) {
    return (
      <p className="text-xs leading-relaxed text-navy-600">
        ログインリンクをメールで送信しました（該当するアカウントが存在する場合）。メール内のリンクを開いてログインしてください。
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        type="email"
        required
        autoComplete="email"
        placeholder="メールアドレス"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded-lg border border-navy-200 px-3 py-2 text-sm focus:border-navy-500 focus:outline-none"
      />
      {error && <p className="text-xs text-accent-coral">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg border border-navy-200 px-4 py-2 text-xs font-medium text-navy-600 transition-colors hover:bg-navy-50 disabled:opacity-60"
      >
        {loading ? "送信中..." : "ログインリンクを送信"}
      </button>
    </form>
  );
}
