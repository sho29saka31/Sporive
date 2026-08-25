"use client";

import { useTransition } from "react";
import { toggleAnnouncementActive } from "@/app/admin/settings/actions";
import { announcementPageLabel } from "@/lib/site-announcements";
import AnnouncementForm from "@/components/admin/AnnouncementForm";

export type AdminAnnouncementRow = {
  id: string;
  title: string;
  body: string;
  level: "info" | "notice" | "warning";
  affectedPages: string[];
  blockedPages: string[];
  isActive: boolean;
  createdAt: string;
};

const LEVEL_LABELS: Record<AdminAnnouncementRow["level"], string> = {
  info: "お知らせ",
  notice: "注意",
  warning: "警告",
};

const LEVEL_STYLES: Record<AdminAnnouncementRow["level"], string> = {
  info: "bg-navy-50 text-navy-700",
  notice: "bg-accent-teal/10 text-accent-teal",
  warning: "bg-accent-coral/10 text-accent-coral",
};

function ActiveToggle({ row }: { row: AdminAnnouncementRow }) {
  const [isPending, startTransition] = useTransition();

  function handleChange(checked: boolean) {
    startTransition(async () => {
      await toggleAnnouncementActive(row.id, checked);
    });
  }

  return (
    <label className="flex items-center gap-2 text-xs text-navy-500">
      <input
        type="checkbox"
        checked={row.isActive}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.checked)}
        className="h-4 w-4 accent-navy-700"
      />
      有効
    </label>
  );
}

/** お知らせタブ：作成フォーム＋既存お知らせ一覧（要件定義書 §10-3） */
export default function AnnouncementsPanel({
  announcements,
}: {
  announcements: AdminAnnouncementRow[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-navy-800">新規作成</h2>
        <div className="mt-3">
          <AnnouncementForm />
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-navy-800">
          お知らせ一覧（{announcements.length}件）
        </h2>
        {announcements.length === 0 ? (
          <p className="mt-2 text-sm text-navy-400">まだお知らせはありません。</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {announcements.map((a) => {
              const pages =
                a.level === "warning" ? a.blockedPages : a.affectedPages;
              return (
                <div
                  key={a.id}
                  className="rounded-lg border border-navy-100 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${LEVEL_STYLES[a.level]}`}
                      >
                        {LEVEL_LABELS[a.level]}
                      </span>
                      <span className="text-sm font-bold text-navy-800">
                        {a.title}
                      </span>
                    </div>
                    <ActiveToggle row={a} />
                  </div>
                  <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-navy-500">
                    {a.body}
                  </p>
                  {pages.length > 0 && (
                    <p className="mt-2 text-[10px] text-navy-400">
                      {a.level === "warning" ? "開けなくするページ" : "影響範囲"}：
                      {pages.map(announcementPageLabel).join("・")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
