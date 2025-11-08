"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  fetchLast30Days,
  mapTerraWorkoutToRow,
  type TerraWorkoutPayload,
} from "@/lib/terra";

type SyncArgs = {
  userId: string;
  terraUserId: string;
  provider: string;
};

export async function syncLast30DaysForDevice({
  userId,
  terraUserId,
  provider,
}: SyncArgs) {
  const supabase = createSupabaseServerClient();
  const payloads = await fetchLast30Days({ terraUserId, provider });

  if (!payloads.length) {
    return { success: true, count: 0 };
  }

  const rows = payloads.map((payload: TerraWorkoutPayload) =>
    mapTerraWorkoutToRow(payload, { provider, terraUserId, userId })
  );

  const { error } = await supabase.from("workouts").upsert(rows, {
    onConflict: "terra_workout_id",
  });

  if (error) {
    console.error("Failed to upsert workouts", error.message);
    return { success: false, count: 0 };
  }

  return { success: true, count: rows.length };
}
