import { headers } from "next/headers";
import MobileOnlyGuide from "@/components/MobileOnlyGuide";
import { isSmartphone } from "@/lib/device";

/**
 * スマホ以外のデバイスでは誘導画面を表示する共通ガード（requirements.md §2, §9-3）。
 * 利用者画面・認証画面の両方で使用する。
 */
export default async function DeviceGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const userAgent = (await headers()).get("user-agent") ?? "";

  if (!isSmartphone(userAgent)) {
    return <MobileOnlyGuide />;
  }

  return <>{children}</>;
}
