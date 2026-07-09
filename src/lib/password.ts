export const PASSWORD_HINT =
  "8文字以上で、半角英大文字・半角英小文字・数字・記号をそれぞれ1文字以上含めてください。";

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
