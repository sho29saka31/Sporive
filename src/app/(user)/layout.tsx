import Header from "@/components/Header";
import FooterTabs from "@/components/FooterTabs";
import DeviceGuard from "@/components/DeviceGuard";
import MaintenanceNoticeBar from "@/components/MaintenanceNoticeBar";
import AnnouncementBar from "@/components/AnnouncementBar";
import PushCleanupWatcher from "@/components/PushCleanupWatcher";

/**
 * 利用者画面の共通レイアウト。
 * - スマホ以外のデバイスは誘導画面を表示（requirements.md §9-3）
 * - header / footer はスクロール時も常に固定表示（requirements.md §9-1, §9-2）
 * - authアプリのデバイス管理から強制ログアウトされた場合に検知してPush購読を
 *   解除するため、この端末のセッションをauth_app.sessionsに登録・監視する
 */
export default function UserLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DeviceGuard>
      <PushCleanupWatcher />
      <div className="mx-auto min-h-dvh max-w-md">
        <Header />
        <main className="px-4 pt-header pb-footer">
          <MaintenanceNoticeBar />
          <AnnouncementBar />
          {children}
        </main>
        <FooterTabs />
      </div>
    </DeviceGuard>
  );
}
