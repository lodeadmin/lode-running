"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type PerformanceDatum = {
  day: string;
  recovery: number;
  effort: number;
};

type PerformanceChartProps = {
  data: PerformanceDatum[];
};

export function PerformanceChart({ data }: PerformanceChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorRecovery" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id="colorEffort" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <Tooltip
          contentStyle={{
            borderRadius: "1rem",
            borderColor: "#e2e8f0",
          }}
        />
        <Area
          type="monotone"
          dataKey="recovery"
          stroke="#7c3aed"
          strokeWidth={3}
          fillOpacity={1}
          fill="url(#colorRecovery)"
        />
        <Area
          type="monotone"
          dataKey="effort"
          stroke="#38bdf8"
          strokeWidth={3}
          fillOpacity={1}
          fill="url(#colorEffort)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
