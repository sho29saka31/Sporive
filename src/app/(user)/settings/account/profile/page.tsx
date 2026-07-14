import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import ProfileEditForm from "@/components/settings/ProfileEditForm";
import SettingsHeader from "@/components/settings/SettingsHeader";

export const metadata: Metadata = { title: "プロフィール設定" };

/** プロフィール設定：表示名・生年・性別・目標の編集（requirements.md §4） */
export default async function ProfileSettingsPage() {
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
      <SettingsHeader title="プロフィール" />

      <div className="mt-4 rounded-xl bg-white p-6 shadow-sm">
        {profile ? (
          <ProfileEditForm
            displayName={profile.display_name}
            birthYear={profile.birth_year}
            goal={profile.goal}
            gender={profile.gender}
          />
        ) : (
          <p className="text-sm leading-relaxed text-navy-400">
            プロフィールが未登録です。トレーニング計画の作成時に登録できます。
          </p>
        )}
      </div>
    </div>
  );
}
