"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

declare global {
  interface Window {
    // gtag()の標準実装(lib/consent.ts)はdataLayer.push(arguments)の形で
    // 配列そのものをpushするため、要素型はRecord<string, unknown>ではなくunknownとする。
    dataLayer?: unknown[];
  }
}

/**
 * App RouterのSPA遷移はページ全体を再読み込みしないため、GTMの標準的な
 * ページビュートリガー（gtm.js読み込み時の1回のみ）だけでは初回アクセス以外が
 * 計測されない。遷移のたびにdataLayerへ"page_view"イベントを送信するので、
 * GTM側でこのイベント名をトリガーにしたカスタムイベントトリガーを作成し、
 * GA4設定タグ（またはGA4イベントタグ）に紐付けること。
 */
export default function GtmPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    window.dataLayer = window.dataLayer || [];
    const query = searchParams.toString();
    window.dataLayer.push({
      event: "page_view",
      page_path: query ? `${pathname}?${query}` : pathname,
    });
  }, [pathname, searchParams]);

  return null;
}
