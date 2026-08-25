import { getMaintenanceState } from "@/lib/maintenance";

/** 定期メンテナンスの予告バー（要件定義書 §8-3、毎日1:00〜2:30に表示） */
export default function MaintenanceNoticeBar() {
  const { isNotice } = getMaintenanceState();
  if (!isNotice) return null;

  return (
    <div className="bg-accent-teal/10 px-4 py-2 text-center text-[11px] leading-relaxed text-navy-700">
      まもなく定期メンテナンスです（2:30〜3:30
      頃）。この間はトップページ以外ご利用いただけません。
    </div>
  );
}
