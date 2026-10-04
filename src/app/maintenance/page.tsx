import type { Metadata } from "next";
import ErrorPage from "@/components/ErrorPage";

export const metadata: Metadata = {
  title: "メンテナンス中",
  robots: { index: false, follow: false },
};

/** 定期メンテナンス・緊急メンテナンスの両方で、トップページ以外のアクセスをここへ転送する */
export default function MaintenancePage() {
  return (
    <ErrorPage
      code="503 Maintenance"
      title="ただいまメンテナンス中です"
      desc={
        "ご不便をおかけしております。現在サイトメンテナンスを実施しております。\nしばらくしてから再度アクセスしてください。"
      }
      showStatusLink
    />
  );
}
