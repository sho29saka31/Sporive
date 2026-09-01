import type { Metadata } from "next";
import MfaChallengeForm from "@/components/auth/MfaChallengeForm";

export const metadata: Metadata = { title: "認証コードの入力" };

/**
 * MFA（TOTP）チャレンジ画面（要件定義書 §4-1）。
 * middlewareでAAL2が必要なのに満たしていない利用者はここへ誘導される。
 */
export default function MfaChallengePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-navy-800">認証コードの入力</h2>
        <p className="mt-1 text-sm text-navy-400">
          認証アプリに表示されている6桁のコードを入力してください。
        </p>
      </div>
      <MfaChallengeForm />
    </div>
  );
}
