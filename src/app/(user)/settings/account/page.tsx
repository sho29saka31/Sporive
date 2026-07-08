import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import ProfileEditForm from "@/components/settings/ProfileEditForm";
import EmailEditForm from "@/components/settings/EmailEditForm";

export const metadata: Metadata = { title: "アカウント設定" };

/** アカウント設定：プロフィール・メールアドレスの編集とログアウト（requirements.md §4） */
export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, birth_year, goal, gender")
    .eq("id", user!.id)
    .maybeSingle();

  return (
    <div className="py-6">
      <h1 className="text-xl font-bold">アカウント設定</h1>

      <div className="mt-4 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-navy-800">メールアドレス</h2>
        <div className="mt-3">
          <EmailEditForm currentEmail={user?.email ?? ""} />
        </div>
      </div>

      {profile && (
        <div className="mt-4 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-navy-800">プロフィール</h2>
          <div className="mt-3">
            <ProfileEditForm
              displayName={profile.display_name}
              birthYear={profile.birth_year}
              goal={profile.goal}
              gender={profile.gender}
            />
          </div>
        </div>
      )}

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
