/**
 * 利用者画面共通のローディングスケルトン。
 * ページのデータ取得中でも即座に表示され、画面が固まっているように
 * 見えるのを防ぐ（読み込み体感速度の改善）。
 */
export default function Loading() {
  return (
    <div className="animate-pulse py-6">
      <div className="h-6 w-40 rounded bg-navy-100" />
      <div className="mt-4 h-32 rounded-xl bg-white shadow-sm" />
      <div className="mt-4 h-32 rounded-xl bg-white shadow-sm" />
      <div className="mt-4 h-24 rounded-xl bg-white shadow-sm" />
    </div>
  );
}
