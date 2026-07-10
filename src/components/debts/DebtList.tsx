"use client";

import { useState, useTransition } from "react";
import { resolveDebt } from "@/app/(user)/debts/actions";

export type DebtEntry = {
  id: string;
  exerciseName: string;
  missedOn: string; // YYYY-MM-DD
  setsRemaining: number;
  repsRemaining: number;
};

function formatRemaining(debt: DebtEntry): string {
  const parts = [
    debt.setsRemaining > 0 ? `+${debt.setsRemaining}セット` : null,
    debt.repsRemaining > 0 ? `+${debt.repsRemaining}回` : null,
  ].filter(Boolean);
  return parts.join(" × ");
}

function formatDate(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(m)}/${Number(d)}`;
}

function DebtRow({ debt }: { debt: DebtEntry }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleResolve() {
    setError(null);
    startTransition(async () => {
      try {
        await resolveDebt(debt.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "更新に失敗しました。");
      }
    });
  }

  return (
    <li className="flex items-center justify-between gap-2 border-b border-navy-100 py-2 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-navy-800">
          {debt.exerciseName}
        </p>
        <p className="text-xs text-navy-400">
          {formatRemaining(debt)}（{formatDate(debt.missedOn)}の未達成分）
        </p>
        {error && <p className="text-xs text-accent-coral">{error}</p>}
      </div>
      <button
        type="button"
        onClick={handleResolve}
        disabled={isPending}
        className="shrink-0 rounded-lg border border-accent-teal px-3 py-1.5 text-xs font-medium text-accent-teal hover:bg-accent-teal/5 disabled:opacity-60"
      >
        {isPending ? "更新中..." : "解消した"}
      </button>
    </li>
  );
}

/** 未消化の負債一覧（ホーム画面・負債管理画面で共用） */
export default function DebtList({ debts }: { debts: DebtEntry[] }) {
  if (debts.length === 0) return null;
  return (
    <ul className="flex flex-col">
      {debts.map((debt) => (
        <DebtRow key={debt.id} debt={debt} />
      ))}
    </ul>
  );
}
