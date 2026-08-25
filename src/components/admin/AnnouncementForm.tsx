"use client";

import { useActionState, useState } from "react";
import {
  createAnnouncement,
  type SettingsActionState,
} from "@/app/admin/settings/actions";
import { ANNOUNCEMENT_PAGES } from "@/lib/site-announcements";

const LEVELS = [
  { value: "info", label: "お知らせ", hint: "新機能案内・定期メンテナンス予告など通常の告知" },
  { value: "notice", label: "注意", hint: "一部機能に影響する軽微な不具合・一時的な制限など" },
  { value: "warning", label: "警告", hint: "障害・緊急メンテナンス・重要な対応依頼など" },
] as const;

/** お知らせの新規作成フォーム（要件定義書 §10-3） */
export default function AnnouncementForm() {
  const [state, formAction, isPending] = useActionState<
    SettingsActionState,
    FormData
  >(createAnnouncement, null);
  const [level, setLevel] = useState<"info" | "notice" | "warning">("info");

  const isWarning = level === "warning";

  return (
    <form
      action={formAction}
      key={state?.success ? "reset" : "form"}
      className="flex flex-col gap-4"
    >
      <div>
        <label htmlFor="title" className="text-xs font-medium text-navy-500">
          タイトル
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={60}
          className="mt-1 w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:border-navy-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="body" className="text-xs font-medium text-navy-500">
          本文
        </label>
        <textarea
          id="body"
          name="body"
          required
          maxLength={1000}
          rows={4}
          className="mt-1 w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:border-navy-500 focus:outline-none"
        />
      </div>

      <div>
        <p className="text-xs font-medium text-navy-500">レベル</p>
        <div className="mt-1 flex flex-col gap-2">
          {LEVELS.map((l) => (
            <label
              key={l.value}
              className="flex items-start gap-2 rounded-lg border border-navy-200 p-2"
            >
              <input
                type="radio"
                name="level"
                value={l.value}
                checked={level === l.value}
                onChange={() => setLevel(l.value)}
                className="mt-0.5 accent-navy-700"
              />
              <span>
                <span className="block text-sm font-medium text-navy-800">
                  {l.label}
                </span>
                <span className="block text-xs text-navy-400">{l.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-navy-500">
          {isWarning ? "開けなくするページ" : "影響範囲ページ（任意）"}
        </p>
        <p className="mt-0.5 text-[10px] text-navy-300">
          {isWarning
            ? "選択したページは、このお知らせが有効な間アクセスできなくなります。"
            : "選択したページ名がお知らせ本文の下部に表示されます（機能制限はしません）。"}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ANNOUNCEMENT_PAGES.map((p) => (
            <label
              key={p.value}
              className="flex items-center gap-1 rounded-lg border border-navy-200 px-2 py-1 text-xs text-navy-600"
            >
              <input
                type="checkbox"
                name="pages"
                value={p.value}
                className="h-3.5 w-3.5 accent-navy-700"
              />
              {p.label}
            </label>
          ))}
        </div>
      </div>

      {state?.error && <p className="text-xs text-accent-coral">{state.error}</p>}
      {state?.success && <p className="text-xs text-accent-teal">{state.success}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-lg bg-navy-700 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-navy-600 disabled:opacity-60"
      >
        {isPending ? "作成中..." : "お知らせを作成"}
      </button>
    </form>
  );
}
