"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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

/** よく使う告知のひな形。ボタン1つでタイトル・本文・レベルを一括入力する（新規作成時のみ表示） */
const TEMPLATES: {
  key: string;
  label: string;
  title: string;
  body: string;
  level: "info" | "notice" | "warning";
}[] = [
  {
    key: "app_failure",
    label: "アプリ障害",
    title: "アプリ障害のお知らせ",
    body:
      "いつもSporiveをご利用いただき、誠にありがとうございます。\n\n" +
      "現在、下記の不具合が発生しており、一部機能をご利用いただけない状態となっております。\n\n" +
      "【発生している事象】\n（例：トレーニング計画の保存ができない）\n\n" +
      "【発生日時】\n\n\n" +
      "ご利用中の皆様には大変ご迷惑をおかけしておりますこと、深くお詫び申し上げます。復旧次第、あらためてご案内いたします。今しばらくお待ちくださいますようお願い申し上げます。",
    level: "warning",
  },
  {
    key: "new_feature",
    label: "新機能リリース",
    title: "新機能リリースのお知らせ",
    body:
      "いつもSporiveをご利用いただき、誠にありがとうございます。\n\n" +
      "このたび、新機能「」を追加いたしましたのでお知らせいたします。\n\n" +
      "【概要】\n\n\n" +
      "【ご利用方法】\n\n\n" +
      "今後もより使いやすいサービスを目指してまいります。引き続きSporiveをよろしくお願いいたします。",
    level: "info",
  },
  {
    key: "update",
    label: "アップデート",
    title: "アップデートのお知らせ",
    body:
      "いつもSporiveをご利用いただき、誠にありがとうございます。\n\n" +
      "アプリのアップデートを実施いたしました。主な変更点は以下のとおりです。\n\n" +
      "・\n・\n\n" +
      "より快適にご利用いただけるよう、今後も改善を続けてまいります。引き続きよろしくお願いいたします。",
    level: "info",
  },
  {
    key: "legal_revision",
    label: "法令文改訂",
    title: "利用規約・プライバシーポリシー改定のお知らせ",
    body:
      "いつもSporiveをご利用いただき、誠にありがとうございます。\n\n" +
      "このたび、利用規約およびプライバシーポリシーの内容を下記のとおり改定いたしましたのでお知らせいたします。\n\n" +
      "【改定日】\n\n\n" +
      "【主な変更点】\n\n\n" +
      "改定後の内容は、アプリ内の「利用規約」「プライバシーポリシー」ページにてご確認いただけます。お手数ですが、内容のご確認をお願い申し上げます。",
    level: "notice",
  },
  {
    key: "maintenance",
    label: "メンテナンス",
    title: "メンテナンスのお知らせ",
    body:
      "いつもSporiveをご利用いただき、誠にありがとうございます。\n\n" +
      "下記の日程でメンテナンスを実施いたします。メンテナンス中はサービスをご利用いただけませんので、あらかじめご了承ください。\n\n" +
      "【日時】\n\n\n" +
      "【影響範囲】\n\n\n" +
      "ご利用の皆様にはご不便をおかけいたしますが、何卒よろしくお願い申し上げます。",
    level: "notice",
  },
  {
    key: "emergency_maintenance",
    label: "緊急メンテナンス",
    title: "緊急メンテナンスのお知らせ",
    body:
      "いつもSporiveをご利用いただき、誠にありがとうございます。\n\n" +
      "現在、緊急メンテナンスを実施しており、サービスをご利用いただけない状態となっております。\n\n" +
      "【開始日時】\n\n\n" +
      "【対応状況】\n復旧作業を進めております。\n\n" +
      "ご利用の皆様には大変ご迷惑をおかけしておりますこと、深くお詫び申し上げます。復旧次第、あらためてご案内いたします。",
    level: "warning",
  },
];

export type AnnouncementFormValues = {
  id: string;
  title: string;
  body: string;
  level: "info" | "notice" | "warning";
  blockedPages: string[];
  /** 予約日時（ISO文字列、UTC）。未予約はnull */
  scheduledAt: string | null;
};

/** ISO文字列（UTC）を <input type="datetime-local"> 用のJST文字列に変換する */
function toJstLocalInputValue(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

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
  // テンプレートボタンでタイトル・本文を一括入力できるようにするため、
  // この2つだけ制御コンポーネントにする（他の項目はdefaultValueのままでよい）
  const [title, setTitle] = useState(editing?.title ?? "");
  const [body, setBody] = useState(editing?.body ?? "");
  const formRef = useRef<HTMLFormElement>(null);

  const isWarning = level === "warning";

  function applyTemplate(template: (typeof TEMPLATES)[number]) {
    setTitle(template.title);
    setBody(template.body);
    setLevel(template.level);
  }

  useEffect(() => {
    if (!state?.success) return;
    if (editing && onDone) {
      onDone();
      return;
    }
    // 新規作成成功時、入力値が残ったままだと管理者が「反映されていない」と
    // 誤解して再送信し、同一内容のお知らせが重複作成されてしまう
    // （全利用者への重複通知・既読リセットにつながる）ため、フォームをクリアする
    if (!editing) {
      formRef.current?.reset();
      // 送信成功という1回限りのイベントに対する後始末で、無限ループにはならない
      /* eslint-disable react-hooks/set-state-in-effect */
      setLevel("info");
      setTitle("");
      setBody("");
      /* eslint-enable react-hooks/set-state-in-effect */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stateの変化のみで発火させる
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      {!editing && (
        <div>
          <p className="text-xs font-medium text-navy-500">テンプレート</p>
          <p className="mt-0.5 text-[10px] text-navy-300">
            タイトル・本文・レベルを一括で入力します。送信前に内容を編集できます。
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => applyTemplate(t)}
                className="rounded-full border border-navy-200 px-3 py-1 text-xs text-navy-600 hover:bg-navy-50"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

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
          value={title}
          onChange={(e) => setTitle(e.target.value)}
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
          value={body}
          onChange={(e) => setBody(e.target.value)}
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
        <label
          htmlFor="scheduled_at"
          className="text-xs font-medium text-navy-500"
        >
          予約日時（任意）
        </label>
        <p className="mt-0.5 text-[10px] text-navy-300">
          指定すると、その日時になるまで利用者には表示されません。未指定の場合は保存時に即時公開されます。
        </p>
        <input
          id="scheduled_at"
          name="scheduled_at"
          type="datetime-local"
          defaultValue={
            editing?.scheduledAt
              ? toJstLocalInputValue(editing.scheduledAt)
              : undefined
          }
          className="mt-1 w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:border-navy-500 focus:outline-none"
        />
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
