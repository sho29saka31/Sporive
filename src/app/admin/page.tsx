import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminStats, resolveDateRange } from "@/lib/admin-stats";
import { getTodayDate } from "@/lib/week";
import AdminCharts from "@/components/admin/AdminChartsLoader";
import AdminRangeSelector from "@/components/admin/AdminRangeSelector";

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

const EXPORT_TYPES = [
  { type: "summary", label: "日別サマリー" },
  { type: "workout_logs", label: "実績ログ" },
  { type: "debts", label: "負債" },
  { type: "ai_proposals", label: "AI提案ログ" },
];

/**
 * 管理者ダッシュボード（Phase 9、requirements.md §9-3）。
 * アクセス制御（is_admin）は layout.tsx で実施済み。
 * 集計は全利用者データを横断するため service_role クライアントで行う。
 * ?from=YYYY-MM-DD&to=YYYY-MM-DD で集計期間を指定できる（最大92日、既定は直近14日）。
 */
export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const range = resolveDateRange(from, to);
  const admin = createAdminClient();
  const stats = await getAdminStats(admin, range);

  const todayDau = stats.dauSeries[stats.dauSeries.length - 1]?.count ?? 0;
  const thisWau = stats.wauSeries[stats.wauSeries.length - 1]?.count ?? 0;
  const exportQuery = `from=${range.from}&to=${range.to}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-navy-800">ダッシュボード</h1>
        <p className="text-xs text-navy-400">
          集計期間：{range.from} 〜 {range.to}
        </p>
      </div>

      <AdminRangeSelector
        from={range.from}
        to={range.to}
        today={getTodayDate()}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatTile label="登録利用者数" value={stats.totalUsers} unit="人" />
        <StatTile label="期間末日のDAU" value={todayDau} unit="人" />
        <StatTile label="期間末週のWAU" value={thisWau} unit="人" />
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

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-navy-800">
          データエクスポート（CSV）
        </h2>
        <p className="mt-1 text-xs text-navy-400">
          表示中の集計期間（{range.from} 〜 {range.to}）のデータをCSVでダウンロードします。
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {EXPORT_TYPES.map((e) => (
            <a
              key={e.type}
              href={`/api/admin/export?type=${e.type}&${exportQuery}`}
              className="rounded-lg border border-navy-200 px-4 py-2 text-xs font-medium text-navy-600 hover:bg-navy-50"
            >
              {e.label}をダウンロード
            </a>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-navy-300">
        アクティブの定義：その日にトレーニング実績を記録した利用者。リテンション＝期間末週の前週にアクティブだった利用者のうち末週もアクティブな割合。負債解消率＝期間内に発生した負債（{stats.totalDebts}件）のうち解消済みの割合。AI提案の採用率＝期間内の提案ログ（{stats.aiProposalCount}件）のうち採用されたものの割合。
      </p>
    </div>
  );
}
