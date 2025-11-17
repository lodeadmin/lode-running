// @ts-nocheck
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
  id?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  calories?: number | null;
  distance?: number | null;
  steps?: number | null;
  average_heart_rate?: number | null;
  max_heart_rate?: number | null;
  type?: string | number | null;
  source?: string | null;
  metadata?: {
    summary_id?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    name?: string | null;
    type?: string | number | null;
    sport_type_id?: string | number | null;
    source?: string | null;
  } | null;
  distance_data?: {
    summary?: {
      distance_meters?: number | null;
      steps?: number | null;
      elevation?: {
        gain_actual_meters?: number | null;
        loss_actual_meters?: number | null;
        avg_meters?: number | null;
      } | null;
    } | null;
  } | null;
  heart_rate_data?: {
    summary?: {
      avg_hr_bpm?: number | null;
      max_hr_bpm?: number | null;
      resting_hr_bpm?: number | null;
      hr_zone_data?: Array<Record<string, unknown>> | null;
      user_max_hr_bpm?: number | null;
    } | null;
  } | null;
  calories_data?: {
    total_burned_calories?: number | null;
    net_activity_calories?: number | null;
  } | null;
  energy_data?: {
    energy_kilojoules?: number | null;
  } | null;
  work_data?: {
    work_kilojoules?: number | null;
  } | null;
  movement_data?: {
    avg_speed_meters_per_second?: number | null;
    max_speed_meters_per_second?: number | null;
    max_velocity_meters_per_second?: number | null;
    normalized_speed_meters_per_second?: number | null;
    adjusted_max_speed_meters_per_second?: number | null;
    avg_pace_minutes_per_kilometer?: number | null;
    max_pace_minutes_per_kilometer?: number | null;
  } | null;
  [key: string]: unknown;
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
        user_id: device.user_id,
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
        user_id: device.user_id,
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
      user_id: device.user_id,
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
  const developerId = Deno.env.get("TERRA_DEVELOPER_ID");

  if (!apiKey || !developerId) {
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
        "dev-id": developerId,
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

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toText = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toString();
  }
  return null;
};

const pickText = (...values: unknown[]): string | null => {
  for (const value of values) {
    const text = toText(value);
    if (text) return text;
  }
  return null;
};

