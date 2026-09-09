import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/** クライアントコンポーネント用の Supabase クライアント */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: "sporive" },
      // legal-life（*.saka2931.jp）とセッションCookieを共有し、SSOを実現する
      cookieOptions: {
        domain: ".saka2931.jp",
        path: "/",
        sameSite: "lax",
        secure: true,
      },
    }
  );
}
