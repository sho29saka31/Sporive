import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut, signOutEverywhere } from "./actions";
import ProfileEditForm from "@/components/settings/ProfileEditForm";
import EmailEditForm from "@/components/settings/EmailEditForm";
import PasswordChangeForm from "@/components/settings/PasswordChangeForm";
import DeleteAccountButton from "@/components/settings/DeleteAccountButton";

export const metadata: Metadata = { title: "アカウント設定" };

/** アカウント設定：プロフィール・メールアドレスの編集とログアウト（requirements.md §4） */
export default async function AccountSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ email_changed?: string }>;
}) {
  const { email_changed } = await searchParams;
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

      {email_changed === "1" && (
        <p className="mt-4 rounded-xl bg-accent-teal/10 p-3 text-xs text-accent-teal">
          メールアドレスを変更しました。
        </p>
      )}

      <div className="mt-4 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-navy-800">メールアドレス</h2>
        <div className="mt-3">
          <EmailEditForm currentEmail={user?.email ?? ""} />
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-navy-800">パスワード</h2>
        <div className="mt-3">
          <PasswordChangeForm
            hasPassword={user?.user_metadata?.password_set === true}
          />
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

      <div className="mt-6 flex flex-col gap-3">
        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-lg border border-navy-200 px-4 py-3 text-sm font-medium text-navy-600 transition-colors hover:bg-navy-50"
          >
            ログアウト
          </button>
        </form>
        <form action={signOutEverywhere}>
          <button
            type="submit"
            className="w-full rounded-lg border border-navy-200 px-4 py-3 text-sm font-medium text-navy-600 transition-colors hover:bg-navy-50"
          >
            全デバイスからログアウト
          </button>
        </form>
        <DeleteAccountButton />
      </div>
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
