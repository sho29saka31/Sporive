"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { markAnnouncementRead } from "@/app/(user)/settings/notifications/actions";

export type AnnouncementItem = {
  id: string;
  noticeCode: string;
  title: string;
  body: string;
  level: "info" | "notice" | "warning";
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

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * 管理者が発行したお知らせの一覧・詳細表示（要件定義書 §8-4）。
 * 開閉状態は ?notice=<8桁の公開ID>（site_announcements.notice_code）で管理する。
 * 本来のid（uuid）を使わないのは、URLを共有・プッシュ通知の遷移先にしても
 * 短く扱いやすくするため。
 */
export default function AnnouncementList({
  announcements,
}: {
  announcements: AnnouncementItem[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const noticeCode = searchParams.get("notice");
  const openItem =
    announcements.find((a) => a.noticeCode === noticeCode) ?? null;

  // このコンポーネント内の操作でURLに?notice=を積んだ場合はtrue。
  // プッシュ通知等からの直リンクで最初から?notice=が付いている場合はfalseのままにし、
  // 閉じる際にrouter.back()でアプリの外（履歴なし）に出てしまわないようにする
  const openedBySelfRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  function handleOpen(item: AnnouncementItem) {
    openedBySelfRef.current = true;
    router.push(`${pathname}?notice=${item.noticeCode}`, { scroll: false });
    if (!item.isRead) {
      markAnnouncementRead(item.id);
    }
  }

  const handleClose = useCallback(() => {
    if (openedBySelfRef.current) {
      router.back();
    } else {
      router.replace(pathname, { scroll: false });
    }
    openedBySelfRef.current = false;
  }, [router, pathname]);

  // モーダル表示中：フォーカストラップ・Escで閉じる・背景スクロールロック
  useEffect(() => {
    if (!openItem) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previouslyFocusedRef.current?.focus();
    };
  }, [openItem, handleClose]);

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4"
          onClick={handleClose}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="announcement-modal-title"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[80vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-xl outline-none"
          >
            <div
              className={`flex items-center justify-between border-b p-4 ${LEVEL_STYLES[openItem.level]}`}
            >
              <span className="text-xs font-bold">
                [{LEVEL_LABELS[openItem.level]}]
              </span>
              <button
                type="button"
                onClick={handleClose}
                aria-label="閉じる"
                className="text-sm text-navy-500"
              >
                閉じる
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <h2
                id="announcement-modal-title"
                className="text-lg font-bold text-navy-800"
              >
                {openItem.title}
              </h2>
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-navy-600">
                {openItem.body}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
