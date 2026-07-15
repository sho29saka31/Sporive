import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "通知履歴" };

function formatSentAt(sentAt: string): string {
  return new Date(sentAt).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 通知履歴：これまでに送信された通知の内容を一覧表示する（requirements.md §7） */
export default async function NotificationHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: logs } = await supabase
    .from("notification_logs")
    .select("id, title, body, sent_at")
    .eq("user_id", user!.id)
    .order("sent_at", { ascending: false })
    .limit(30);

  return (
    <div className="py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">通知履歴</h1>
        <Link
          href="/settings/account/notifications"
          prefetch={false}
          className="text-xs font-medium text-navy-600 underline"
        >
          通知設定
        </Link>
      </div>

      {logs && logs.length > 0 ? (
        <div className="mt-4 flex flex-col gap-3">
          {logs.map((log) => (
            <div key={log.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-navy-800">{log.title}</p>
                <p className="text-[10px] text-navy-300">
                  {formatSentAt(log.sent_at)}
                </p>
              </div>
              <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-navy-500">
                {log.body}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-center text-sm leading-relaxed text-navy-400">
          まだ通知は送信されていません。
        </p>
      )}
    </div>
  );
}
