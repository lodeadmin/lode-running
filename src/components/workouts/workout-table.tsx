type Workout = {
  terra_workout_id: string | null;
  workout_date: string;
  type_of_workout: string | null;
  week_number: number | null;
  duration_minutes: number | null;
  distance_km: number | null;
  distance_meters: number | null;
  calories: number | null;
  steps: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  rpe: number | null;
  avg_speed_kmh: number | null;
  max_speed_kmh: number | null;
  avg_pace_min_per_km: number | null;
  zone1: number | null;
  zone2: number | null;
  zone3: number | null;
  zone4: number | null;
  zone5: number | null;
  internal_load: number | null;
  external_load: number | null;
  total_session_load: number | null;
  modality: string | null;
  provider: string | null;
  source: string | null;
  last_synced_at: string | null;
};

type WorkoutTableProps = {
  workouts: Workout[];
};

const formatDate = (input: string) => {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatRelative = (input: string | null) => {
  if (!input) return "—";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) {
    const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    return `${diffMinutes}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

const formatDistance = (meters: number | null) => {
  if (meters === null || Number.isNaN(meters)) return "—";
  const km = meters / 1000;
  return `${km.toFixed(km >= 10 ? 0 : 2)} km`;
};

const formatKm = (km: number | null) => {
  if (km === null || Number.isNaN(km)) return "—";
  return `${km.toFixed(km >= 10 ? 0 : 2)} km`;
};

const formatNumber = (value: number | null, suffix = "") => {
  if (value === null || Number.isNaN(value)) return "—";
  return `${value}${suffix}`;
};

const formatMinutes = (minutes: number | null) => {
  if (minutes === null || Number.isNaN(minutes)) return "—";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins ? `${hrs}h ${mins}m` : `${hrs}h`;
};

export function WorkoutTable({ workouts }: WorkoutTableProps) {
  if (!workouts.length) {
    return (
      <div className="text-center text-sm text-muted-foreground">
        Workouts will appear here once Terra finishes syncing.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1024px] text-left text-sm text-slate-600">
        <thead className="text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Workout</th>
            <th className="px-4 py-3 text-center">Week #</th>
            <th className="px-4 py-3">Provider</th>
            <th className="px-4 py-3 text-right">Duration</th>
            <th className="px-4 py-3 text-right">Distance</th>
            <th className="px-4 py-3 text-right">Calories</th>
            <th className="px-4 py-3 text-right">Avg Speed</th>
            <th className="px-4 py-3 text-right">Avg Pace</th>
            <th className="px-4 py-3 text-right">RPE</th>
            <th className="px-4 py-3 text-right">Avg HR</th>
            <th className="px-4 py-3 text-right">Max HR</th>
            <th className="px-4 py-3 text-right">Zones 1-5 (min)</th>
            <th className="px-4 py-3 text-right">Internal Load</th>
            <th className="px-4 py-3 text-right">External Load</th>
            <th className="px-4 py-3 text-right">Session Load</th>
            <th className="px-4 py-3 text-right">Last Sync</th>
          </tr>
        </thead>
        <tbody>
          {workouts.map((workout) => (
            <tr
              key={workout.terra_workout_id ?? `${workout.workout_date}-${workout.modality}`}
              className="border-t border-border/60 text-sm"
            >
              <td className="px-4 py-3 font-medium text-slate-900">
                {formatDate(workout.workout_date)}
              </td>
              <td className="px-4 py-3 capitalize">
                {workout.type_of_workout ?? workout.modality ?? "—"}
              </td>
              <td className="px-4 py-3 text-center">
                {workout.week_number ?? "—"}
              </td>
              <td className="px-4 py-3 uppercase text-xs font-semibold text-muted-foreground">
                {workout.provider ?? workout.source ?? "terra"}
              </td>
              <td className="px-4 py-3 text-right font-medium">
                {formatMinutes(workout.duration_minutes)}
              </td>
              <td className="px-4 py-3 text-right font-medium">
                {workout.distance_km !== null
                  ? formatKm(workout.distance_km)
                  : formatDistance(workout.distance_meters)}
              </td>
              <td className="px-4 py-3 text-right">
                {formatNumber(workout.calories, " kcal")}
              </td>
              <td className="px-4 py-3 text-right">
                {formatNumber(workout.avg_speed_kmh, " km/h")}
              </td>
              <td className="px-4 py-3 text-right">
                {formatNumber(workout.avg_pace_min_per_km, " min/km")}
              </td>
              <td className="px-4 py-3 text-right">
                {formatNumber(workout.rpe)}
              </td>
              <td className="px-4 py-3 text-right">
                {formatNumber(workout.avg_heart_rate, " bpm")}
              </td>
              <td className="px-4 py-3 text-right">
                {formatNumber(workout.max_heart_rate, " bpm")}
              </td>
              <td className="px-4 py-3 text-right text-xs">
                {[workout.zone1, workout.zone2, workout.zone3, workout.zone4, workout.zone5]
                  .map((zone) => formatNumber(zone))
                  .join(" / ")}
              </td>
              <td className="px-4 py-3 text-right">
                {formatNumber(workout.internal_load)}
              </td>
              <td className="px-4 py-3 text-right">
                {formatNumber(workout.external_load)}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-slate-900">
                {formatNumber(workout.total_session_load)}
              </td>
              <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                {formatRelative(workout.last_synced_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
