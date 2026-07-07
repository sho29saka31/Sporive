"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PasswordField from "@/components/auth/PasswordField";

/** メールアドレス＋パスワードでのログインフォーム（requirements.md §4） */
export default function PasswordLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError("メールアドレスまたはパスワードが正しくありません。");
        setLoading(false);
        return;
      }

      // クライアントルーターのキャッシュ起因の遷移不具合を避けるため、
      // 認証状態が変わった直後はフルページ遷移でmiddlewareを再評価させる。
      window.location.href = "/home";
    } catch {
      setError("ログインに失敗しました。時間をおいて再度お試しください。");
      setLoading(false);
    }
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
      <PasswordField
        label="パスワード"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
      />
      {error && <p className="text-xs text-accent-coral">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="mt-1 rounded-lg bg-navy-700 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-navy-600 disabled:opacity-60"
      >
        {loading ? "ログイン中..." : "ログイン"}
      </button>
    </form>
  );
}