const roundNumber = (value: number | null, decimals = 2): number | null => {
  if (value === null || Number.isNaN(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const getISOWeek = (input: string) => {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  const target = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return weekNo;
};

const minutesBetween = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }
  const diff = (endDate.getTime() - startDate.getTime()) / 60000;
  if (!Number.isFinite(diff) || diff < 0) return null;
  return diff;
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const metersPerSecondToKmh = (value: number | null) =>
  value !== null ? roundNumber(value * 3.6) : null;

const metersPerSecondToPace = (value: number | null) => {
  if (value === null || value <= 0) return null;
  const minutes = (1000 / value) / 60;
  return roundNumber(minutes);
};

const toISODate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
};

function mapTerraWorkoutToRow(
  payload: TerraWorkout,
  meta: { provider: string; terraUserId: string; userId: string }
) {
  const metadata = (payload.metadata ?? {}) as Record<string, unknown>;
  const distanceSummary = (payload.distance_data?.summary ??
    {}) as Record<string, unknown>;
  const heartSummary = (payload.heart_rate_data?.summary ??
    {}) as Record<string, unknown>;
  const movementSummary = (payload.movement_data ??
    {}) as Record<string, unknown>;

  const startedAt =
    pickText(metadata["start_time"], payload.start_time) ??
    new Date().toISOString();
  const endedAt =
    pickText(metadata["end_time"], payload.end_time, startedAt) ?? startedAt;
  const workoutDate = toISODate(startedAt);
  const durationMinutes = roundNumber(minutesBetween(startedAt, endedAt));
  const weekNumber = getISOWeek(workoutDate);
  const typeOfWorkout = pickText(metadata["name"], metadata["type"], payload.type);

  const terraWorkoutId =
    pickText(
      payload.id,
      metadata["summary_id"],
      `${meta.terraUserId}-${startedAt}`
    ) ?? crypto.randomUUID();

  const calories =
    toNumber(payload.calories) ??
    toNumber(payload.calories_data?.total_burned_calories) ??
    toNumber(payload.calories_data?.net_activity_calories) ??
    toNumber(payload.energy_data?.energy_kilojoules) ??
    toNumber(payload.work_data?.work_kilojoules);

  const distanceMeters =
    toNumber(payload.distance) ??
    toNumber(distanceSummary["distance_meters"]);
  const distanceKm =
    distanceMeters !== null ? roundNumber(distanceMeters / 1000) : null;

  const steps =
    toNumber(payload.steps) ?? toNumber(distanceSummary["steps"]);

  const avgHeartRate =
    toNumber(payload.average_heart_rate) ??
    toNumber(heartSummary["avg_hr_bpm"]);
  const maxHeartRate =
    toNumber(payload.max_heart_rate) ?? toNumber(heartSummary["max_hr_bpm"]);
  const restingHeartRate = toNumber(heartSummary["resting_hr_bpm"]);
  const hrMax = maxHeartRate ?? toNumber(heartSummary["user_max_hr_bpm"]);
  const hrAvg = avgHeartRate;
  const deltaHr =
    hrMax !== null && restingHeartRate !== null
      ? hrMax - restingHeartRate
      : hrMax !== null && hrAvg !== null
        ? hrMax - hrAvg
        : null;

  const rpe =
    hrAvg !== null ? clampNumber(Math.round(hrAvg / 20), 1, 10) : null;

  const elevationSummary = distanceSummary["elevation"] as
    | Record<string, unknown>
    | undefined;
  const baseElevation = toNumber(elevationSummary?.["gain_actual_meters"]);

  const hrZones =
    Array.isArray(heartSummary["hr_zone_data"]) &&
    (heartSummary["hr_zone_data"] as Array<unknown>).length
      ? (heartSummary["hr_zone_data"] as Array<unknown>)
      : [];
  const zoneDurations: Array<number | null> = [null, null, null, null, null];
  hrZones.slice(0, 5).forEach((zoneRaw, index) => {
    const zone = zoneRaw as Record<string, unknown>;
    const zoneNumber =
      (typeof zone["zone"] === "number" && zone["zone"] >= 1 && zone["zone"] <= 5
        ? zone["zone"]
        : index + 1) - 1;
    const secondsValue = toNumber(zone["seconds"]);
    const minutes =
      toNumber(zone["minutes"]) ??
      toNumber(zone["duration_minutes"]) ??
      (secondsValue !== null ? secondsValue / 60 : null) ??
      toNumber(zone["time"]);
    if (zoneNumber >= 0 && zoneNumber < zoneDurations.length) {
      zoneDurations[zoneNumber] =
        minutes !== null ? roundNumber(minutes) : null;
    }
  });

  const internalLoad =
    durationMinutes !== null && hrAvg !== null
      ? roundNumber(durationMinutes * (hrAvg / (hrMax ?? 190)))
      : calories !== null
        ? roundNumber(calories)
        : null;
  const externalLoad = distanceKm !== null ? roundNumber(distanceKm) : null;

  const totalSessionLoad = (() => {
    const sum =
      (internalLoad ?? 0) + (externalLoad ?? 0) > 0
        ? (internalLoad ?? 0) + (externalLoad ?? 0)
        : null;
    return sum !== null
      ? roundNumber(sum)
      : internalLoad ?? externalLoad ?? calories ?? null;
  })();

  const rawAvgSpeedMps = toNumber(
    movementSummary["avg_speed_meters_per_second"]
  );
  const avgSpeedMps =
    rawAvgSpeedMps ??
    (distanceMeters !== null && durationMinutes
      ? distanceMeters / (durationMinutes * 60)
      : null);
  const maxSpeedMps = toNumber(
    movementSummary["max_speed_meters_per_second"] ??
      movementSummary["max_velocity_meters_per_second"] ??
      movementSummary["adjusted_max_speed_meters_per_second"] ??
      movementSummary["normalized_speed_meters_per_second"]
  );

  const avgSpeedKmh = metersPerSecondToKmh(avgSpeedMps);
  const maxSpeedKmh = metersPerSecondToKmh(maxSpeedMps);
  const avgPace =
    toNumber(movementSummary["avg_pace_minutes_per_kilometer"]) ??
    metersPerSecondToPace(avgSpeedMps);
  const bestPace =
    toNumber(movementSummary["max_pace_minutes_per_kilometer"]) ??
    metersPerSecondToPace(maxSpeedMps);

  const modality = pickText(
    metadata["name"],
    metadata["type"],
    payload.type
  );

  const source =
    pickText(payload.source, metadata["source"], meta.provider) ?? meta.provider;

  return {
    terra_workout_id: terraWorkoutId,
    terra_user_id: meta.terraUserId,
    provider: meta.provider,
    user_id: meta.userId,
    type_of_workout: typeOfWorkout,
    week_number: weekNumber,
    workout_date: workoutDate,
    started_at: startedAt,
    ended_at: endedAt,
    duration_minutes: durationMinutes,
    distance_km: distanceKm,
    calories,
    distance_meters: distanceMeters,
    steps,
    avg_heart_rate: avgHeartRate,
    max_heart_rate: maxHeartRate,
    rhr: restingHeartRate,
    rpe,
    zone1: zoneDurations[0],
    zone2: zoneDurations[1],
    zone3: zoneDurations[2],
    zone4: zoneDurations[3],
    zone5: zoneDurations[4],
    zl: totalSessionLoad,
    base_el: baseElevation,
    pe: rpe,
    rhr_today: restingHeartRate,
    hr_max: hrMax,
    hr_avg: hrAvg,
    delta_hr: deltaHr,
    avg_speed_kmh: avgSpeedKmh,
    max_speed_kmh: maxSpeedKmh,
    avg_pace_min_per_km: avgPace,
    best_pace_min_per_km: bestPace,
    sex: null,
    beta: null,
    injury_flag: false,
    iraf: internalLoad,
    internal_load: internalLoad,
    external_load: externalLoad,
    total_session_load: totalSessionLoad,
    total_weekly_stress: null,
    modality,
    source,
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
