"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * App RouterのSPA遷移はページ全体を再読み込みしないため、gtagの初回configで
 * 送られる自動page_viewだけでは最初の1回しか計測されない。遷移のたびに
 * page_viewイベントを手動送信する（layoutのgtag-initではsend_page_view: falseにして
 * ここでの送信と重複しないようにしている）。
 */
export default function GoogleAnalyticsPageview({
  measurementId,
}: {
  measurementId: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window.gtag !== "function") return;
    const query = searchParams.toString();
    window.gtag("event", "page_view", {
      page_path: query ? `${pathname}?${query}` : pathname,
      send_to: measurementId,
    });
  }, [pathname, searchParams, measurementId]);

  return null;
}
