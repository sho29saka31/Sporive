import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 静的アセット・画像・favicon・SEO関連ルート（robots.txt・sitemap.xml・
     * OGP画像・apple-touch-icon）を除く全パスに適用。
     * これらは未ログインの検索エンジン・SNSクローラーが直接アクセスするため、
     * ここで除外しないと認証ガードに引っかかり /login へリダイレクトされてしまう
     * （実際にSearch Consoleのサイトマップ読み込みがHTMLとして失敗する不具合として発覚）。
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.png|icons/|apple-icon.png|manifest.webmanifest|sw.js|robots.txt|sitemap.xml|.*opengraph-image).*)",
  ],
};
