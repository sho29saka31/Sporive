"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "@/app/(user)/settings/account/actions";

/** アカウント削除（取り消し不可のため2段階確認） */
export default function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteAccount();
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "アカウントの削除に失敗しました。"
        );
      }
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="w-full rounded-lg border border-accent-coral px-4 py-3 text-sm font-medium text-accent-coral transition-colors hover:bg-accent-coral/5"
      >
        アカウントを削除
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-accent-coral p-4">
      <p className="text-xs leading-relaxed text-accent-coral">
        アカウントを削除すると、プロフィール・トレーニング計画・記録などすべてのデータが完全に削除され、元に戻せません。本当に削除しますか？
      </p>
      {error && <p className="mt-2 text-xs text-accent-coral">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="flex-1 rounded-lg bg-accent-coral px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {isPending ? "削除中..." : "完全に削除する"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="flex-1 rounded-lg border border-navy-200 px-4 py-2 text-xs font-medium text-navy-600 hover:bg-navy-50 disabled:opacity-60"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
