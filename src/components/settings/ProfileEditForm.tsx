"use client";

import { useActionState } from "react";
import { updateProfile, type ActionState } from "@/app/(user)/settings/account/actions";

const CURRENT_YEAR = new Date().getFullYear();
const MIN_AGE = 13;

const GOAL_MAX_LENGTH = 500;

const GENDERS = [
  { value: "", label: "未設定" },
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
  { value: "other", label: "その他" },
];

export default function ProfileEditForm({
  displayName,
  birthYear,
  goal,
  gender,
}: {
  displayName: string;
  birthYear: number;
  goal: string;
  gender: string | null;
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateProfile,
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
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
          defaultValue={displayName}
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
          autoComplete="bday-year"
          defaultValue={birthYear}
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
          defaultValue={gender ?? ""}
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
        <textarea
          id="goal"
          name="goal"
          required
          rows={4}
          maxLength={GOAL_MAX_LENGTH}
          defaultValue={goal}
          className="mt-1 w-full rounded-lg border border-navy-200 px-3 py-2 text-sm focus:border-navy-500 focus:outline-none"
        />
        <p className="mt-1 text-[10px] text-navy-300">
          大きくしたい部位や重視したいことなど、具体的な要望があれば自由に書いてください。AIが内容を整理してトレーニング提案に活用します。
        </p>
      </div>
      {state?.error && (
        <p className="text-xs text-accent-coral">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-xs text-accent-teal">{state.success}</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="mt-1 rounded-lg bg-navy-700 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-navy-600 disabled:opacity-60"
      >
        {isPending ? "更新中..." : "プロフィールを更新"}
      </button>
    </form>
  );
}
