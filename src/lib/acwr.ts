import {
  computeWorkoutLoad,
  type DistanceUnit,
  type WorkoutLoadInput,
  roundLoadMetric,
} from "./training-load";

export type TrainingLoadWorkout = WorkoutLoadInput & {
  workout_date: string;
};

export type WeeklyLoadPoint = {
  weekStart: string;
  weekLabel: string;
  totalLoad: number;
};

export type AcwrHistoryPoint = {
  weekStart: string;
  weekLabel: string;
  ratio: number | null;
};

export type WorkoutSuggestion = {
  title: string;
  workoutType: string;
  duration: string;
  distance: string;
  description: string;
};

export type AcwrStatus = {
  label: string;
  tone: "muted" | "caution" | "positive" | "warning" | "danger";
  description: string;
};

export type AcwrSummary = {
  ratio: number | null;
  acuteLoad: number;
  chronicLoad: number;
  remainingCapacity: number | null;
  status: AcwrStatus;
  targetRange: { min: number; max: number };
  lastUpdated: string | null;
};

export type TrainingLoadSummary = {
  workouts: Array<
    TrainingLoadWorkout & {
      delta_hr: number | null;
      internal_load: number | null;
      external_load: number | null;
      total_session_load: number | null;
    }
  >;
  weeklyLoad: WeeklyLoadPoint[];
  acwrHistory: AcwrHistoryPoint[];
  summary: AcwrSummary;
  suggestions: WorkoutSuggestion[];
};

const TARGET_RANGE = { min: 0.8, max: 1.3 };
const HISTORY_WEEKS = 12;

const toISODate = (input: Date) => input.toISOString().slice(0, 10);

const parseWorkoutDate = (value: string) => {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startOfWeek = (input: Date) => {
  const date = new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - day);
  return date;
};

const addDays = (input: Date, days: number) => {
  const date = new Date(input.getTime());
  date.setUTCDate(date.getUTCDate() + days);
  return date;
};

const formatWeekLabel = (input: Date) =>
  input.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

const deriveStatus = (ratio: number | null): AcwrStatus => {
  if (ratio === null) {
    return {
      label: "Need more data",
      tone: "muted",
      description: "Log consistent workouts for at least four weeks to unlock ACWR guidance.",
    };
  }

  if (ratio < TARGET_RANGE.min) {
    return {
      label: "Undertraining / Caution",
      tone: "caution",
      description: "Gradual load increases will help build resilience without spiking injury risk.",
    };
  }

  if (ratio <= TARGET_RANGE.max) {
    return {
      label: "Productive Load",
      tone: "positive",
      description: "Training stress is in the sweet spot. Maintain this rhythm to keep progressing.",
    };
  }

  if (ratio <= 1.5) {
    return {
      label: "Monitor Load",
      tone: "warning",
      description: "You are edging past the safe zone. Add recovery or easy volume to stabilize.",
    };
  }

  return {
    label: "High Risk / Deload",
    tone: "danger",
    description: "Acute stress is spiking. Prioritize rest sessions before stacking harder work.",
  };
};

