"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PlanItemDraft, WeeklyPlanDraft } from "@/lib/gemini";
import { DAY_LABELS } from "@/lib/week";
import { saveTrainingPlan } from "@/app/(user)/schedule/actions";

function emptyItem(dayOfWeek: number): PlanItemDraft {
  return {
    dayOfWeek,
    exerciseName: "",
    category: null,
    sets: null,
    reps: null,
    weightKg: null,
    durationMin: null,
  };
}

function toNumberOrNull(value: string): number | null {
  if (value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function PlanBuilder({
  goal,
  initialItems,
}: {
  goal: string;
  initialItems: PlanItemDraft[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<PlanItemDraft[]>(initialItems);
  const [summary, setSummary] = useState("");
  const [weeklyFrequency, setWeeklyFrequency] = useState(3);
  const [aiLoading, setAiLoading] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<WeeklyPlanDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleAiPropose() {
    setAiLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/propose-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeklyFrequency }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "生成に失敗しました。");
      setItems(data.plan.items);
      setSummary(data.plan.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成に失敗しました。");
    } finally {
      setAiLoading(false);
    }
  }

  function updateItem(index: number, patch: Partial<PlanItemDraft>) {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...patch } : it))
    );
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function addItem(dayOfWeek: number) {
    setItems((prev) => [...prev, emptyItem(dayOfWeek)]);
  }

  async function handleRegisterClick() {
    setError(null);
    if (items.length === 0 || items.some((it) => !it.exerciseName.trim())) {
      setError("すべての運動に種目名を入力してください。");
      return;
    }
    setSuggestLoading(true);
    try {
      const res = await fetch("/api/ai/improve-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPlan: { summary, items } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "改善案の取得に失敗しました。");
      setSuggestion(data.suggestion);
    } catch (e) {
      setError(e instanceof Error ? e.message : "改善案の取得に失敗しました。");
    } finally {
      setSuggestLoading(false);
    }
  }

  function confirmSave(plan: WeeklyPlanDraft, source: "ai" | "manual") {
    setError(null);
    startTransition(async () => {
      try {
        await saveTrainingPlan(plan, source, goal, true);
        router.push("/schedule");
      } catch (e) {
        setError(e instanceof Error ? e.message : "保存に失敗しました。");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-navy-800">AIに提案してもらう</h2>
        <div className="mt-3 flex items-center gap-3">
          <label htmlFor="frequency" className="text-xs text-navy-500">
            希望頻度
          </label>
          <select
            id="frequency"
            value={weeklyFrequency}
            onChange={(e) => setWeeklyFrequency(Number(e.target.value))}
            className="rounded-lg border border-navy-200 px-2 py-1 text-sm"
          >
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                週{n}日
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAiPropose}
            disabled={aiLoading}
            className="ml-auto rounded-lg bg-navy-700 px-4 py-2 text-xs font-medium text-white hover:bg-navy-600 disabled:opacity-60"
          >
            {aiLoading ? "生成中..." : "AI提案を生成"}
          </button>
        </div>
        {summary && (
          <p className="mt-3 rounded-lg bg-navy-50 p-3 text-xs text-navy-600">
            {summary}
          </p>
        )}
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-navy-800">週間計画（編集可）</h2>
        <div className="mt-3 flex flex-col gap-4">
          {DAY_LABELS.map((label, dayOfWeek) => {
            const dayItems = items
              .map((item, index) => ({ item, index }))
              .filter(({ item }) => item.dayOfWeek === dayOfWeek);

            return (
              <div key={dayOfWeek}>
                <p className="text-xs font-bold text-navy-500">{label}曜日</p>
                <div className="mt-1 flex flex-col gap-2">
                  {dayItems.map(({ item, index }) => (
                    <div
                      key={index}
                      className="rounded-lg border border-navy-100 p-2"
                    >
                      <input
                        type="text"
                        placeholder="種目名"
                        value={item.exerciseName}
                        onChange={(e) =>
                          updateItem(index, { exerciseName: e.target.value })
                        }
                        className="w-full rounded border border-navy-200 px-2 py-1 text-xs"
                      />
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <label className="flex items-center gap-1 text-[10px] text-navy-400">
                          セット
                          <input
                            type="number"
                            value={item.sets ?? ""}
                            onChange={(e) =>
                              updateItem(index, {
                                sets: toNumberOrNull(e.target.value),
                              })
                            }
                            className="w-full min-w-0 rounded border border-navy-200 px-2 py-1 text-xs text-navy-700"
                          />
                        </label>
                        <label className="flex items-center gap-1 text-[10px] text-navy-400">
                          回数
                          <input
                            type="number"
                            value={item.reps ?? ""}
                            onChange={(e) =>
                              updateItem(index, {
                                reps: toNumberOrNull(e.target.value),
                              })
                            }
                            className="w-full min-w-0 rounded border border-navy-200 px-2 py-1 text-xs text-navy-700"
                          />
                        </label>
                        <label className="flex items-center gap-1 text-[10px] text-navy-400">
                          重量kg
                          <input
                            type="number"
                            value={item.weightKg ?? ""}
                            onChange={(e) =>
                              updateItem(index, {
                                weightKg: toNumberOrNull(e.target.value),
                              })
                            }
                            className="w-full min-w-0 rounded border border-navy-200 px-2 py-1 text-xs text-navy-700"
                          />
                        </label>
                        <label className="flex items-center gap-1 text-[10px] text-navy-400">
                          時間(分)
                          <input
                            type="number"
                            value={item.durationMin ?? ""}
                            onChange={(e) =>
                              updateItem(index, {
                                durationMin: toNumberOrNull(e.target.value),
                              })
                            }
                            className="w-full min-w-0 rounded border border-navy-200 px-2 py-1 text-xs text-navy-700"
                          />
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="mt-2 text-xs text-accent-coral"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addItem(dayOfWeek)}
                    className="self-start text-xs text-navy-500 underline"
                  >
                    + 運動を追加
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {error && <p className="text-xs text-accent-coral">{error}</p>}

      {suggestion ? (
        <div className="rounded-xl border border-navy-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-navy-800">AIからの改善案</h2>
          <p className="mt-2 text-xs text-navy-600">{suggestion.summary}</p>
          <div className="mt-2 flex flex-col gap-2 text-xs text-navy-500">
            {DAY_LABELS.map((label, dayOfWeek) => {
              const dayItems = suggestion.items.filter(
                (item) => item.dayOfWeek === dayOfWeek
              );
              if (dayItems.length === 0) return null;
              return (
                <div key={dayOfWeek}>
                  <p className="font-bold text-navy-700">{label}曜日</p>
                  <ul className="mt-0.5 list-disc pl-5">
                    {dayItems.map((item, i) => (
                      <li key={i}>
                        {item.exerciseName}
                        {item.sets ? ` ${item.sets}セット` : ""}
                        {item.reps ? ` × ${item.reps}回` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => confirmSave(suggestion, "ai")}
              disabled={isPending}
              className="flex-1 rounded-lg bg-navy-700 px-4 py-2 text-xs font-medium text-white hover:bg-navy-600 disabled:opacity-60"
            >
              改善案を採用して登録
            </button>
            <button
              type="button"
              onClick={() => confirmSave({ summary, items }, "manual")}
              disabled={isPending}
              className="flex-1 rounded-lg border border-navy-200 px-4 py-2 text-xs font-medium text-navy-600 hover:bg-navy-50 disabled:opacity-60"
            >
              このまま登録
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleRegisterClick}
          disabled={suggestLoading || isPending}
          className="rounded-lg bg-navy-700 px-4 py-3 text-sm font-medium text-white hover:bg-navy-600 disabled:opacity-60"
        >
          {suggestLoading ? "改善案を確認中..." : "登録する"}
        </button>
      )}
    </div>
  );
}
