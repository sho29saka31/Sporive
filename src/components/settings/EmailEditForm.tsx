"use client";

import { useActionState } from "react";
import { updateEmail, type ActionState } from "@/app/(user)/settings/account/actions";

export default function EmailEditForm({
  currentEmail,
}: {
  currentEmail: string;
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateEmail,
    null
  );
  const needsReauthOtp = state?.needsReauthOtp === true;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <label htmlFor="email" className="text-xs font-medium text-navy-500">
          メールアドレス
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={currentEmail}
          className="mt-1 w-full rounded-lg border border-navy-200 px-3 py-2 text-sm focus:border-navy-500 focus:outline-none"
        />
        <p className="mt-1 text-[10px] text-navy-300">
          変更すると、現在のメールアドレス・新しいメールアドレスの両方に確認メールが送信されます。両方のリンクをクリックするまで変更は反映されません。
        </p>
      </div>
      {needsReauthOtp && (
        <div>
          <label htmlFor="email-reauth-nonce" className="text-xs font-medium text-navy-500">
            確認コード
          </label>
          <input
            id="email-reauth-nonce"
            name="nonce"
            type="text"
            inputMode="numeric"
            maxLength={8}
            autoComplete="one-time-code"
            required
            className="mt-1 w-full rounded-lg border border-navy-200 px-3 py-2 text-sm tracking-widest focus:border-navy-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-navy-300">現在のメールアドレスに送信した確認コードを入力してください。</p>
        </div>
      )}
      {state?.error && (
        <p className="text-xs text-accent-coral">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-xs text-accent-teal">{state.success}</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg border border-navy-200 px-4 py-3 text-sm font-medium text-navy-600 transition-colors hover:bg-navy-50 disabled:opacity-60"
      >
        {isPending ? "送信中..." : "メールアドレスを変更"}
      </button>
    </form>
  );
}
