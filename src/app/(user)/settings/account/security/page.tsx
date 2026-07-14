import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { signOutEverywhere } from "../actions";
import EmailEditForm from "@/components/settings/EmailEditForm";
import PasswordChangeForm from "@/components/settings/PasswordChangeForm";
import DeleteAccountButton from "@/components/settings/DeleteAccountButton";
import SettingsHeader from "@/components/settings/SettingsHeader";

export const metadata: Metadata = { title: "セキュリティ設定" };

/** セキュリティ設定：メールアドレス・パスワード・セッション・アカウント削除（requirements.md §4） */
export default async function SecuritySettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ email_changed?: string }>;
}) {
  const { email_changed } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="py-6">
      <SettingsHeader title="セキュリティ" />

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
          <PasswordChangeForm email={user?.email ?? ""} />
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-navy-800">セッション</h2>
        <p className="mt-1 text-xs text-navy-400">
          スマホを紛失した場合や、身に覚えのないログインがある場合は、すべての端末からログアウトできます。
        </p>
        <form action={signOutEverywhere} className="mt-3">
          <button
            type="submit"
            className="w-full rounded-lg border border-navy-200 px-4 py-3 text-sm font-medium text-navy-600 transition-colors hover:bg-navy-50"
          >
            全デバイスからログアウト
          </button>
        </form>
      </div>

      <div className="mt-4 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-accent-coral">アカウントの削除</h2>
        <p className="mt-1 text-xs text-navy-400">
          アカウントとすべてのデータ（プロフィール・トレーニング計画・記録など）が完全に削除され、元に戻せません。
        </p>
        <div className="mt-3">
          <DeleteAccountButton />
        </div>
      </div>
    </div>
  );
}
