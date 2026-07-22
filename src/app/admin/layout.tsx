import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { isSmartphone } from "@/lib/device";

export const metadata: Metadata = { title: "Sporive 管理" };

/**
 * 管理者画面のレイアウト（Phase 9、requirements.md §9-3）。
 * - profiles.is_admin が true の利用者のみアクセス可能（それ以外は/homeへ）
 * - PC/タブレット専用（スマホでは案内を表示）
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    redirect("/home");
  }

  const userAgent = (await headers()).get("user-agent") ?? "";
  if (isSmartphone(userAgent)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-50 p-6">
        <div className="max-w-sm rounded-xl bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-bold text-navy-800">
            管理者画面はPC・タブレット専用です
          </p>
          <p className="mt-2 text-xs leading-relaxed text-navy-400">
            お手数ですが、PCまたはタブレットからアクセスしてください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-50">
      <header className="border-b border-navy-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Image src="/logo-wordmark.png" alt="Sporive" width={96} height={40} priority />
            <span className="rounded-full bg-navy-700 px-2 py-0.5 text-xs font-medium text-white">
              管理者
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-navy-500">
            <span>{profile.display_name}</span>
            <Link href="/home" className="underline">
              利用者画面へ
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
