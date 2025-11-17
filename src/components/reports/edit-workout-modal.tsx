"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AddWorkoutFormState,
  initialAddWorkoutFormState,
  type ReportWorkout,
} from "@/components/reports/types";
import { WORKOUT_FIELDS } from "@/components/reports/workout-form-config";

type UpdateWorkoutAction = (
  prevState: AddWorkoutFormState,
  formData: FormData
) => Promise<AddWorkoutFormState>;

type EditWorkoutModalProps = {
  workout: ReportWorkout;
  updateWorkoutAction: UpdateWorkoutAction;
  onClose: () => void;
};

export function EditWorkoutModal({
  workout,
  updateWorkoutAction,
  onClose,
}: EditWorkoutModalProps) {
  const [state, formAction] = useFormState(
    updateWorkoutAction,
    initialAddWorkoutFormState
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!state.ok) {
      return;
    }
    formRef.current?.reset();
    onClose();
  }, [onClose, state.ok]);

  const fieldValues = useMemo(() => {
    const values: Record<string, string> = {};
    for (const field of WORKOUT_FIELDS) {
      const raw = workout[field.name as keyof ReportWorkout];
      if (raw === null || raw === undefined) {
        values[field.name] = "";
      } else if (typeof raw === "number") {
        values[field.name] = raw.toString();
      } else {
        values[field.name] = raw;
      }
    }
    return values;
  }, [workout]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[5px] bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Edit workout entry
            </h2>
            <p className="text-sm text-muted-foreground">
              Update the session details and save your changes.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-[5px]"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>

        <form
          ref={formRef}
          action={formAction}
          className="mt-6 space-y-6"
        >
          <input type="hidden" name="id" value={workout.id} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {WORKOUT_FIELDS.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={`edit-${field.name}`}>{field.label}</Label>
                <Input
                  id={`edit-${field.name}`}
                  name={field.name}
                  type={field.type}
                  step={field.step}
                  placeholder={field.placeholder}
                  className="rounded-[5px]"
                  defaultValue={fieldValues[field.name]}
                />
              </div>
            ))}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-type_of_workout">Type of workout</Label>
              <Input
                id="edit-type_of_workout"
                value={workout.type_of_workout ?? "running"}
                disabled
                className="rounded-[5px] bg-slate-100 text-slate-500"
              />
            </div>
          </div>

          {state.message && !state.ok && (
            <p className="text-sm text-red-600">{state.message}</p>
          )}

          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              className="rounded-[5px]"
              onClick={onClose}
            >
              Cancel
            </Button>
            <SaveButton />
          </div>
        </form>
      </div>
    </div>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="rounded-[5px] px-6"
      disabled={pending}
    >
      {pending ? "Saving..." : "Save changes"}
    </Button>
  );
}
