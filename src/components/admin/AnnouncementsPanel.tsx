"use client";

import { useState, useTransition } from "react";
import {
  deleteAllAnnouncements,
  deleteAnnouncement,
  deleteAnnouncements,
  toggleAnnouncementActive,
} from "@/app/admin/settings/actions";
import { announcementPageLabel } from "@/lib/site-announcements";
import AnnouncementForm from "@/components/admin/AnnouncementForm";

export type AdminAnnouncementRow = {
  id: string;
  title: string;
  body: string;
  level: "info" | "notice" | "warning";
  blockedPages: string[];
  isActive: boolean;
  publishedAt: string;
  scheduledAt: string | null;
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

function formatPublishedAt(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ActiveToggle({ row }: { row: AdminAnnouncementRow }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(checked: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        await toggleAnnouncementActive(row.id, checked);
      } catch {
        setError("更新に失敗しました。");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
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
      {error && <p className="text-[10px] text-accent-coral">{error}</p>}
    </div>
  );
}

function DeleteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!window.confirm("このお知らせを削除します。よろしいですか？")) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteAnnouncement(id);
      } catch {
        setError("削除に失敗しました。");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="text-xs font-medium text-accent-coral underline disabled:opacity-60"
      >
        {isPending ? "削除中..." : "削除"}
      </button>
      {error && <p className="text-[10px] text-accent-coral">{error}</p>}
    </div>
  );
}

function DeleteAllButton({ count }: { count: number }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (
      !window.confirm(
        `すべてのお知らせ（${count}件）を削除します。この操作は取り消せません。よろしいですか？`
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteAllAnnouncements();
      } catch {
        setError("全削除に失敗しました。");
      }
    });
  }

  if (count === 0) return null;

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="text-xs font-medium text-accent-coral underline disabled:opacity-60"
      >
        {isPending ? "削除中..." : "すべて削除"}
      </button>
      {error && <p className="text-[10px] text-accent-coral">{error}</p>}
    </div>
  );
}

function BulkDeleteButton({
  selectedIds,
  onDone,
}: {
  selectedIds: string[];
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (
      !window.confirm(
        `選択したお知らせ（${selectedIds.length}件）を削除します。この操作は取り消せません。よろしいですか？`
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteAnnouncements(selectedIds);
        onDone();
      } catch {
        setError("削除に失敗しました。");
      }
    });
  }

  if (selectedIds.length === 0) return null;

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-lg bg-accent-coral px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {isPending
          ? "削除中..."
          : `選択した${selectedIds.length}件を削除`}
      </button>
      {error && <p className="text-[10px] text-accent-coral">{error}</p>}
    </div>
  );
}

/** お知らせタブ：作成フォーム＋既存お知らせ一覧（編集・削除・有効切替）（要件定義書 §10-3） */
export default function AnnouncementsPanel({
  announcements,
}: {
  announcements: AdminAnnouncementRow[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allSelected =
    announcements.length > 0 && selectedIds.size === announcements.length;

  function toggleSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? new Set(announcements.map((a) => a.id)) : new Set());
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-navy-800">新規作成</h2>
        <div className="mt-3">
          <AnnouncementForm />
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-navy-800">
            お知らせ一覧（{announcements.length}件）
          </h2>
          <div className="flex items-center gap-3">
            <BulkDeleteButton
              selectedIds={Array.from(selectedIds)}
              onDone={() => setSelectedIds(new Set())}
            />
            <DeleteAllButton count={announcements.length} />
          </div>
        </div>
        {announcements.length === 0 ? (
          <p className="mt-2 text-sm text-navy-400">まだお知らせはありません。</p>
        ) : (
          <>
            <label className="mt-3 flex items-center gap-2 text-xs text-navy-500">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => toggleSelectAll(e.target.checked)}
                className="h-4 w-4 accent-navy-700"
              />
              すべて選択
            </label>
            <div className="mt-2 flex flex-col gap-2">
              {announcements.map((a) =>
                editingId === a.id ? (
                  <div
                    key={a.id}
                    className="rounded-lg border border-navy-300 bg-navy-50 p-3"
                  >
                    <AnnouncementForm
                      editing={{
                        id: a.id,
                        title: a.title,
                        body: a.body,
                        level: a.level,
                        blockedPages: a.blockedPages,
                        scheduledAt: a.scheduledAt,
                      }}
                      onDone={() => setEditingId(null)}
                    />
                  </div>
                ) : (
                  <div key={a.id} className="rounded-lg border border-navy-100 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(a.id)}
                          onChange={(e) => toggleSelect(a.id, e.target.checked)}
                          className="h-4 w-4 accent-navy-700"
                        />
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
                  {a.level === "warning" && a.blockedPages.length > 0 && (
                    <p className="mt-2 text-[10px] text-navy-400">
                      開けなくするページ：
                      {a.blockedPages.map(announcementPageLabel).join("・")}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-[10px] text-navy-300">
                      {a.scheduledAt && new Date(a.scheduledAt).getTime() > new Date().getTime() ? (
                        a.isActive ? (
                          <span className="font-medium text-accent-teal">
                            予約中：{formatPublishedAt(a.scheduledAt)}に公開予定
                          </span>
                        ) : (
                          // 無効化されていると予約時刻が来ても自動公開されないため、
                          // 「予約中」のような自動公開を示唆する表示にはしない
                          <span className="font-medium text-navy-400">
                            無効化済み（予約日時：{formatPublishedAt(a.scheduledAt)}。有効化すると公開されます）
                          </span>
                        )
                      ) : (
                        <>発信日時：{formatPublishedAt(a.publishedAt)}</>
                      )}
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setEditingId(a.id)}
                        className="text-xs font-medium text-navy-600 underline"
                      >
                        編集
                      </button>
                      <DeleteButton id={a.id} />
                    </div>
                  </div>
                </div>
              )
            )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
