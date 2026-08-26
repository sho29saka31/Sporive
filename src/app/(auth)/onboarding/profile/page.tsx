import type { Metadata } from "next";
import OnboardingProfileForm from "@/components/auth/OnboardingProfileForm";

export const metadata: Metadata = { title: "プロフィール登録" };

/**
 * 初回プロフィール入力（requirements.md §4）。
 * ここで登録した目標・生年・性別が Phase 3 のAI提案の入力になる。
 */
export default function OnboardingProfilePage() {
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
