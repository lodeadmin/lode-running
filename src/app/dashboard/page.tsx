import type { Metadata } from "next";
import Link from "next/link";
import { Gauge, ShieldCheck, Waves } from "lucide-react";

import { MetricsSummary } from "@/components/reports/metrics-summary";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard • Vibe Fitness",
};

const readinessCards = [
  {
    title: "Strain balance",
    metric: "Low",
    delta: "+2% vs yesterday",
    description: "Ideal window for progressive overload.",
    icon: Waves,
  },
  {
    title: "Recovery trend",
    metric: "78%",
    delta: "+6 pts week over week",
    description: "Based on HRV + deep sleep signals.",
    icon: Gauge,
  },
];

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data: workoutsData, error: workoutsError } = await supabase
    .from("workouts")
    .select(
      `
        terra_workout_id,
        workout_date,
        type_of_workout,
        week_number,
        duration_minutes,
        distance_meters,
        distance_km,
        calories,
        steps,
        avg_heart_rate,
        max_heart_rate,
        avg_speed_kmh,
        max_speed_kmh,
        avg_pace_min_per_km,
        rpe,
        zone1,
        zone2,
        zone3,
        zone4,
        zone5,
        internal_load,
        external_load,
        total_session_load,
        modality,
        provider,
        source,
        last_synced_at
      `
    )
    .eq("user_id", user.id)
    .order("workout_date", { ascending: false })
    .limit(25);

  if (workoutsError) {
    console.warn("Failed to load workouts", workoutsError.message);
  }

  const workouts = workoutsData ?? [];
  const chartWorkouts = workouts
    .filter((workout) => {
      const name = workout.type_of_workout?.toLowerCase() ?? "";
      return (
        name.includes("wandsworth running") ||
        name.includes("wandsworth - base")
      );
    })
    .slice(0, 28);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">
            Quick Insights and Visuals Center
          </h1>
        </div>
      </div>

      <section className="grid gap-6 md:grid-cols-2">
        {readinessCards.map(
          ({ title, metric, delta, description, icon: Icon }) => (
            <article key={title} className="card-surface space-y-4 p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-[5px] bg-secondary p-2 text-primary">
                  <Icon className="size-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{title}</p>
                  <p className="text-3xl font-semibold text-slate-900">
                    {metric}
                  </p>
                </div>
              </div>
              <p className="text-sm font-medium text-emerald-600">{delta}</p>
              <p className="text-sm text-slate-500">{description}</p>
            </article>
          )
        )}
      </section>

      <MetricsSummary workouts={chartWorkouts} />
    </div>
  );
}
