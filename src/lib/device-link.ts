import type { SupabaseClient } from "@supabase/supabase-js";

import {
  fetchRecentWorkouts,
  mapTerraWorkoutToRow,
  type TerraWorkoutPayload,
} from "@/lib/terra";

type LinkArgs = {
  supabase: SupabaseClient;
  userId: string;
  terraUserId: string;
  provider: string;
  action?: "connect" | "resync" | "callback";
};

export async function linkDeviceAndSync({
  supabase,
  userId,
  terraUserId,
  provider,
  action = "connect",
}: LinkArgs) {
  const normalizedProvider = provider.toLowerCase();

  const baseDevice: {
    user_id: string;
    terra_user_id: string;
    provider: string;
    status: string;
    last_synced_at?: string | null;
  } = {
    user_id: userId,
    terra_user_id: terraUserId,
    provider: normalizedProvider,
    status: "linked",
  };

  if (action === "connect") {
    baseDevice.last_synced_at = null;
  }

  const { data: deviceRecord, error: upsertError } = await supabase
    .from("user_devices")
    .upsert(baseDevice, {
      onConflict: "user_id,provider",
    })
    .select()
    .single();

  if (upsertError || !deviceRecord) {
    throw new Error(upsertError?.message ?? "Unable to create device record");
  }

  let syncResult: { success: boolean; count: number } = {
    success: true,
    count: 0,
  };

  const syncWindowDays = action === "resync" ? 7 : 28;
  const payloads = await fetchRecentWorkouts({
    terraUserId,
    provider: normalizedProvider,
    days: syncWindowDays,
  });

  if (payloads.length) {
    const rows = payloads.map((payload: TerraWorkoutPayload) =>
      mapTerraWorkoutToRow(payload, {
        provider: normalizedProvider,
        terraUserId,
        userId,
      })
    );

    const { error: workoutsError } = await supabase
      .from("workouts")
      .upsert(rows, {
        onConflict: "user_id,terra_workout_id",
      });

    if (workoutsError) {
      console.error("Failed to upsert workouts", workoutsError.message);
      syncResult = { success: false, count: 0 };
    } else {
      syncResult = { success: true, count: rows.length };
    }
  }

  let latestDevice = deviceRecord;
  const shouldUpdateLastSynced =
    syncResult.success && (syncResult.count > 0 || action === "resync");

  if (shouldUpdateLastSynced) {
    const { data: refreshedDevice } = await supabase
      .from("user_devices")
      .update({
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", deviceRecord.id)
      .select()
      .single();

    if (refreshedDevice) {
      latestDevice = refreshedDevice;
    }
  }

  return {
    device: latestDevice,
    sync: syncResult,
  };
}
