"use client";

import { useState } from "react";
import Link from "next/link";
import { markAnnouncementRead } from "@/app/(user)/settings/notifications/actions";
import type { UnreadAnnouncement } from "@/lib/site-announcements";

const LEVEL_STYLES: Record<UnreadAnnouncement["level"], string> = {
  info: "bg-navy-700 text-white",
  notice: "bg-accent-teal text-white",
  warning: "bg-accent-coral text-white",
};

/** お知らせバーの一覧表示。×で閉じると即座に非表示にし、既読として記録する */
export default function AnnouncementBarList({
  items,
}: {
  items: UnreadAnnouncement[];
}) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const visible = items.filter((item) => !dismissedIds.has(item.id));

  if (visible.length === 0) return null;

  function dismiss(id: string) {
    setDismissedIds((prev) => new Set(prev).add(id));
    markAnnouncementRead(id);
  }

  return (
    <div className="flex flex-col gap-1.5 pt-2">
      {visible.map((item) => (
        <div
          key={item.id}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs shadow-sm ${LEVEL_STYLES[item.level]}`}
        >
          <Link
            href={`/settings/notifications?notice=${item.noticeCode}`}
            prefetch={false}
            className="flex-1 truncate font-medium"
          >
            {item.title}
          </Link>
          <button
            type="button"
            onClick={() => dismiss(item.id)}
            aria-label="このお知らせを閉じる"
            className="shrink-0 rounded-full p-1 leading-none opacity-80 hover:opacity-100"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
