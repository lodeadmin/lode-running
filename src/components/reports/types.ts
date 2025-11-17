export type AddWorkoutFormState = {
  ok: boolean;
  message: string;
};

export const initialAddWorkoutFormState: AddWorkoutFormState = {
  ok: false,
  message: "",
};

export type ReportWorkout = {
  id: string;
  terra_workout_id: string | null;
  workout_date: string;
  type_of_workout: string | null;
  week_number: number | null;
  duration_minutes: number | null;
  distance_km: number | null;
  distance_meters: number | null;
  calories: number | null;
  avg_speed_kmh: number | null;
  avg_pace_min_per_km: number | null;
  rpe: number | null;
  rhr: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  internal_load: number | null;
  external_load: number | null;
  total_session_load: number | null;
};
