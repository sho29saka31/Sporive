"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { sendGTMEvent } from "@next/third-parties/google";

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
    const query = searchParams.toString();
    sendGTMEvent({
      event: "page_view",
      page_path: query ? `${pathname}?${query}` : pathname,
    });
  }, [pathname, searchParams]);

  return null;
}