const buildSuggestions = (
  ratio: number | null,
  remainingCapacity: number | null
): WorkoutSuggestion[] => {
  if (ratio === null) {
    return [
      {
        title: "Consistency First",
        workoutType: "Easy Run",
        duration: "30-40 min",
        distance: "4-6 km",
        description: "Log a few conversational runs this week so the dashboard can learn your baseline.",
      },
      {
        title: "Add Strides",
        workoutType: "Speed Development",
        duration: "20 min + strides",
        distance: "3-4 km",
        description: "Short pickups at 5k pace prime the legs without adding much stress.",
      },
      {
        title: "Recovery Support",
        workoutType: "Mobility & Walk",
        duration: "15-20 min",
        distance: "Flexible",
        description: "Include light strength or walking to reinforce the habit loop.",
      },
    ];
  }

  if (ratio < TARGET_RANGE.min) {
    return [
      {
        title: "Easy Volume Run",
        workoutType: "Aerobic Base",
        duration: "45-55 min",
        distance: "7-9 km",
        description:
          "Use the remaining capacity to add smooth mileage. Focus on nose-breathing effort.",
      },
      {
        title: "Light Tempo Finish",
        workoutType: "Steady Finish",
        duration: "35-45 min",
        distance: "6-7 km",
        description: "Close the run with a 10 min tempo to gently raise heart rate stimulus.",
      },
      {
        title: "Form Drills",
        workoutType: "Strides + Mobility",
        duration: "25 min",
        distance: "Short",
        description: "Add 4-6 relaxed strides to recruit fast-twitch fibers without heavy stress.",
      },
    ];
  }

  if (ratio <= TARGET_RANGE.max) {
    return [
      {
        title: "Maintain the Groove",
        workoutType: "Progression Run",
        duration: "45-50 min",
        distance: "7-8 km",
        description: "Hold the current rhythm—finish a touch quicker but keep RPE under 6.",
      },
      {
        title: "Reload Session",
        workoutType: "Threshold Intervals",
        duration: "40-45 min",
        distance: "6-7 km",
        description: "2 x 8-10 min at threshold maintains VO₂ without spiking stress.",
      },
      {
        title: "Recovery Run",
        workoutType: "Soft Surface",
        duration: "30-35 min",
        distance: "4-5 km",
        description: "Keep at least one super-easy day to defend that optimal ACWR window.",
      },
    ];
  }

  if (remainingCapacity !== null && remainingCapacity > 0) {
    return [
      {
        title: "Cap Load Early",
        workoutType: "Recovery Run",
        duration: "25-30 min",
        distance: "3-4 km",
        description: "Use short, gentle running to keep blood flow without stacking load.",
      },
      {
        title: "Non-Impact Session",
        workoutType: "Bike / Swim",
        duration: "35-40 min",
        distance: "N/A",
        description: "Cross-train to maintain aerobic work while letting tissues recover.",
      },
      {
        title: "Mobility & Sleep",
        workoutType: "Restorative",
        duration: "20 min",
        distance: "N/A",
        description: "Prioritize fascia release + sleep to absorb the chronic load already banked.",
      },
    ];
  }

  return [
    {
      title: "Micro Deload",
      workoutType: "Walk + Mobility",
      duration: "15-20 min",
      distance: "N/A",
      description: "Hold off on intensity until the ACWR drops closer to 1.3.",
    },
    {
      title: "Technique Drills",
      workoutType: "Stride Mechanics",
      duration: "20 min",
      distance: "Short",
      description: "Keep neuromuscular sharpness with 4 strides and basic drills.",
    },
    {
      title: "Breathing Reset",
      workoutType: "Box Breathing",
      duration: "10 min",
      distance: "N/A",
      description: "Parasympathetic work accelerates recovery between harder training weeks.",
    },
  ];
};

