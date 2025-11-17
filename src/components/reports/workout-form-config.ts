type FieldConfig = {
  name: string;
  label: string;
  type: "text" | "date" | "number";
  step?: string;
  placeholder?: string;
};

export const WORKOUT_TYPE_VALUE = "running";

export const WORKOUT_FIELDS: FieldConfig[] = [
  {
    name: "workout_date",
    label: "Workout Date",
    type: "date",
    placeholder: "YYYY-MM-DD",
  },
  {
    name: "duration_minutes",
    label: "Duration (minutes)",
    type: "number",
    step: "1",
    placeholder: "e.g. 45",
  },
  {
    name: "distance_km",
    label: "Distance (km)",
    type: "number",
    step: "0.01",
    placeholder: "e.g. 5.2",
  },
  {
    name: "calories",
    label: "Calories",
    type: "number",
    step: "1",
    placeholder: "e.g. 320",
  },
  {
    name: "avg_speed_kmh",
    label: "Avg. Speed (km/h)",
    type: "number",
    step: "0.01",
    placeholder: "e.g. 10.5",
  },
  {
    name: "avg_pace_min_per_km",
    label: "Avg. Pace (min/km)",
    type: "number",
    step: "0.01",
    placeholder: "e.g. 5.15",
  },
  {
    name: "rpe",
    label: "RPE",
    type: "number",
    step: "1",
    placeholder: "1 - 10",
  },
  {
    name: "avg_heart_rate",
    label: "Avg. Heart Rate",
    type: "number",
    step: "1",
    placeholder: "e.g. 145",
  },
  {
    name: "rhr",
    label: "RHR (resting heart rate)",
    type: "number",
    step: "1",
    placeholder: "e.g. 55",
  },
  {
    name: "max_heart_rate",
    label: "Max Heart Rate",
    type: "number",
    step: "1",
    placeholder: "e.g. 180",
  },
  {
    name: "internal_load",
    label: "Internal Load",
    type: "number",
    step: "0.01",
    placeholder: "e.g. 120.5",
  },
  {
    name: "external_load",
    label: "External Load",
    type: "number",
    step: "0.01",
    placeholder: "e.g. 130.2",
  },
  {
    name: "total_session_load",
    label: "Total Session Load",
    type: "number",
    step: "0.01",
    placeholder: "e.g. 250.7",
  },
];

export type { FieldConfig };
