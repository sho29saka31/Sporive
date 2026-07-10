import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminStats } from "@/lib/admin-stats";
import AdminCharts from "@/components/admin/AdminChartsLoader";

export const dynamic = "force-dynamic";

function StatTile({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-xs text-navy-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-navy-800">
        {value}
        {unit && (
          <span className="text-sm font-normal text-navy-400">{unit}</span>
        )}
      </p>
    </div>
  );
}

/**
 * 管理者ダッシュボード（Phase 9、requirements.md §9-3）。
 * アクセス制御（is_admin）は layout.tsx で実施済み。
 * 集計は全利用者データを横断するため service_role クライアントで行う。
 */
export default async function AdminDashboardPage() {
  const admin = createAdminClient();
  const stats = await getAdminStats(admin);

  const todayDau = stats.dauSeries[stats.dauSeries.length - 1]?.count ?? 0;
  const thisWau = stats.wauSeries[stats.wauSeries.length - 1]?.count ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-navy-800">ダッシュボード</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatTile label="登録利用者数" value={stats.totalUsers} unit="人" />
        <StatTile label="今日のDAU" value={todayDau} unit="人" />
        <StatTile label="今週のWAU" value={thisWau} unit="人" />
        <StatTile
          label="週次リテンション"
          value={stats.retentionRate ?? "—"}
          unit={stats.retentionRate !== null ? "%" : undefined}
        />
        <StatTile
          label="負債解消率"
          value={stats.debtResolutionRate ?? "—"}
          unit={stats.debtResolutionRate !== null ? "%" : undefined}
        />
        <StatTile
          label="AI提案の採用率"
          value={stats.aiAcceptanceRate ?? "—"}
          unit={stats.aiAcceptanceRate !== null ? "%" : undefined}
        />
      </div>

      <AdminCharts stats={stats} />

      <p className="text-[10px] text-navy-300">
        アクティブの定義：その日にトレーニング実績を記録した利用者。リテンション＝先週アクティブだった利用者のうち今週もアクティブな割合。負債解消率＝これまでに発生した負債（{stats.totalDebts}件）のうち解消済みの割合。AI提案の採用率＝提案ログ（{stats.aiProposalCount}件）のうち採用されたものの割合。
      </p>
    </div>
  );
}
