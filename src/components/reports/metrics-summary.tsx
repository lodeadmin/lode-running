"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ChartWorkout = {
  workout_date: string;
  duration_minutes: number | null;
  distance_km: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  avg_speed_kmh: number | null;
  total_session_load: number | null;
  rpe: number | null;
};

type MetricsSummaryProps = {
  workouts: ChartWorkout[];
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

const prepareChartData = (workouts: ChartWorkout[]) =>
  workouts
    .map((workout) => ({
      dateLabel: formatDate(workout.workout_date),
      rawDate: workout.workout_date,
      duration: workout.duration_minutes ?? 0,
      distance: workout.distance_km ?? 0,
      avgHr: workout.avg_heart_rate ?? 0,
      maxHr: workout.max_heart_rate ?? 0,
      avgSpeed: workout.avg_speed_kmh ?? 0,
      load: workout.total_session_load ?? 0,
      rpe: workout.rpe ?? 0,
    }))
    .reverse();

export function MetricsSummary({ workouts }: MetricsSummaryProps) {
  const chartData = prepareChartData(workouts);

  if (!chartData.length) {
    return null;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="card-surface rounded-[5px]">
        <CardHeader>
          <CardTitle>Load vs Heart Rate</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart className="text-xs" data={chartData} margin={{ left: 4, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="dateLabel" tick={{ fill: "#64748b" }} />
              <YAxis yAxisId="left" tick={{ fill: "#64748b" }} />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: "#64748b" }}
              />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="load"
                stroke="#0ea5e9"
                strokeWidth={3}
                dot={false}
                name="Session load"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgHr"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={false}
                name="Avg HR"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-surface rounded-[5px]">
        <CardHeader>
          <CardTitle>Weekly Distance & Duration</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart className="text-xs" data={chartData} margin={{ left: 4, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="dateLabel" tick={{ fill: "#64748b" }} />
              <YAxis tick={{ fill: "#64748b" }} />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="distance"
                fill="#22c55e"
                name="Distance (km)"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="duration"
                fill="#7c3aed"
                name="Duration (min)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-surface rounded-[5px]">
        <CardHeader>
          <CardTitle>Speed & Pace Trend</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart className="text-xs" data={chartData} margin={{ left: 4, right: 12 }}>
              <defs>
                <linearGradient id="speedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="dateLabel" tick={{ fill: "#64748b" }} />
              <YAxis tick={{ fill: "#64748b" }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="avgSpeed"
                stroke="#3b82f6"
                strokeWidth={3}
                fill="url(#speedFill)"
                name="Avg Speed (km/h)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-surface rounded-[5px]">
        <CardHeader>
          <CardTitle>RPE Distribution</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart className="text-xs" data={chartData} margin={{ left: 4, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="dateLabel" tick={{ fill: "#64748b" }} />
              <YAxis allowDecimals={false} tick={{ fill: "#64748b" }} />
              <Tooltip />
              <Bar
                dataKey="rpe"
                fill="#f97316"
                name="RPE"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
