"use client";

import { useState } from "react";

/** AIに負債のリカバリー案を相談するボタン（Phase 7） */
export default function RecoveryAdviceButton() {
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/recovery", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "取得に失敗しました。");
      setAdvice(data.advice);
    } catch (e) {
      setError(e instanceof Error ? e.message : "取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full rounded-lg bg-navy-700 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-navy-600 disabled:opacity-60"
      >
        {loading ? "AIが考えています..." : "AIにリカバリー案を相談"}
      </button>
      {advice && (
        <div className="mt-3 rounded-lg bg-navy-50 p-3">
          <p className="text-xs font-bold text-navy-700">AIからのリカバリー案</p>
          <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-navy-600">
            {advice}
          </p>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-accent-coral">{error}</p>}
    </div>
  );
}
