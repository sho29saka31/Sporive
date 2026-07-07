"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * OAuth登録後のパスワード設定画面（requirements.md §4）。
 * 同じメールアドレスに対してパスワードを設定し、以降メール＋パスワードでもログイン可能にする。
 */
export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("パスワードは8文字以上で入力してください。");
      return;
    }
    if (password !== confirm) {
      setError("パスワードが一致しません。");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError("パスワードの設定に失敗しました。時間をおいて再度お試しください。");
      setLoading(false);
      return;
    }

    router.push("/onboarding/profile");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-navy-800">パスワードの設定</h2>
        <p className="mt-1 text-sm text-navy-400">
          次回以降、メールアドレスとパスワードでもログインできるようになります。
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label
            htmlFor="password"
            className="text-xs font-medium text-navy-500"
          >
            新しいパスワード（8文字以上）
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-navy-200 px-3 py-2 text-sm focus:border-navy-500 focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="confirm"
            className="text-xs font-medium text-navy-500"
          >
            パスワード（確認）
          </label>
          <input
            id="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1 w-full rounded-lg border border-navy-200 px-3 py-2 text-sm focus:border-navy-500 focus:outline-none"
          />
        </div>
        {error && <p className="text-xs text-accent-coral">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-1 rounded-lg bg-navy-700 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-navy-600 disabled:opacity-60"
        >
          {loading ? "設定中..." : "設定して次へ"}
        </button>
      </form>
    </div>
  );
}
