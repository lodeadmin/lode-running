import type { Metadata } from "next";
import { AcwrDashboard } from "@/components/dashboard/acwr-dashboard";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { summarizeTrainingLoad } from "@/lib/acwr";

export const metadata: Metadata = {
  title: "Dashboard • Vibe Fitness",
};

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
        rhr,
        sex,
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
    .limit(200);

  if (workoutsError) {
    console.warn("Failed to load workouts", workoutsError.message);
  }

  const workouts = workoutsData ?? [];
  const loadInputs = workouts.map((workout) => ({
    workout_date: workout.workout_date,
    distance_km: workout.distance_km,
    distance_meters: workout.distance_meters,
    duration_minutes: workout.duration_minutes,
    avg_speed_kmh: workout.avg_speed_kmh,
    avg_heart_rate: workout.avg_heart_rate,
    max_heart_rate: workout.max_heart_rate,
    rhr: workout.rhr,
    sex: workout.sex,
  }));
  const trainingSummary = summarizeTrainingLoad(loadInputs);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">
            Quick Insights and Visuals Center
          </h1>
        </div>
      </div>

      <AcwrDashboard
        summary={trainingSummary.summary}
        weeklyLoad={trainingSummary.weeklyLoad}
        acwrHistory={trainingSummary.acwrHistory}
        suggestions={trainingSummary.suggestions}
      />
    </div>
  );
}
