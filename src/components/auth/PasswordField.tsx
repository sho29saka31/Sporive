"use client";

import { useId, useState } from "react";
import {
  checkPasswordRequirements,
  evaluatePasswordStrength,
} from "@/lib/password";

const STRENGTH_STYLES: Record<number, { bar: string; text: string; width: string }> = {
  0: { bar: "bg-navy-200", text: "text-navy-300", width: "w-0" },
  1: { bar: "bg-accent-coral", text: "text-accent-coral", width: "w-1/3" },
  2: { bar: "bg-accent-amber", text: "text-accent-amber", width: "w-2/3" },
  3: { bar: "bg-accent-teal", text: "text-accent-teal", width: "w-full" },
};

/** 入力中のパスワード強度メーターと要件チェックリスト（新規パスワード入力欄で使用） */
function PasswordStrengthMeter({ value }: { value: string }) {
  const strength = evaluatePasswordStrength(value);
  const requirements = checkPasswordRequirements(value);
  const style = STRENGTH_STYLES[strength.score];

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-navy-100">
          <div
            className={`h-full rounded-full transition-all duration-300 ${style.bar} ${style.width}`}
          />
        </div>
        {strength.label && (
          <span className={`text-[10px] font-bold ${style.text}`}>
            {strength.label}
          </span>
        )}
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
        {requirements.map((r) => (
          <li
            key={r.key}
            className={`flex items-center gap-1 text-[10px] transition-colors duration-200 ${
              r.met ? "text-accent-teal" : "text-navy-300"
            }`}
          >
            <span
              className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[8px] transition-all duration-200 ${
                r.met
                  ? "scale-100 bg-accent-teal text-white"
                  : "scale-90 border border-navy-200 text-transparent"
              }`}
            >
              ✓
            </span>
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 表示/非表示切り替え付きのパスワード入力欄 */
export default function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  minLength,
  hint,
  name,
  showStrength = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  minLength?: number;
  hint?: string;
  name?: string;
  /** 強度メーターと要件チェックリストを表示する（新規パスワード入力欄向け） */
  showStrength?: boolean;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium text-navy-500">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-navy-200 px-3 py-2 pr-16 text-sm focus:border-navy-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-navy-400 hover:text-navy-600"
        >
          {visible ? "非表示" : "表示"}
        </button>
      </div>
      {showStrength && value.length > 0 && <PasswordStrengthMeter value={value} />}
      {hint && !showStrength && (
        <p className="mt-1 text-xs text-navy-300">{hint}</p>
      )}
    </div>
  );
}
