import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export const metadata: Metadata = { title: "アカウント設定" };

const GOAL_LABELS: Record<string, string> = {
  lose_weight: "減量",
  gain_muscle: "増量",
  strength: "筋力向上",
  senior_maintenance: "筋力維持（シニア向け）",
};

/** アカウント設定：プロフィール表示とログアウト（requirements.md §4） */
export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, birth_year, goal")
    .eq("id", user!.id)
    .maybeSingle();

  return (
    <div className="py-6">
      <h1 className="text-xl font-bold">アカウント設定</h1>
      <div className="mt-4 space-y-3 rounded-xl bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs text-navy-300">メールアドレス</p>
          <p className="text-sm font-medium text-navy-800">{user?.email}</p>
        </div>
        {profile && (
          <>
            <div>
              <p className="text-xs text-navy-300">表示名</p>
              <p className="text-sm font-medium text-navy-800">
                {profile.display_name}
              </p>
            </div>
            <div>
              <p className="text-xs text-navy-300">生年</p>
              <p className="text-sm font-medium text-navy-800">
                {profile.birth_year}年
              </p>
            </div>
            <div>
              <p className="text-xs text-navy-300">目標</p>
              <p className="text-sm font-medium text-navy-800">
                {GOAL_LABELS[profile.goal] ?? profile.goal}
              </p>
            </div>
          </>
        )}
      </div>
      <form action={signOut} className="mt-6">
        <button
          type="submit"
          className="w-full rounded-lg border border-accent-coral px-4 py-3 text-sm font-medium text-accent-coral transition-colors hover:bg-accent-coral/5"
        >
          ログアウト
        </button>
      </form>
      <p className="mt-6 text-center text-xs text-navy-300">
        <Link href="/terms" className="underline">
          利用規約
        </Link>
        {" ・ "}
        <Link href="/privacy" className="underline">
          プライバシーポリシー
        </Link>
      </p>
    </div>
  );
}
