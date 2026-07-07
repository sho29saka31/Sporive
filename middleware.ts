import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 静的アセット・画像・faviconを除く全パスに適用
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.png|icons/|manifest.webmanifest|sw.js).*)",
  ],
};
