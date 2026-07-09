"use client";

import { useActionState, useState } from "react";
import {
  changePassword,
  type ActionState,
} from "@/app/(user)/settings/account/actions";
import PasswordField from "@/components/auth/PasswordField";
import { PASSWORD_HINT } from "@/lib/password";

/** パスワードの変更（未設定の場合は新規設定）。requirements.md §4 */
export default function PasswordChangeForm({
  hasPassword,
}: {
  hasPassword: boolean;
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    changePassword,
    null
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {hasPassword && (
        <PasswordField
          name="current_password"
          label="現在のパスワード"
          value={currentPassword}
          onChange={setCurrentPassword}
          autoComplete="current-password"
        />
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
