import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "高度な設定" };

/**
 * 高度な設定（要件定義書 §10-3）。
 * profiles.is_super_admin が true の利用者のみアクセス可能（それ以外は/adminへ）。
 * is_admin によるアクセス制御は親の src/app/admin/layout.tsx で実施済み。
 */
export default async function AdminSettingsLayout({
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
    .select("is_super_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_super_admin) {
    redirect("/admin");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy-800">高度な設定</h1>
        <Link href="/admin" className="text-xs text-navy-500 underline">
          ダッシュボードへ戻る
        </Link>
      </div>
      {children}
    </div>
  );
}
