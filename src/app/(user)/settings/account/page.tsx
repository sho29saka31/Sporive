import type { Metadata } from "next";

export const metadata: Metadata = { title: "アカウント設定" };

/** アカウント設定：プロフィール・ログイン管理（Phase 1 で実装） */
export default function AccountSettingsPage() {
  return (
    <div className="py-6">
      <h1 className="text-xl font-bold">アカウント設定</h1>
      <div className="mt-4 rounded-xl bg-white p-6 shadow-sm">
        <p className="text-sm leading-relaxed text-navy-400">
          プロフィール・ログイン管理は Phase 1 で実装予定です。
        </p>
      </div>
    </div>
  );
}
