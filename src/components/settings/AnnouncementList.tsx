"use client";

import { useState } from "react";
import { markAnnouncementRead } from "@/app/(user)/settings/notifications/actions";

export type AnnouncementItem = {
  id: string;
  title: string;
  body: string;
  level: "info" | "notice" | "warning";
  affectedPages: string[];
  isRead: boolean;
};

const LEVEL_LABELS: Record<AnnouncementItem["level"], string> = {
  info: "お知らせ",
  notice: "注意",
  warning: "警告",
};

const LEVEL_STYLES: Record<AnnouncementItem["level"], string> = {
  info: "bg-navy-50 text-navy-700 border-navy-200",
  notice: "bg-accent-teal/10 text-accent-teal border-accent-teal/30",
  warning: "bg-accent-coral/10 text-accent-coral border-accent-coral/30",
};

/** 管理者が発行したお知らせの一覧・詳細表示（要件定義書 §8-4） */
export default function AnnouncementList({
  announcements,
}: {
  announcements: AnnouncementItem[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const openItem = announcements.find((a) => a.id === openId) ?? null;

  function handleOpen(item: AnnouncementItem) {
    setOpenId(item.id);
    if (!item.isRead) {
      markAnnouncementRead(item.id);
    }
  }

  if (announcements.length === 0) {
    return (
      <p className="mt-6 text-center text-sm leading-relaxed text-navy-400">
        現在お知らせはありません。
      </p>
    );
  }

  return (
    <>
      <div className="mt-4 flex flex-col gap-2">
        {announcements.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleOpen(item)}
            className={`flex items-center justify-between rounded-xl border p-4 text-left shadow-sm ${LEVEL_STYLES[item.level]}`}
          >
            <span className="flex items-center gap-2">
              <span className="text-[10px] font-bold">
                [{LEVEL_LABELS[item.level]}]
              </span>
              <span className="text-sm font-bold">{item.title}</span>
            </span>
            {!item.isRead && (
              <span className="rounded-full bg-accent-coral px-2 py-0.5 text-[10px] font-bold text-white">
                新規
              </span>
            )}
          </button>
        ))}
      </div>

      {openItem && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-white"
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`flex items-center justify-between border-b p-4 ${LEVEL_STYLES[openItem.level]}`}
          >
            <span className="text-xs font-bold">
              [{LEVEL_LABELS[openItem.level]}]
            </span>
            <button
              type="button"
              onClick={() => setOpenId(null)}
              aria-label="閉じる"
              className="text-sm text-navy-500"
            >
              閉じる
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <h2 className="text-lg font-bold text-navy-800">
              {openItem.title}
            </h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-navy-600">
              {openItem.body}
            </p>
            {openItem.affectedPages.length > 0 && (
              <p className="mt-6 text-xs text-navy-400">
                影響範囲: {openItem.affectedPages.join("・")}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
