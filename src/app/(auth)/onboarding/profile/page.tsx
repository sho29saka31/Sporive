import type { Metadata } from "next";
import { createProfile } from "./actions";

export const metadata: Metadata = { title: "プロフィール登録" };

const CURRENT_YEAR = new Date().getFullYear();
const MIN_AGE = 13;

const GOALS = [
  { value: "lose_weight", label: "減量" },
  { value: "gain_muscle", label: "増量" },
  { value: "strength", label: "筋力向上" },
  { value: "senior_maintenance", label: "筋力維持（シニア向け）" },
];

const GENDERS = [
  { value: "", label: "未回答" },
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
  { value: "other", label: "その他" },
];

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
      <form action={createProfile} className="flex flex-col gap-3">
        <div>
          <label
            htmlFor="display_name"
            className="text-xs font-medium text-navy-500"
          >
            表示名
          </label>
          <input
            id="display_name"
            name="display_name"
            type="text"
            required
            maxLength={30}
            autoComplete="name"
            className="mt-1 w-full rounded-lg border border-navy-200 px-3 py-2 text-sm focus:border-navy-500 focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="birth_year"
            className="text-xs font-medium text-navy-500"
          >
            生年
          </label>
          <input
            id="birth_year"
            name="birth_year"
            type="number"
            required
            min={CURRENT_YEAR - 100}
            max={CURRENT_YEAR - MIN_AGE}
            placeholder={`例: ${CURRENT_YEAR - 30}`}
            autoComplete="bday-year"
            className="mt-1 w-full rounded-lg border border-navy-200 px-3 py-2 text-sm focus:border-navy-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="gender" className="text-xs font-medium text-navy-500">
            性別
          </label>
          <select
            id="gender"
            name="gender"
            defaultValue=""
            className="mt-1 w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:border-navy-500 focus:outline-none"
          >
            {GENDERS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[10px] text-navy-300">
            AIによるトレーニング提案の精度向上に利用します（未回答も可）。
          </p>
        </div>
        <div>
          <label htmlFor="goal" className="text-xs font-medium text-navy-500">
            目標
          </label>
          <select
            id="goal"
            name="goal"
            required
            defaultValue=""
            className="mt-1 w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:border-navy-500 focus:outline-none"
          >
            <option value="" disabled>
              選択してください
            </option>
            {GOALS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="mt-1 rounded-lg bg-navy-700 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-navy-600"
        >
          登録してはじめる
        </button>
      </form>
    </div>
  );
}
