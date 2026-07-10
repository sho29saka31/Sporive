"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AdminStats } from "@/lib/admin-stats";

function dateTick(date: string) {
  return date.slice(5).replace("-", "/");
}

function tooltipLabelFormatter(label: ReactNode) {
  return typeof label === "string" ? dateTick(label) : label;
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="text-sm font-bold text-navy-800">{title}</h2>
      <div className="mt-3 h-56 w-full">{children}</div>
    </div>
  );
}

/** 管理者ダッシュボードの推移グラフ群（Phase 9） */
export default function AdminCharts({ stats }: { stats: AdminStats }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard title="DAU（日次アクティブ利用者・直近14日）">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={stats.dauSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              tickFormatter={dateTick}
              tick={{ fontSize: 10 }}
            />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip labelFormatter={tooltipLabelFormatter} />
            <Line
              type="monotone"
              dataKey="count"
              name="DAU"
              stroke="#14b8a6"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="WAU（週次アクティブ利用者・直近8週）">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stats.wauSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="weekStart"
              tickFormatter={dateTick}
              tick={{ fontSize: 10 }}
            />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip labelFormatter={tooltipLabelFormatter} />
            <Bar dataKey="count" name="WAU" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="達成率（%・直近14日）">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={stats.achievementSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              tickFormatter={dateTick}
              tick={{ fontSize: 10 }}
            />
            <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
            <Tooltip labelFormatter={tooltipLabelFormatter} />
            <Line
              type="monotone"
              dataKey="rate"
              name="達成率"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="負債の発生件数（直近14日）">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stats.debtSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              tickFormatter={dateTick}
              tick={{ fontSize: 10 }}
            />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip labelFormatter={tooltipLabelFormatter} />
            <Bar
              dataKey="created"
              name="発生件数"
              fill="#f97316"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="rounded-xl bg-white p-6 shadow-sm lg:col-span-2">
        <h2 className="text-sm font-bold text-navy-800">
          AI提案の人気メニュー（提案に登場した回数・上位10）
        </h2>
        {stats.popularExercises.length === 0 ? (
          <p className="mt-3 text-sm text-navy-400">
            まだAI提案のログがありません。
          </p>
        ) : (
          <div className="mt-3 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.popularExercises} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip />
                <Bar
                  dataKey="count"
                  name="登場回数"
                  fill="#14b8a6"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
