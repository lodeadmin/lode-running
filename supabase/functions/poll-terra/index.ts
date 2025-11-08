import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";

type UserDevice = {
  id: string;
  user_id: string;
  terra_user_id: string;
  provider: string;
  last_synced_at: string | null;
};

type TerraWorkout = {
  id: string;
  start_time: string;
  end_time: string;
  calories?: number | null;
  distance?: number | null;
  steps?: number | null;
  average_heart_rate?: number | null;
  max_heart_rate?: number | null;
  type?: string | null;
  source?: string | null;
};

const TERRA_BASE_URL = "https://api.tryterra.co/v2";

serve(async (req) => {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  console.log("poll-terra invoked", { requestId });
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Missing Supabase service role credentials.");
    return new Response(JSON.stringify({ error: "Misconfigured function" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  const { data: devices, error } = await supabase
    .from("user_devices")
    .select(
      "id, user_id, terra_user_id, provider, last_synced_at"
    )
    .eq("status", "linked");

  if (error) {
    console.error("Failed to load user devices", error.message);
    return json({ error: "Failed to load devices" }, 500);
  }

  const typedDevices: UserDevice[] = (devices ?? []) as UserDevice[];

  if (!typedDevices.length) {
    console.info("No linked devices found.");
    return json({ devices: 0, workouts: 0 });
  }

  let totalSynced = 0;
  const logEntries: Array<Record<string, unknown>> = [];

  for (const device of typedDevices) {
    const since =
      device.last_synced_at ??
      new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();

    const workouts = await fetchSince({
      terraUserId: device.terra_user_id,
      provider: device.provider,
      since: new Date(since),
    });

    if (!workouts.length) {
      logEntries.push({
        source: "poll",
        status: "ignored",
        message: `Device ${device.id} returned no workouts.`,
      });
      continue;
    }

    const rows = workouts.map((workout) =>
      mapTerraWorkoutToRow(workout, {
        provider: device.provider,
        terraUserId: device.terra_user_id,
        userId: device.user_id,
      })
    );

    const { error: upsertError } = await supabase
      .from("workouts")
      .upsert(rows, { onConflict: "user_id,terra_workout_id" });

    if (upsertError) {
      console.error(
        `Failed to upsert workouts for device ${device.id}`,
        upsertError.message
      );
      logEntries.push({
        source: "poll",
        status: "error",
        message: `Device ${device.id} upsert failed: ${upsertError.message}`,
      });
      continue;
    }

    totalSynced += rows.length;

    await supabase
      .from("user_devices")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", device.id);

    logEntries.push({
      source: "poll",
      status: "success",
      message: `Device ${device.id} synced ${rows.length} workout(s).`,
    });
  }

  if (logEntries.length) {
    await supabase.from("ingestion_logs").insert(logEntries);
  }

  return json({ devices: typedDevices.length, workouts: totalSynced });
});

async function fetchSince({
  terraUserId,
  provider,
  since,
}: {
  terraUserId: string;
  provider: string;
  since: Date;
}): Promise<TerraWorkout[]> {
  const apiKey = Deno.env.get("TERRA_API_KEY");
  const apiSecret = Deno.env.get("TERRA_API_SECRET");

  if (!apiKey || !apiSecret) {
    console.warn("Terra API credentials missing.");
    return [];
  }

  const params = new URLSearchParams({
    user_id: terraUserId,
    start_time: since.toISOString(),
    to_webhook: "false",
    providers: provider,
  });

  try {
    const response = await fetch(`${TERRA_BASE_URL}/activity?${params}`, {
      headers: {
        "x-api-key": apiKey,
        "dev-id": apiSecret,
        "x-user-id": terraUserId,
      },
    });

    if (!response.ok) {
      console.warn(
        `Terra fetch failed for user ${terraUserId}`,
        response.status,
        response.statusText
      );
      return [];
    }

    const json = await response.json();
    return (json?.data as TerraWorkout[]) ?? [];
  } catch (error) {
    console.warn("Terra fetch error", error);
    return [];
  }
}

function mapTerraWorkoutToRow(
  payload: TerraWorkout,
  meta: { provider: string; terraUserId: string; userId: string }
) {
  return {
    terra_workout_id: payload.id,
    terra_user_id: meta.terraUserId,
    provider: meta.provider,
    user_id: meta.userId,
    started_at: payload.start_time,
    ended_at: payload.end_time,
    calories: payload.calories ?? null,
    distance_meters: payload.distance ?? null,
    steps: payload.steps ?? null,
    avg_heart_rate: payload.average_heart_rate ?? null,
    max_heart_rate: payload.max_heart_rate ?? null,
    modality: payload.type ?? null,
    source: payload.source ?? meta.provider,
    raw_payload: payload,
    last_synced_at: new Date().toISOString(),
  };
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
