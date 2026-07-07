import Header from "@/components/Header";
import FooterTabs from "@/components/FooterTabs";
import DeviceGuard from "@/components/DeviceGuard";

/**
 * 利用者画面の共通レイアウト。
 * - スマホ以外のデバイスは誘導画面を表示（requirements.md §9-3）
 * - header / footer はスクロール時も常に固定表示（requirements.md §9-1, §9-2）
 */
export default function UserLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DeviceGuard>
      <div className="mx-auto min-h-dvh max-w-md">
        <Header />
        <main className="px-4 pt-header pb-footer">{children}</main>
        <FooterTabs />
      </div>
    </DeviceGuard>
  );
}
