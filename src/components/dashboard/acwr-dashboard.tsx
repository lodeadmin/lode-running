"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type {
  AcwrHistoryPoint,
  AcwrSummary,
  WeeklyLoadPoint,
  WorkoutSuggestion,
} from "@/lib/acwr";

type AcwrDashboardProps = {
  summary: AcwrSummary;
  weeklyLoad: WeeklyLoadPoint[];
  acwrHistory: AcwrHistoryPoint[];
  suggestions: WorkoutSuggestion[];
};

const toneClasses: Record<AcwrSummary["status"]["tone"], string> = {
  positive: "text-emerald-600",
  caution: "text-amber-600",
  warning: "text-orange-600",
  danger: "text-rose-600",
  muted: "text-slate-600",
};

const ratioScaleMax = 2.5;

const ratioBands = [
  { min: 0, max: 0.8, color: "#FEF3C7" },
  { min: 0.8, max: 1.3, color: "#DCFCE7" },
  { min: 1.3, max: 1.5, color: "#FEE7C2" },
  { min: 1.5, max: 2.5, color: "#FEE2E2" },
];

const formatRatio = (value: number | null) =>
  value !== null ? value.toFixed(2) : "—";

const formatLoad = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return "—";
  return `${Math.round(value).toLocaleString()} AU`;
};

const formatDateLabel = (value: string | null) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export function AcwrDashboard({
  summary,
  weeklyLoad,
  acwrHistory,
  suggestions,
}: AcwrDashboardProps) {
  const ratioPosition =
    summary.ratio !== null ? Math.min(summary.ratio / ratioScaleMax, 1) : 0;
  const safeCapacity =
    summary.remainingCapacity !== null
      ? `${Math.round(summary.remainingCapacity).toLocaleString()} AU`
      : "Log more data";
  const latestSync = summary.lastUpdated ? formatDateLabel(summary.lastUpdated) : "Not available";

  const acwrChartData = acwrHistory.map((point) => ({
    ...point,
    ratioValue: point.ratio ?? null,
  }));

  const weeklyLoadData = weeklyLoad.map((point) => ({
    ...point,
    loadValue: point.totalLoad,
  }));

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="card-surface rounded-[8px]">
        <CardHeader className="pb-2">
          <CardTitle>Your ACWR</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap justify-between gap-6">
            <div>
              <p className="text-5xl font-semibold text-slate-900">
                {formatRatio(summary.ratio)}
              </p>
              <p className="text-sm text-muted-foreground">Current Week Ratio</p>
              <p className="text-sm text-slate-500">
                Aim for {summary.targetRange.min.toFixed(1)}-
                {summary.targetRange.max.toFixed(1)} ACWR.
              </p>
            </div>
            <div className="grid gap-3 text-right text-sm">
              <div>
                <p className="text-muted-foreground">Acute</p>
                <p className="text-2xl font-semibold text-sky-600">
                  {Math.round(summary.acuteLoad).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Chronic</p>
                <p className="text-2xl font-semibold text-rose-500">
                  {Math.round(summary.chronicLoad).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div>
            <div className="relative h-3 rounded-full">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `linear-gradient(
                    90deg,
                    #FECACA 0%,
                    #FECACA ${(0.8 / ratioScaleMax) * 100}%,
                    #DCFCE7 ${(1.3 / ratioScaleMax) * 100}%,
                    #FDE68A ${(1.5 / ratioScaleMax) * 100}%,
                    #FECACA 100%
                  )`,
                }}
              />
              <div
                className="absolute top-1/2 size-4 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-white bg-slate-900 shadow"
                style={{ left: `${ratioPosition * 100}%` }}
              />
            </div>
            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
              <p className={`text-sm font-semibold ${toneClasses[summary.status.tone]}`}>
                {summary.status.label}
              </p>
              <p className="text-sm text-slate-600">{summary.status.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Synced through {latestSync}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-surface rounded-[8px]">
        <CardHeader className="pb-2">
          <CardTitle>Example Workouts</CardTitle>
          <p className="text-sm text-muted-foreground">This Week</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-sky-50 p-4">
            <p className="text-xs uppercase tracking-wide text-sky-600">
              Remaining Safe Capacity
            </p>
            <p className="text-3xl font-semibold text-sky-700">{safeCapacity}</p>
            <p className="text-sm text-slate-600">
              Stay below {summary.targetRange.max.toFixed(1)} ACWR to avoid overload.
            </p>
          </div>

          <ul className="space-y-3">
            {suggestions.slice(0, 3).map((suggestion) => (
              <li
                key={`${suggestion.title}-${suggestion.workoutType}`}
                className="rounded-md border border-slate-200 p-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{suggestion.title}</p>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {suggestion.workoutType}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>Duration: {suggestion.duration}</p>
                    <p>Distance: {suggestion.distance}</p>
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-600">{suggestion.description}</p>
              </li>
            ))}
          </ul>

          <Button variant="ghost" className="w-full justify-between px-0 text-sky-600" asChild>
            <a href="/reports" aria-label="Learn more about ACWR">
              Learn more about ACWR
              <span aria-hidden>→</span>
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card className="card-surface rounded-[8px]">
        <CardHeader className="pb-2">
          <CardTitle>ACWR History (12 weeks)</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={acwrChartData} className="text-xs">
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="weekLabel" tick={{ fill: "#64748b" }} />
              <YAxis
                tick={{ fill: "#64748b" }}
                domain={[0, 2.5]}
                ticks={[0, 0.8, 1.0, 1.3, 1.5, 2]}
              />
              <Tooltip
                formatter={(value) => {
                  const numeric =
                    typeof value === "number"
                      ? value
                      : value !== null && value !== undefined
                        ? Number(value)
                        : null;
                  return Number.isFinite(numeric)
                    ? (numeric as number).toFixed(2)
                    : "Not enough data";
                }}
              />
              {ratioBands.map((band) => (
                <ReferenceArea
                  key={`${band.min}-${band.max}`}
                  y1={band.min}
                  y2={band.max}
                  fill={band.color}
                  fillOpacity={0.35}
                />
              ))}
              <Bar
                dataKey="ratioValue"
                name="ACWR"
                fill="#06B6D4"
                radius={[6, 6, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-surface rounded-[8px]">
        <CardHeader className="pb-2">
          <CardTitle>Weekly Load History</CardTitle>
          <p className="text-sm text-muted-foreground">
            Training load per week (Arbitrary Units)
          </p>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyLoadData} className="text-xs">
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="weekLabel" tick={{ fill: "#64748b" }} />
              <YAxis tick={{ fill: "#64748b" }} />
              <Tooltip formatter={(value: number) => formatLoad(value)} />
              <Line
                type="monotone"
                dataKey="loadValue"
                name="Weekly Load"
                stroke="#2563EB"
                strokeWidth={3}
                dot={{ strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
