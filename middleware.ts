import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 静的アセット・画像・favicon・SEO関連ルート（robots.txt・sitemap.xml・
     * OGP画像・apple-touch-icon・ロゴ画像）を除く全パスに適用。
     * これらは未ログインの検索エンジン・SNSクローラーが直接アクセスするほか、
     * next/imageの最適化エンドポイントも内部的に同じパスへリクエストするため、
     * ここで除外しないと認証ガードに引っかかり /login へリダイレクトされてしまう
     * （実際にSearch Consoleのサイトマップ読み込みがHTMLとして失敗する不具合や、
     * ロゴ画像がnext/imageで読み込めない不具合として発覚）。
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.png|icons/|apple-icon.png|logo-.*\\.png|manifest.webmanifest|sw.js|robots.txt|sitemap.xml|.*opengraph-image).*)",
  ],
};
