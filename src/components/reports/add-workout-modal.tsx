"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AddWorkoutFormState,
  initialAddWorkoutFormState,
} from "@/components/reports/types";
import {
  WORKOUT_FIELDS,
  WORKOUT_TYPE_VALUE,
} from "@/components/reports/workout-form-config";

type AddWorkoutAction = (
  prevState: AddWorkoutFormState,
  formData: FormData
) => Promise<AddWorkoutFormState>;

export function AddWorkoutModal({
  addWorkoutAction,
}: {
  addWorkoutAction: AddWorkoutAction;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction] = useFormState(
    addWorkoutAction,
    initialAddWorkoutFormState
  );
  const formRef = useRef<HTMLFormElement>(null);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    formRef.current?.reset();
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeModal, isOpen]);

  useEffect(() => {
    if (!state.ok) {
      return;
    }
    formRef.current?.reset();
    const timeout = window.setTimeout(() => {
      closeModal();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [closeModal, state.ok]);

  return (
    <>
      <Button className="rounded-[5px]" onClick={() => setIsOpen(true)}>
        Add workout
      </Button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={closeModal}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[5px] bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Add workout entry
                </h2>
                <p className="text-sm text-muted-foreground">
                  Fill in the Terra metrics below and submit to log the session.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-[5px]"
                onClick={closeModal}
              >
                <X className="size-4" />
              </Button>
            </div>

            <form ref={formRef} action={formAction} className="mt-6 space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {WORKOUT_FIELDS.map((field) => (
                  <div key={field.name} className="space-y-2">
                    <Label htmlFor={field.name}>{field.label}</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type={field.type}
                      step={field.step}
                      placeholder={field.placeholder}
                      className="rounded-[5px]"
                    />
                  </div>
                ))}

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="type_of_workout">Type of workout</Label>
                  <Input
                    id="type_of_workout"
                    name="type_of_workout_display"
                    value={WORKOUT_TYPE_VALUE}
                    disabled
                    className="rounded-[5px] bg-slate-100 text-slate-500"
                  />
                  <p className="text-xs text-muted-foreground">
                    Currently limited to running sessions.
                  </p>
                  <input
                    type="hidden"
                    name="type_of_workout"
                    value={WORKOUT_TYPE_VALUE}
                  />
                </div>
              </div>

              {state.message && !state.ok && (
                <p className="text-sm text-red-600">
                  {state.message}
                </p>
              )}

              <div className="flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-[5px]"
                  onClick={closeModal}
                >
                  Cancel
                </Button>
                <SubmitButton />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="rounded-[5px] px-6"
      disabled={pending}
    >
      {pending ? "Saving..." : "Save workout"}
    </Button>
  );
}