export const summarizeTrainingLoad = (
  workouts: TrainingLoadWorkout[],
  options?: { today?: Date; unit?: DistanceUnit }
): TrainingLoadSummary => {
  const today = options?.today ?? new Date();
  const unit = options?.unit;
  const computedWorkouts = workouts.map((workout) => {
    const computed = computeWorkoutLoad(workout, { unit });
    return {
      ...workout,
      distance_km: computed.distance_km,
      avg_speed_kmh: computed.avg_speed_kmh,
      delta_hr: computed.delta_hr,
      internal_load: computed.internal_load,
      external_load: computed.external_load,
      total_session_load: computed.total_session_load,
    };
  });

  const currentWeekStart = startOfWeek(today);
  const firstWeekToDisplay = addDays(currentWeekStart, -1 * (HISTORY_WEEKS - 1) * 7);
  const weekTotals = new Map<
    string,
    { total: number; date: Date }
  >();

  for (let i = 0; i < HISTORY_WEEKS; i += 1) {
    const weekStart = addDays(firstWeekToDisplay, i * 7);
    weekTotals.set(toISODate(weekStart), { total: 0, date: weekStart });
  }

  computedWorkouts.forEach((workout) => {
    const workoutDate = parseWorkoutDate(workout.workout_date);
    if (!workoutDate) return;
    const weekKey = toISODate(startOfWeek(workoutDate));
    if (!weekTotals.has(weekKey)) {
      weekTotals.set(weekKey, { total: 0, date: startOfWeek(workoutDate) });
    }
    if (typeof workout.total_session_load === "number") {
      const entry = weekTotals.get(weekKey);
      if (entry) {
        entry.total += workout.total_session_load;
      } else {
        weekTotals.set(weekKey, {
          total: workout.total_session_load,
          date: startOfWeek(workoutDate),
        });
      }
    }
  });

  const sortedWeeks = Array.from(weekTotals.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );
  const recentWeeks =
    sortedWeeks.length > HISTORY_WEEKS
      ? sortedWeeks.slice(sortedWeeks.length - HISTORY_WEEKS)
      : sortedWeeks;

  const weeklyLoad: WeeklyLoadPoint[] = recentWeeks.map(([weekStart, entry]) => ({
    weekStart,
    weekLabel: formatWeekLabel(entry.date),
    totalLoad: roundLoadMetric(entry.total),
  }));

  const acwrHistory: AcwrHistoryPoint[] = recentWeeks.map(
    ([weekStart, entry], index) => {
      const historyWindow = recentWeeks.slice(Math.max(0, index - 4), index);
      if (historyWindow.length < 4) {
        return {
          weekStart,
          weekLabel: formatWeekLabel(entry.date),
          ratio: null,
        };
      }
      const chronicAverage =
        historyWindow.reduce((sum, [, value]) => sum + value.total, 0) /
        historyWindow.length;
      const ratio =
        chronicAverage > 0 ? roundLoadMetric(entry.total / chronicAverage) : null;
      return {
        weekStart,
        weekLabel: formatWeekLabel(entry.date),
        ratio,
      };
    }
  );

  const currentWeekKey = toISODate(currentWeekStart);
  const acuteLoad = roundLoadMetric(weekTotals.get(currentWeekKey)?.total ?? 0);
  const previousLoads: number[] = [];
  for (let i = 1; i <= 4; i += 1) {
    const key = toISODate(addDays(currentWeekStart, -7 * i));
    previousLoads.push(weekTotals.get(key)?.total ?? 0);
  }
  const chronicLoad =
    previousLoads.length > 0
      ? roundLoadMetric(
          previousLoads.reduce((sum, value) => sum + value, 0) / previousLoads.length
        )
      : 0;
  const ratio =
    chronicLoad > 0 && acuteLoad > 0
      ? roundLoadMetric(acuteLoad / chronicLoad)
      : chronicLoad > 0
        ? 0
        : null;
  const remainingCapacity =
    chronicLoad > 0
      ? Math.max(0, roundLoadMetric(chronicLoad * TARGET_RANGE.max - acuteLoad))
      : null;
  const status = deriveStatus(ratio);

  let lastUpdated: string | null = null;
  computedWorkouts.forEach((workout) => {
    if (!workout.workout_date) return;
    if (!lastUpdated || workout.workout_date > lastUpdated) {
      lastUpdated = workout.workout_date;
    }
  });

  const suggestions = buildSuggestions(ratio, remainingCapacity);

  return {
    workouts: computedWorkouts,
    weeklyLoad,
    acwrHistory,
    summary: {
      ratio,
      acuteLoad,
      chronicLoad,
      remainingCapacity,
      status,
      targetRange: TARGET_RANGE,
      lastUpdated,
    },
    suggestions,
  };
};
