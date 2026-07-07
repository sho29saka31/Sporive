"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PASSWORD_HINT =
  "8文字以上で、半角英大文字・半角英小文字・数字・記号をそれぞれ1文字以上含めてください。";

function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "パスワードは8文字以上で入力してください。";
  }
  if (
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^a-zA-Z0-9]/.test(password)
  ) {
    return PASSWORD_HINT;
  }
  return null;
}

/**
 * OAuth登録後のパスワード設定画面（requirements.md §4）。
 * 同じメールアドレスに対してパスワードを設定し、以降メール＋パスワードでもログイン可能にする。
 * パスワード要件はSupabase側のPassword Requirements設定（英大文字・小文字・数字・記号必須）に合わせている。
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

    const validationError = validatePassword(password);
    if (validationError) {
      setError(validationError);
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
      setError(
        error.code === "weak_password"
          ? PASSWORD_HINT
          : "パスワードの設定に失敗しました。時間をおいて再度お試しください。"
      );
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
            新しいパスワード
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
          <p className="mt-1 text-xs text-navy-300">{PASSWORD_HINT}</p>
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
