"use client";

import type { ReactNode } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface DailyProgressPoint {
  date: string;
  totalReps: number;
  avgWeightKg: number | null;
}

function dateTick(date: string) {
  return date.slice(5).replace("-", "/");
}

function tooltipLabelFormatter(label: ReactNode) {
  return typeof label === "string" ? dateTick(label) : label;
}

export default function ProgressCharts({
  data,
}: {
  data: DailyProgressPoint[];
}) {
  if (data.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-navy-400">
        記録が増えるとここに推移グラフが表示されます。
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-bold text-navy-500">回数の推移</p>
        <div className="mt-2 h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
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
                dataKey="totalReps"
                name="合計回数"
                stroke="#14b8a6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-navy-500">重量(kg)の推移</p>
        <div className="mt-2 h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tickFormatter={dateTick}
                tick={{ fontSize: 10 }}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip labelFormatter={tooltipLabelFormatter} />
              <Line
                type="monotone"
                dataKey="avgWeightKg"
                name="平均重量"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
