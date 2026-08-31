import type { Metadata } from "next";
import OnboardingProfileForm from "@/components/auth/OnboardingProfileForm";
import { createClient } from "@/lib/supabase/server";
import { getFeatureFlag } from "@/lib/feature-flags";
import { signOut } from "@/app/(user)/settings/account/actions";

export const metadata: Metadata = { title: "プロフィール登録" };

/**
 * 初回プロフィール入力（requirements.md §4）。
 * ここで登録した目標・生年・性別が Phase 3 のAI提案の入力になる。
 *
 * new_signupフラグは/signupページ（Googleボタン非表示）で新規登録の入口を
 * 塞いでいるが、/loginのGoogleログイン・マジックリンクは既存利用者のログインも
 * 兼ねるため同様にボタンごと塞ぐことができず、Supabase Auth側で初回ログインの
 * 未登録ユーザーとして自動的にauth.usersが作られてしまうことがある。
 * 従来はフォーム送信時（createProfile内）にのみ拒否しており、ここに来た
 * ユーザーはフォーム入力後に初めてエラーに気づいていた。ここでもフラグを
 * 確認し、ページを開いた時点で状況を伝えられるようにする
 */
export default async function OnboardingProfilePage() {
  const supabase = await createClient();
  const signupEnabled = await getFeatureFlag(supabase, "new_signup");

  if (!signupEnabled) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold text-navy-800">プロフィール登録</h2>
        <p className="rounded-lg bg-navy-50 p-4 text-sm leading-relaxed text-navy-600">
          現在、新規登録の受付を一時的に停止しています。時間をおいて再度お試しください。
        </p>
        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-lg border border-navy-200 px-4 py-3 text-sm font-medium text-navy-600 hover:bg-navy-50"
          >
            ログアウト
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-navy-800">プロフィール登録</h2>
        <p className="mt-1 text-sm text-navy-400">
          AIによるトレーニング計画の提案に使用します。
        </p>
      </div>
      <OnboardingProfileForm />
    </div>
  );
}
