"use client";

import { useId, useState } from "react";

/** 表示/非表示切り替え付きのパスワード入力欄 */
export default function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  minLength,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  minLength?: number;
  hint?: string;
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
      {hint && <p className="mt-1 text-xs text-navy-300">{hint}</p>}
    </div>
  );
}
