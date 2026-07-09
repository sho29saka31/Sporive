"use client";

import { useActionState, useState } from "react";
import {
  changePassword,
  type ActionState,
} from "@/app/(user)/settings/account/actions";
import PasswordField from "@/components/auth/PasswordField";
import { PASSWORD_HINT } from "@/lib/password";
import { createClient } from "@/lib/supabase/client";

/** パスワードの変更（未設定の場合は新規設定）。requirements.md §4 */
export default function PasswordChangeForm({
  hasPassword,
  email,
}: {
  hasPassword: boolean;
  email: string;
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    changePassword,
    null
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetSending, setResetSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  async function handleSendReset() {
    setResetSending(true);
    setResetError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch {
      setResetError("送信に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setResetSending(false);
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {hasPassword && (
        <>
          <PasswordField
            name="current_password"
            label="現在のパスワード"
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
          />
          <div className="rounded-lg bg-navy-50 p-3">
            <p className="text-xs text-navy-500">
              現在のパスワードが分からない、または正しく動作しない場合は、再設定メールを送信できます。
            </p>
            {resetSent ? (
              <p className="mt-2 text-xs text-accent-teal">
                再設定メールを送信しました。メール内のリンクから新しいパスワードを設定してください。
              </p>
            ) : (
              <button
                type="button"
                onClick={handleSendReset}
                disabled={resetSending}
                className="mt-2 text-xs font-medium text-navy-600 underline disabled:opacity-60"
              >
                {resetSending ? "送信中..." : "再設定メールを送信"}
              </button>
            )}
            {resetError && (
              <p className="mt-2 text-xs text-accent-coral">{resetError}</p>
            )}
          </div>
        </>
      )}
      <PasswordField
        name="new_password"
        label="新しいパスワード"
        value={newPassword}
        onChange={setNewPassword}
        autoComplete="new-password"
        minLength={8}
        hint={PASSWORD_HINT}
      />
      <PasswordField
        name="confirm_password"
        label="新しいパスワード（確認）"
        value={confirmPassword}
        onChange={setConfirmPassword}
        autoComplete="new-password"
        minLength={8}
      />
      {state?.error && <p className="text-xs text-accent-coral">{state.error}</p>}
      {state?.success && (
        <p className="text-xs text-accent-teal">
          {state.success}
          {hasPassword &&
            " 心当たりのない変更の場合は「全デバイスからログアウト」もご利用ください。"}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg border border-navy-200 px-4 py-3 text-sm font-medium text-navy-600 transition-colors hover:bg-navy-50 disabled:opacity-60"
      >
        {isPending ? "変更中..." : hasPassword ? "パスワードを変更" : "パスワードを設定"}
      </button>
    </form>
  );
}
