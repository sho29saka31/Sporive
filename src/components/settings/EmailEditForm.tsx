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
          defaultValue={currentEmail}
          className="mt-1 w-full rounded-lg border border-navy-200 px-3 py-2 text-sm focus:border-navy-500 focus:outline-none"
        />
        <p className="mt-1 text-[10px] text-navy-300">
          変更すると新しいメールアドレス宛に確認メールが送信されます。リンクをクリックするまで変更は反映されません。
        </p>
      </div>
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
