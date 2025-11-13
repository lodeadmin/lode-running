import type { Metadata } from "next";
import Link from "next/link";
import { revalidatePath } from "next/cache";

import { ReportsTable, type ReportWorkout } from "@/components/reports/reports-table";
import { AddWorkoutModal } from "@/components/reports/add-workout-modal";
import { BulkUploadButton } from "@/components/reports/bulk-upload-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AddWorkoutFormState } from "@/components/reports/types";
import { Download } from "lucide-react";
import { computeIsoWeekNumber, metersFromKilometers } from "@/lib/workouts";

export const metadata: Metadata = {
  title: "Reports • Vibe Fitness",
};

const PAGE_SIZE = 10;
const ALLOWED_TYPES = ["running", "base"];
const RUNNING_WORKOUT_TYPE = "running";

type NumericField =
  | "duration_minutes"
  | "distance_km"
  | "calories"
  | "avg_speed_kmh"
  | "avg_pace_min_per_km"
  | "rpe"
  | "avg_heart_rate"
  | "max_heart_rate"
  | "internal_load"
  | "external_load"
  | "total_session_load";

type WorkoutInsertPayload = {
  user_id: string;
  terra_workout_id: string | null;
  workout_date: string | null;
  type_of_workout: string;
  week_number: number | null;
  distance_meters: number | null;
} & {
  [K in NumericField]: number | null;
};

type ReportsPageProps = {
  searchParams?: Promise<{
    page?: string;
    q?: string;
  }>;
};

const buildAllowedFilter = () =>
  ALLOWED_TYPES.map((type) => `type_of_workout.ilike.%${type}%`).join(",");

const buildPageUrl = (page: number, query: string) => {
  const params = new URLSearchParams();
  params.set("page", page.toString());
  if (query) {
    params.set("q", query);
  }
  return `/reports?${params.toString()}`;
};

async function addWorkoutAction(
  _prevState: AddWorkoutFormState,
  formData: FormData
): Promise<AddWorkoutFormState> {
  "use server";

  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const getString = (key: string) => {
    const value = formData.get(key);
    if (typeof value !== "string") {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const getNumber = (key: NumericField) => {
    const value = formData.get(key);
    if (value === null) {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const workoutDate = getString("workout_date");
  const weekNumber = computeIsoWeekNumber(workoutDate);
  const distanceKm = getNumber("distance_km");
  const derivedMeters = metersFromKilometers(distanceKm);

  const payload: WorkoutInsertPayload = {
    user_id: user.id,
    terra_workout_id: getString("terra_workout_id"),
    workout_date: workoutDate,
    type_of_workout: RUNNING_WORKOUT_TYPE,
    week_number: weekNumber,
    distance_km: distanceKm,
    distance_meters: derivedMeters,
    duration_minutes: getNumber("duration_minutes"),
    calories: getNumber("calories"),
    avg_speed_kmh: getNumber("avg_speed_kmh"),
    avg_pace_min_per_km: getNumber("avg_pace_min_per_km"),
    rpe: getNumber("rpe"),
    avg_heart_rate: getNumber("avg_heart_rate"),
    max_heart_rate: getNumber("max_heart_rate"),
    internal_load: getNumber("internal_load"),
    external_load: getNumber("external_load"),
    total_session_load: getNumber("total_session_load"),
  };

  const { error } = await supabase.from("workouts").insert(payload);

  if (error) {
    console.error("Failed to add workout", error.message);
    return {
      ok: false,
      message: "Unable to add workout. Please verify the values and try again.",
    };
  }

  revalidatePath("/reports");

  return {
    ok: true,
    message: "Workout added successfully.",
  };
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const resolvedSearch = (await searchParams) ?? {};

  const pageParam = Number(resolvedSearch.page ?? "1");
  const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const query = resolvedSearch.q?.toString().trim() ?? "";

  let request = supabase
    .from("workouts")
    .select(
      `
        terra_workout_id,
        workout_date,
        type_of_workout,
        week_number,
        duration_minutes,
        distance_km,
        distance_meters,
        calories,
        avg_speed_kmh,
        avg_pace_min_per_km,
        rpe,
        avg_heart_rate,
        max_heart_rate,
        internal_load,
        external_load,
        total_session_load
      `,
      { count: "exact" }
    )
    .eq("user_id", user.id)
    .or(buildAllowedFilter())
    .order("workout_date", { ascending: false });

  if (query) {
    request = request.ilike("type_of_workout", `%${query}%`);
  }

  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE - 1;

  const { data, count, error } = await request.range(start, end);

  if (error) {
    console.error("Failed to load reports", error.message);
  }

  const workouts: ReportWorkout[] = data ?? [];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
          Reports
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Workout analytics
        </h1>
        <p className="text-sm text-muted-foreground">
          Filter Wandsworth-focused sessions with quick search and pagination.
        </p>
      </div>

      <div className="w-full  flex  justify-between items-center">
        <form className="flex  justify-between  items-center gap-3" method="get">
          <Input
            name="q"
            placeholder="Search workout titles"
            defaultValue={query}
            className="w-sm border border-purple-500 rounded-[5px]"
          />
          <input type="hidden" name="page" value="1" />
          <Button type="submit" className="px-6 rounded-[5px]">
            Apply
          </Button>
          {query && (
            <Button asChild variant="ghost" className="rounded-[5px]">
              <Link href="/reports">Clear</Link>
            </Button>
          )}
        </form>
        <div className="w-full flex justify-end items-center gap-4">
          <AddWorkoutModal addWorkoutAction={addWorkoutAction} />
          <BulkUploadButton />
          <Button asChild variant="outline" className="rounded-[5px]">
            <a href="/api/workouts/export" download>
              <Download className="mr-2 size-4" />
              Download CSV
            </a>
          </Button>
        </div>
      </div>
      <ReportsTable workouts={workouts} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Page {Math.min(page, totalPages)} of {totalPages} · {count ?? 0}{" "}
          workout
          {count === 1 ? "" : "s"}
        </p>
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            disabled={!hasPrevious}
            className="rounded-[5px]"
          >
            <Link
              href={buildPageUrl(page - 1, query)}
              aria-disabled={!hasPrevious}
            >
              Previous
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            disabled={!hasNext}
            className="rounded-[5px]"
          >
            <Link href={buildPageUrl(page + 1, query)} aria-disabled={!hasNext}>
              Next
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
