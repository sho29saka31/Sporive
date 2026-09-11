import { redirect } from "next/navigation";

// 利用規約はsaka2931.jp共通の窓口(service.saka2931.jp)に統合したため、
// このパスへの既存のリンク・ブックマーク・検索エンジンのインデックス・
// Google OAuth同意画面のリンク先を生かす形で新しいページへリダイレクトする。
export default function TermsOfServicePage() {
  redirect("https://service.saka2931.jp/terms");
}
