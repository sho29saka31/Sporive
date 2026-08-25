"use client";

import { useActionState, useEffect, useState } from "react";
import {
  createAnnouncement,
  updateAnnouncement,
  type SettingsActionState,
} from "@/app/admin/settings/actions";
import { ANNOUNCEMENT_PAGES } from "@/lib/site-announcements";

const LEVELS = [
  { value: "info", label: "お知らせ", hint: "新機能案内・定期メンテナンス予告など通常の告知" },
  { value: "notice", label: "注意", hint: "一部機能に影響する軽微な不具合・一時的な制限など" },
  { value: "warning", label: "警告", hint: "障害・緊急メンテナンス・重要な対応依頼など" },
] as const;

export type AnnouncementFormValues = {
  id: string;
  title: string;
  body: string;
  level: "info" | "notice" | "warning";
  blockedPages: string[];
};

/** お知らせの新規作成・編集フォーム（要件定義書 §10-3） */
export default function AnnouncementForm({
  editing,
  onDone,
}: {
  /** 指定時は編集モード（既存の値で初期化し、更新アクションを呼ぶ） */
  editing?: AnnouncementFormValues;
  /** 編集完了・キャンセル時に呼ばれる（一覧側で編集フォームを閉じるために使う） */
  onDone?: () => void;
}) {
  const action = editing
    ? updateAnnouncement.bind(null, editing.id)
    : createAnnouncement;
  const [state, formAction, isPending] = useActionState<
    SettingsActionState,
    FormData
  >(action, null);
  const [level, setLevel] = useState<"info" | "notice" | "warning">(
    editing?.level ?? "info"
  );

  const isWarning = level === "warning";

  useEffect(() => {
    if (state?.success && editing && onDone) {
      onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stateの変化のみで発火させる
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
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
          defaultValue={editing?.title}
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
          defaultValue={editing?.body}
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

      {isWarning && (
        <div>
          <p className="text-xs font-medium text-navy-500">
            開けなくするページ
          </p>
          <p className="mt-0.5 text-[10px] text-navy-300">
            選択したページは、このお知らせが有効な間アクセスできなくなります。
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
                  defaultChecked={editing?.blockedPages.includes(p.value)}
                  className="h-3.5 w-3.5 accent-navy-700"
                />
                {p.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {state?.error && <p className="text-xs text-accent-coral">{state.error}</p>}
      {state?.success && !editing && (
        <p className="text-xs text-accent-teal">{state.success}</p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="self-start rounded-lg bg-navy-700 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-navy-600 disabled:opacity-60"
        >
          {isPending
            ? editing
              ? "更新中..."
              : "作成中..."
            : editing
              ? "更新する"
              : "お知らせを作成"}
        </button>
        {editing && onDone && (
          <button
            type="button"
            onClick={onDone}
            className="self-start rounded-lg border border-navy-200 px-4 py-2 text-xs font-medium text-navy-500 hover:bg-navy-50"
          >
            キャンセル
          </button>
        )}
      </div>
    </form>
  );
}
