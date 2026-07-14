"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PasswordField from "@/components/auth/PasswordField";
import { PASSWORD_HINT, validatePassword } from "@/lib/password";

/**
 * パスワード設定・再設定画面（requirements.md §4）。
 * - OAuthのみで登録したアカウント：現在のパスワードなしで新規設定できる
 * - すでにパスワードを持つアカウント（Supabaseダッシュボード作成・メール登録など）：
 *   Supabaseのセキュアパスワード変更機能により current_password が必要になる。
 *   最初の試行で current_password_required が返ったら、現在のパスワード入力欄を出して
 *   再試行できるようにする（アカウント種別を事前に判定できないため適応的に対応）。
 */
export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [needsCurrent, setNeedsCurrent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReset] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("reason") === "reset"
  );

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
    if (needsCurrent && !currentPassword) {
      setError("現在のパスワードを入力してください。");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password,
        ...(needsCurrent && currentPassword
          ? { current_password: currentPassword }
          : {}),
        data: { password_set: true },
      });

      if (error) {
        if (error.code === "weak_password") {
          setError(PASSWORD_HINT);
        } else if (error.code === "current_password_required") {
          // このアカウントは既にパスワードを持っている。現在のパスワード入力欄を出して再試行させる。
          setNeedsCurrent(true);
          setError(
            "このアカウントには既にパスワードが設定されています。現在のパスワードを入力して変更してください。"
          );
        } else if (
          needsCurrent &&
          (error.code === "invalid_credentials" ||
            error.message?.toLowerCase().includes("password"))
        ) {
          setError("現在のパスワードが正しくありません。");
        } else {
          setError("パスワードの設定に失敗しました。時間をおいて再度お試しください。");
        }
        setLoading(false);
        return;
      }

      // クライアントルーターのキャッシュ起因の遷移不具合を避けるため、フルページ遷移で
      // middlewareを再評価させる。リセット/既存アカウントはホーム、新規はオンボーディングへ。
      window.location.href = isReset || needsCurrent ? "/home" : "/onboarding/profile";
    } catch {
      setError("パスワードの設定に失敗しました。時間をおいて再度お試しください。");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-navy-800">
          {isReset ? "パスワードの再設定" : "パスワードの設定"}
        </h2>
        <p className="mt-1 text-sm text-navy-400">
          {isReset
            ? "新しいパスワードを入力してください。"
            : "次回以降、メールアドレスとパスワードでもログインできるようになります。"}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {needsCurrent && (
          <PasswordField
            label="現在のパスワード"
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
          />
        )}
        <PasswordField
          label="新しいパスワード"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          minLength={8}
          hint={PASSWORD_HINT}
          showStrength
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
