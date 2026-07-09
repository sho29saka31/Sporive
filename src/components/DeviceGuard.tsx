import { cookies, headers } from "next/headers";
import MobileOnlyGuide from "@/components/MobileOnlyGuide";
import { isSmartphone } from "@/lib/device";

/**
 * スマホ以外のデバイスでは誘導画面を表示する共通ガード（requirements.md §2, §9-3）。
 * 利用者画面・認証画面の両方で使用する。
 * URLに `?demo-mobile-admin` を付けてアクセスすると、PC等でもスマホ表示を確認できる
 * （middlewareが立てるセッションCookieで判定。ブラウザを閉じると解除される）。
 */
export default async function DeviceGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const userAgent = (await headers()).get("user-agent") ?? "";
  const forceMobilePreview =
    (await cookies()).get("force-mobile-preview")?.value === "1";

  if (!isSmartphone(userAgent) && !forceMobilePreview) {
    return <MobileOnlyGuide />;
  }

  return <>{children}</>;
}
