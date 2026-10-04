import type { Metadata } from "next";
import ErrorPage from "@/components/ErrorPage";

export const metadata: Metadata = {
  title: "ページが見つかりません",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <ErrorPage
      code="404 Not Found"
      title="お探しのページは見つかりませんでした"
      desc={
        "申し訳ありませんが、指定されたURLのページは削除・変更されたか、現在ご利用いただけない可能性があります。\nお手数をおかけしますが、ホームからお探しください。"
      }
    />
  );
}
