/**
 * User-Agent によるデバイス判定。
 * 利用者画面はスマホ専用（requirements.md §2, §9-3）。
 * iPad などのタブレットはスマホ扱いしない（管理者画面側で許可される）。
 */
export function isSmartphone(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  // Android はスマホのみ "mobile" を含む（タブレットは含まない）
  if (ua.includes("android")) {
    return ua.includes("mobile");
  }
  return /iphone|ipod|windows phone|blackberry/.test(ua);
}
