import DeviceGuard from "@/components/DeviceGuard";

/** 認証画面共通レイアウト（ログイン前のため header/footer は表示しない） */
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DeviceGuard>
      <div className="flex min-h-dvh flex-col items-center justify-center bg-navy-50 px-6 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-navy-800">Sporive</h1>
          <p className="mt-1 text-sm text-navy-400">
            理想の体づくりを、AIと一緒に。
          </p>
        </div>
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
          {children}
        </div>
      </div>
    </DeviceGuard>
  );
}
