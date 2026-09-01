import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import DebtList, { type DebtEntry } from "@/components/debts/DebtList";
import RecoveryAdviceButton from "@/components/debts/RecoveryAdviceButton";

export const metadata: Metadata = { title: "負債管理" };

function formatDate(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(m)}/${Number(d)}`;
}

/** 負債管理：未達成分の一覧・解消・AIリカバリー提案（requirements.md §6、Phase 7） */
export default async function DebtsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const DEBT_COLUMNS =
    "id, plan_item_id, missed_on, sets_remaining, reps_remaining, resolved_at";
  // 未消化の負債は蓄積されても取りこぼしがないよう上限なしで全件取得し、
  // 解消済みは直近の履歴表示用途のため件数を絞って別クエリにする
  // （1つのクエリをlimitしてから未消化/解消済みに振り分けると、解消済みが
  // 多い利用者では古い未消化の負債がlimit枠から押し出されてしまうため）
  const [{ data: unresolvedRows }, { data: resolvedRows }] =
    await Promise.all([
      supabase
        .from("debts")
        .select(DEBT_COLUMNS)
        .eq("user_id", user!.id)
        .is("resolved_at", null)
        .order("missed_on", { ascending: false }),
      supabase
        .from("debts")
        .select(DEBT_COLUMNS)
        .eq("user_id", user!.id)
        .not("resolved_at", "is", null)
        .order("missed_on", { ascending: false })
        .limit(20),
    ]);
  const debtRows = [...(unresolvedRows ?? []), ...(resolvedRows ?? [])];

  const itemIds = Array.from(
    new Set(debtRows.map((d) => d.plan_item_id).filter(Boolean))
  ) as string[];
  const { data: items } =
    itemIds.length > 0
      ? await supabase
          .from("plan_items")
          .select("id, exercise_name")
          .in("id", itemIds)
      : { data: null };
  const nameById = new Map(
    (items ?? []).map((item) => [item.id, item.exercise_name])
  );

  const toEntry = (d: NonNullable<typeof debtRows>[number]): DebtEntry => ({
    id: d.id,
    exerciseName: d.plan_item_id
      ? nameById.get(d.plan_item_id) ?? "運動"
      : "運動",
    missedOn: d.missed_on,
    setsRemaining: d.sets_remaining,
    repsRemaining: d.reps_remaining,
  });

  const unresolved = unresolvedRows ?? [];
  const resolved = resolvedRows ?? [];

  return (
    <div className="py-6">
      <h1 className="text-xl font-bold">負債管理</h1>
      <p className="mt-1 text-xs text-navy-400">
        未達成だったトレーニングは「負債」として記録され、翌日以降に補填して取り返せます。
      </p>

      <div className="mt-4 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-navy-800">
          未消化の負債（{unresolved.length}件）
        </h2>
        {unresolved.length === 0 ? (
          <p className="mt-2 text-sm leading-relaxed text-navy-400">
            未消化の負債はありません。この調子で続けましょう！
          </p>
        ) : (
          <>
            <div className="mt-2">
              <DebtList debts={unresolved.map(toEntry)} />
            </div>
            <div className="mt-4">
              <RecoveryAdviceButton />
            </div>
          </>
        )}
      </div>

      {resolved.length > 0 && (
        <div className="mt-4 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-navy-800">解消済み</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {resolved.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between border-b border-navy-100 pb-2 text-xs last:border-0"
              >
                <span className="text-navy-500">
                  {d.plan_item_id
                    ? nameById.get(d.plan_item_id) ?? "運動"
                    : "運動"}
                  （{formatDate(d.missed_on)}分）
                </span>
                <span className="rounded-full bg-accent-teal/10 px-2 py-0.5 font-medium text-accent-teal">
                  解消済み
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
