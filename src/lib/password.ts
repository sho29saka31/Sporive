export const PASSWORD_HINT =
  "8文字以上で、半角英大文字・半角英小文字・数字・記号をそれぞれ1文字以上含めてください。";

/** パスワード要件の各項目（UIのインラインチェック表示にも利用する） */
export const PASSWORD_REQUIREMENTS: {
  key: string;
  label: string;
  test: (pw: string) => boolean;
}[] = [
  { key: "length", label: "8文字以上", test: (pw) => pw.length >= 8 },
  { key: "upper", label: "半角英大文字", test: (pw) => /[A-Z]/.test(pw) },
  { key: "lower", label: "半角英小文字", test: (pw) => /[a-z]/.test(pw) },
  { key: "digit", label: "数字", test: (pw) => /[0-9]/.test(pw) },
  { key: "symbol", label: "記号", test: (pw) => /[^a-zA-Z0-9]/.test(pw) },
];

/** パスワード要件を満たしているかを項目ごとに返す */
export function checkPasswordRequirements(
  password: string
): { key: string; label: string; met: boolean }[] {
  return PASSWORD_REQUIREMENTS.map((r) => ({
    key: r.key,
    label: r.label,
    met: r.test(password),
  }));
}

/** パスワード要件はSupabase側のPassword Requirements設定に合わせている */
export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "パスワードは8文字以上で入力してください。";
  }
  if (
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^a-zA-Z0-9]/.test(password)
  ) {
    return PASSWORD_HINT;
  }
  return null;
}

/**
 * Supabaseの weak_password エラーを reasons に応じたメッセージに変換する。
 * reasons に "pwned" が含まれる場合、文字種の条件はすべて満たしていても
 * 「漏えいパスワードデータベースに一致した」ことが理由であり、文字種不足を示す
 * PASSWORD_HINT を出すと利用者に誤解を与えるため区別する。
 * https://supabase.com/docs/guides/auth/password-security
 */
export function describeWeakPasswordError(reasons?: readonly string[] | null): string {
  if (reasons?.includes("pwned")) {
    return "このパスワードは過去の情報漏えいで確認されているため使用できません。別のパスワードをお試しください。";
  }
  return PASSWORD_HINT;
}

export type PasswordStrength = {
  /** 0=空 / 1=弱 / 2=中 / 3=強 */
  score: 0 | 1 | 2 | 3;
  label: "" | "弱" | "中" | "強";
};

/**
 * パスワード強度の簡易評価。要件の充足数に加え、長さ・文字種の多様性を加味する。
 * 「password123」のような要件を一部満たすだけの弱いパスワードを「弱」に留める。
 */
export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: "" };

  const metCount = PASSWORD_REQUIREMENTS.filter((r) => r.test(password)).length;

  let points = 0;
  points += metCount; // 要件充足（0〜5）
  if (password.length >= 12) points += 1;
  if (password.length >= 16) points += 1;
  // よくある弱いパターンは減点
  if (/^[a-zA-Z]+\d+$/.test(password)) points -= 1; // 英字＋数字の単純連結
  if (/(.)\1{2,}/.test(password)) points -= 1; // 同一文字の3連続以上

  // 必須要件をすべて満たしていない場合は「強」にしない
  const allMet = metCount === PASSWORD_REQUIREMENTS.length;

  if (points <= 3) return { score: 1, label: "弱" };
  if (points <= 5 || !allMet) return { score: 2, label: "中" };
  return { score: 3, label: "強" };
}
