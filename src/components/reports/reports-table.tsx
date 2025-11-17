"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { AddWorkoutFormState, ReportWorkout } from "@/components/reports/types";
import { EditWorkoutModal } from "@/components/reports/edit-workout-modal";

type UpdateWorkoutAction = (
  prevState: AddWorkoutFormState,
  formData: FormData
) => Promise<AddWorkoutFormState>;

type DeleteWorkoutAction = (formData: FormData) => Promise<void>;

type ReportsTableProps = {
  workouts: ReportWorkout[];
  updateWorkoutAction: UpdateWorkoutAction;
  deleteWorkoutAction: DeleteWorkoutAction;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatMinutes = (minutes: number | null) => {
  if (minutes === null || Number.isNaN(minutes)) return "—";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins ? `${hrs}h ${mins}m` : `${hrs}h`;
};

const formatNumber = (
  value: number | null,
  suffix = "",
  emptyValue = "—"
) => {
  if (value === null || Number.isNaN(value)) return emptyValue;
  return `${value}${suffix}`;
};

const formatDistance = (km: number | null, metersFallback: number | null) => {
  if (km !== null && !Number.isNaN(km)) {
    return `${km.toFixed(km >= 10 ? 0 : 2)} km`;
  }
  if (metersFallback === null || Number.isNaN(metersFallback)) return "—";
  const derivedKm = metersFallback / 1000;
  return `${derivedKm.toFixed(derivedKm >= 10 ? 0 : 2)} km`;
};

export function ReportsTable({
  workouts,
  updateWorkoutAction,
  deleteWorkoutAction,
}: ReportsTableProps) {
  const [editingWorkout, setEditingWorkout] = useState<ReportWorkout | null>(null);

  if (!workouts.length) {
    return (
      <div className="rounded-[5px] border border-dashed border-muted-foreground/30 px-4 py-10 text-center text-sm text-muted-foreground">
        No workouts matched the selected filters yet.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary hover:bg-primary">
              <TableHead className="text-white text-xs">Date</TableHead>
              <TableHead className="text-white text-xs">Workout</TableHead>
              <TableHead className="text-center text-white text-xs">Week #</TableHead>
              <TableHead className="text-center text-white text-xs">Duration</TableHead>
              <TableHead className="text-center text-white text-xs">Distance</TableHead>
              <TableHead className="text-center text-white text-xs">Calories</TableHead>
              <TableHead className="text-center text-white text-xs">Avg Speed</TableHead>
              <TableHead className="text-center text-white text-xs">Avg Pace</TableHead>
              <TableHead className="text-center text-white text-xs">RPE</TableHead>
              <TableHead className="text-center text-white text-xs">Avg HR</TableHead>
              <TableHead className="text-center text-white text-xs">RHR</TableHead>
              <TableHead className="text-center text-white text-xs">Max HR</TableHead>
              <TableHead className="text-center text-white text-xs">Internal Load</TableHead>
              <TableHead className="text-center text-white text-xs">External Load</TableHead>
              <TableHead className="text-center text-white text-xs">Session Load</TableHead>
              <TableHead className="text-center text-white text-xs">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workouts.map((workout) => (
              <TableRow
                key={
                  workout.terra_workout_id ??
                  `${workout.id}-${workout.workout_date}-${workout.type_of_workout ?? "unknown"}`
                }
              >
                <TableCell className="font-medium text-slate-900">
                  {formatDate(workout.workout_date)}
                </TableCell>
                <TableCell className="capitalize">
                  {workout.type_of_workout ?? "—"}
                </TableCell>
                <TableCell className="text-center">
                  {workout.week_number ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  {formatMinutes(workout.duration_minutes)}
                </TableCell>
                <TableCell className="text-right">
                  {formatDistance(workout.distance_km, workout.distance_meters)}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(workout.calories, " kcal")}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(workout.avg_speed_kmh, " km/h")}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(workout.avg_pace_min_per_km, " min/km")}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(workout.rpe)}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(workout.avg_heart_rate, " bpm")}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(workout.rhr, " bpm", "N/A")}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(workout.max_heart_rate, " bpm")}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(workout.internal_load)}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(workout.external_load)}
                </TableCell>
                <TableCell className="text-right font-semibold text-slate-900">
                  {formatNumber(workout.total_session_load)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-slate-600 hover:bg-slate-100 hover:text-primary"
                      aria-label="Edit workout"
                      onClick={() => setEditingWorkout(workout)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <form
                      action={deleteWorkoutAction}
                      onSubmit={(event) => {
                        if (
                          !window.confirm(
                            `Delete workout from ${formatDate(workout.workout_date)}?`
                          )
                        ) {
                          event.preventDefault();
                        }
                      }}
                    >
                      <input type="hidden" name="id" value={workout.id} />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete workout"
                        className="text-slate-600 hover:bg-slate-100 hover:text-destructive"
                        type="submit"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </form>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editingWorkout && (
        <EditWorkoutModal
          workout={editingWorkout}
          updateWorkoutAction={updateWorkoutAction}
          onClose={() => setEditingWorkout(null)}
        />
      )}
    </>
  );
}
