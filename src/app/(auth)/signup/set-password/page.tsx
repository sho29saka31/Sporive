"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PasswordField from "@/components/auth/PasswordField";

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
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password,
        data: { password_set: true },
      });

      if (error) {
        if (error.code === "current_password_required") {
          // 過去の試行等で既にパスワードが設定済みだった場合の救済：
          // パスワード自体は変更せず、判定用フラグだけ立てて次へ進む
          const { error: flagError } = await supabase.auth.updateUser({
            data: { password_set: true },
          });
          if (!flagError) {
            window.location.href = "/onboarding/profile";
            return;
          }
        }

        setError(
          error.code === "weak_password"
            ? PASSWORD_HINT
            : "パスワードの設定に失敗しました。時間をおいて再度お試しください。"
        );
        setLoading(false);
        return;
      }

      // クライアントルーターのキャッシュ起因の遷移不具合を避けるため、
      // 認証状態が変わった直後はフルページ遷移でmiddlewareを再評価させる。
      window.location.href = "/onboarding/profile";
    } catch {
      setError("パスワードの設定に失敗しました。時間をおいて再度お試しください。");
      setLoading(false);
    }
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
        <PasswordField
          label="新しいパスワード"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          minLength={8}
          hint={PASSWORD_HINT}
        />
        <PasswordField
          label="パスワード（確認）"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          minLength={8}
        />
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
