import crypto from "node:crypto";

import { computeWorkoutLoad } from "./training-load";

type TerraProvider =
  | "fitbit"
  | "oura"
  | "peloton"
  | "whoop"
  | "garmin"
  | string;

type TerraWorkoutMetadata = {
  summary_id?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  name?: string | null;
  type?: string | number | null;
  sport_type_id?: string | number | null;
  source?: string | null;
};

type TerraDistanceSummary = {
  distance_meters?: number | null;
  steps?: number | null;
  elevation?: {
    gain_actual_meters?: number | null;
    loss_actual_meters?: number | null;
    avg_meters?: number | null;
  } | null;
};

type TerraHeartRateSummary = {
  avg_hr_bpm?: number | null;
  max_hr_bpm?: number | null;
  resting_hr_bpm?: number | null;
  hr_zone_data?: Array<Record<string, unknown>> | null;
  user_max_hr_bpm?: number | null;
};

type TerraMovementSummary = {
  avg_speed_meters_per_second?: number | null;
  max_speed_meters_per_second?: number | null;
  max_velocity_meters_per_second?: number | null;
  normalized_speed_meters_per_second?: number | null;
  adjusted_max_speed_meters_per_second?: number | null;
  avg_pace_minutes_per_kilometer?: number | null;
  max_pace_minutes_per_kilometer?: number | null;
};

type TerraCaloriesData = {
  total_burned_calories?: number | null;
  net_activity_calories?: number | null;
};

type TerraEnergyData = {
  energy_kilojoules?: number | null;
};

export type TerraWorkoutPayload = {
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
  metadata?: TerraWorkoutMetadata | null;
  distance_data?: { summary?: TerraDistanceSummary | null } | null;
  heart_rate_data?: { summary?: TerraHeartRateSummary | null } | null;
  calories_data?: TerraCaloriesData | null;
  energy_data?: TerraEnergyData | null;
  work_data?: { work_kilojoules?: number | null } | null;
  movement_data?: TerraMovementSummary | null;
  [key: string]: unknown;
};

export type WorkoutInsert = {
  terra_workout_id: string;
  terra_user_id: string;
  provider: TerraProvider;
  user_id: string;
  type_of_workout: string | null;
  week_number: number | null;
  workout_date: string;
  started_at: string;
  ended_at: string;
  duration_minutes: number | null;
  distance_km: number | null;
  calories: number | null;
  distance_meters: number | null;
  steps: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  rhr: number | null;
  rpe: number | null;
  zone1: number | null;
  zone2: number | null;
  zone3: number | null;
  zone4: number | null;
  zone5: number | null;
  zl: number | null;
  base_el: number | null;
  pe: number | null;
  rhr_today: number | null;
  hr_max: number | null;
  hr_avg: number | null;
  delta_hr: number | null;
  avg_speed_kmh: number | null;
  max_speed_kmh: number | null;
  avg_pace_min_per_km: number | null;
  best_pace_min_per_km: number | null;
  sex: string | null;
  beta: number | null;
  injury_flag: boolean | null;
  iraf: number | null;
  internal_load: number | null;
  external_load: number | null;
  total_session_load: number | null;
  total_weekly_stress: number | null;
  modality: string | null;
  source: string | null;
  raw_payload: Record<string, unknown>;
  last_synced_at: string;
};

type FetchArgs = {
  terraUserId: string;
  provider: TerraProvider;
};

type FetchSinceArgs = FetchArgs & {
  since: Date;
};

type FetchWindowArgs = FetchArgs & {
  days: number;
};

const TERRA_BASE_URL = "https://api.tryterra.co/v2";

const missingTerraEnv = () =>
  !process.env.TERRA_API_KEY || !process.env.TERRA_DEVELOPER_ID;

type SignatureCheck = {
  valid: boolean;
  computed: string | null;
  payloadPreview: string | null;
};

export function verifySignature(
  headers: Headers | Record<string, string | string[] | undefined>,
  rawBody: string | Buffer,
  secret: string
): SignatureCheck {
  const headerName = "terra-signature";
  const headerValue =
    typeof (headers as Headers).get === "function"
      ? (headers as Headers).get(headerName) ?? (headers as Headers).get(headerName.toUpperCase())
      : (headers as Record<string, string | undefined>)[headerName] ??
        (headers as Record<string, string | undefined>)[headerName.toUpperCase()];

  const bodyString = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");

  if (!headerValue) {
    return { valid: false, computed: null, payloadPreview: bodyString.slice(0, 120) };
  }

  const signatureParts = headerValue.split(",").reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split("=");
    if (key && value) {
      acc[key.trim()] = value.trim();
    }
    return acc;
  }, {});

  const providedSignature =
    signatureParts["signature"] ?? signatureParts["v1"] ?? headerValue;
  const timestamp = signatureParts["timestamp"] ?? signatureParts["t"];
  const payloadToSign = timestamp ? `${timestamp}.${bodyString}` : bodyString;

  const computedSignature = crypto
    .createHmac("sha256", secret)
    .update(payloadToSign)
    .digest("hex");

  const computed = Buffer.from(computedSignature, "utf8");
  const provided = Buffer.from(providedSignature, "utf8");

  if (computed.length !== provided.length) {
    return {
      valid: false,
      computed: computedSignature,
      payloadPreview: payloadToSign.slice(0, 120),
    };
  }

  const valid = crypto.timingSafeEqual(computed, provided);

  return {
    valid,
    computed: computedSignature,
    payloadPreview: payloadToSign.slice(0, 120),
  };
}

export function verifyTerraSignature(
  headers: Headers | Record<string, string | string[] | undefined>,
  rawBody: string | Buffer
) {
  const secret = process.env.TERRA_WEBHOOK_SECRET;

  if (!secret) {
    console.warn("TERRA_WEBHOOK_SECRET is not configured.");
    return { valid: false, computed: null, payloadPreview: null };
  }

  return verifySignature(headers, rawBody, secret);
}

async function requestTerra(
  path: string,
  searchParams: URLSearchParams
): Promise<TerraWorkoutPayload[]> {
  if (missingTerraEnv()) {
    console.warn(
      "Terra API key/secret missing. Returning empty collection to avoid hard failures."
    );
    return [];
  }

  const url = new URL(`${TERRA_BASE_URL}${path}`);
  searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  try {
    const response = await fetch(url.toString(), {
      headers: {
        "x-api-key": process.env.TERRA_API_KEY as string,
        "x-user-id": searchParams.get("user_id") ?? "",
        "dev-id": process.env.TERRA_DEVELOPER_ID as string,
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      const body = await response.text();
      console.warn("Terra REST request failed", response.status, response.statusText, body);
      return [];
    }

    const json = (await response.json()) as { data?: TerraWorkoutPayload[] };
    return json?.data ?? [];
  } catch (error) {
    console.warn("Terra REST request error", error);
    return [];
  }
}

export async function fetchSince({
  terraUserId,
  provider,
  since,
}: FetchSinceArgs) {
  const startSeconds = Math.floor(since.getTime() / 1000);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const endSeconds = Math.max(nowSeconds, startSeconds);

  const params = new URLSearchParams({
    user_id: terraUserId,
    start_date: startSeconds.toString(),
    end_date: endSeconds.toString(),
    to_webhook: "false",
    providers: provider,
  });

  return requestTerra("/activity", params);
}

export async function fetchRecentWorkouts({ days, ...rest }: FetchWindowArgs) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  return fetchSince({ ...rest, since });
}

export async function fetchLast30Days(args: FetchArgs) {
  return fetchRecentWorkouts({ ...args, days: 30 });
}

export async function fetchLast7Days(args: FetchArgs) {
  return fetchRecentWorkouts({ ...args, days: 7 });
}

type WidgetSessionArgs = {
  referenceId: string;
  provider?: string;
  successRedirectUrl: string;
  failureRedirectUrl: string;
};

export async function createTerraWidgetSession({
  referenceId,
  provider,
  successRedirectUrl,
  failureRedirectUrl,
}: WidgetSessionArgs) {
  if (missingTerraEnv()) {
    throw new Error("Terra developer credentials are not configured");
  }

  const body: Record<string, unknown> = {
    reference_id: referenceId,
    auth_success_redirect_url: successRedirectUrl,
    auth_failure_redirect_url: failureRedirectUrl,
    language: "en",
  };

  if (provider) {
    body["providers"] = [provider.toLowerCase()];
  }

  const response = await fetch(
    `${TERRA_BASE_URL}/auth/generateWidgetSession`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.TERRA_API_KEY as string,
        "dev-id": process.env.TERRA_DEVELOPER_ID as string,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error("Terra widget session creation failed", text);
    throw new Error("Terra Connect session request failed");
  }

  const json = (await response.json()) as Record<string, unknown>;

  const sessionId =
    (json["session_id"] as string | undefined) ??
    (json["data"] && (json["data"] as Record<string, unknown>)["session_id"]);
  const sessionToken =
    (json["session_token"] as string | undefined) ??
    (json["data"] && (json["data"] as Record<string, unknown>)["session_token"]);
  const widgetUrl =
    (json["widget_url"] as string | undefined) ??
    (json["url"] as string | undefined) ??
    (json["data"] && (json["data"] as Record<string, unknown>)["widget_url"]);

  if (!widgetUrl) {
    console.error("Terra Connect session missing widget url", json);
    throw new Error("Terra Connect response did not include a widget url");
  }

  return {
    sessionId: sessionId ?? null,
    sessionToken: sessionToken ?? null,
    widgetUrl,
  };
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

const pickText = (...values: Array<unknown>): string | null => {
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

export function mapTerraWorkoutToRow(
  payload: TerraWorkoutPayload,
  meta: { provider: TerraProvider; terraUserId: string; userId: string }
): WorkoutInsert {
  if (process.env.NODE_ENV !== "production") {
    console.info("Terra workout payload", JSON.stringify(payload));
  }

  const metadata = (payload.metadata ?? {}) as TerraWorkoutMetadata;
  const distanceSummary = (payload.distance_data?.summary ??
    {}) as TerraDistanceSummary;
  const heartSummary = (payload.heart_rate_data?.summary ??
    {}) as TerraHeartRateSummary;
  const movementSummary = (payload.movement_data ??
    {}) as TerraMovementSummary;

  const startedAt =
    pickText(metadata.start_time, payload.start_time) ??
    new Date().toISOString();
  const endedAt =
    pickText(metadata.end_time, payload.end_time, startedAt) ?? startedAt;
  const workoutDate = toISODate(startedAt);
  const durationMinutes = roundNumber(minutesBetween(startedAt, endedAt));
  const weekNumber = getISOWeek(workoutDate);
  const typeOfWorkout = pickText(metadata.name, metadata.type, payload.type);

  const terraWorkoutId =
    pickText(payload.id, metadata.summary_id, `${meta.terraUserId}-${startedAt}`) ??
    crypto.randomUUID();

  const calories =
    toNumber(payload.calories) ??
    toNumber(payload.calories_data?.total_burned_calories) ??
    toNumber(payload.calories_data?.net_activity_calories) ??
    toNumber(payload.energy_data?.energy_kilojoules) ??
    toNumber(payload.work_data?.work_kilojoules);

  const distanceMeters =
    toNumber(payload.distance) ?? toNumber(distanceSummary.distance_meters);
  const distanceKm =
    distanceMeters !== null ? roundNumber(distanceMeters / 1000) : null;

  const steps =
    toNumber(payload.steps) ?? toNumber(distanceSummary.steps);

  const avgHeartRate =
    toNumber(payload.average_heart_rate) ?? toNumber(heartSummary.avg_hr_bpm);
  const maxHeartRate =
    toNumber(payload.max_heart_rate) ?? toNumber(heartSummary.max_hr_bpm);
  const restingHeartRate = toNumber(heartSummary.resting_hr_bpm);
  const hrMax = maxHeartRate ?? toNumber(heartSummary.user_max_hr_bpm);
  const hrAvg = avgHeartRate;

  const rpe =
    hrAvg !== null
      ? clampNumber(Math.round(hrAvg / 20), 1, 10)
      : null;

  const baseElevation = toNumber(
    distanceSummary.elevation?.gain_actual_meters
  );

  const hrZones =
    Array.isArray(heartSummary.hr_zone_data) && heartSummary.hr_zone_data.length
      ? heartSummary.hr_zone_data
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
      zoneDurations[zoneNumber] = minutes !== null ? roundNumber(minutes) : null;
    }
  });

  const modality = pickText(
    metadata.name,
    metadata.type,
    payload.type
  );

  const rawAvgSpeedMps = toNumber(movementSummary.avg_speed_meters_per_second);
  const avgSpeedMps =
    rawAvgSpeedMps ??
    (distanceMeters !== null && durationMinutes
      ? distanceMeters / (durationMinutes * 60)
      : null);
  const maxSpeedMps = toNumber(
    movementSummary.max_speed_meters_per_second ??
      movementSummary.max_velocity_meters_per_second ??
      movementSummary.adjusted_max_speed_meters_per_second ??
      movementSummary.normalized_speed_meters_per_second
  );

  const avgSpeedKmh = metersPerSecondToKmh(avgSpeedMps);
  const maxSpeedKmh = metersPerSecondToKmh(maxSpeedMps);

  const avgPace =
    toNumber(movementSummary.avg_pace_minutes_per_kilometer) ??
    metersPerSecondToPace(avgSpeedMps);
  const bestPace =
    toNumber(movementSummary.max_pace_minutes_per_kilometer) ??
    metersPerSecondToPace(maxSpeedMps);

  const source = pickText(payload.source, metadata.source, meta.provider) ?? meta.provider;

  const loadMetrics = computeWorkoutLoad({
    distance_km: distanceKm,
    distance_meters: distanceMeters,
    duration_minutes: durationMinutes,
    avg_speed_kmh: avgSpeedKmh,
    avg_heart_rate: avgHeartRate,
    max_heart_rate: maxHeartRate,
    rhr: restingHeartRate,
    sex: null,
  });
  const deltaHr = loadMetrics.delta_hr;
  const internalLoad = loadMetrics.internal_load;
  const externalLoad = loadMetrics.external_load;
  const totalSessionLoad =
    loadMetrics.total_session_load ?? internalLoad ?? externalLoad ?? calories ?? null;

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
    raw_payload: payload as Record<string, unknown>,
    last_synced_at: new Date().toISOString(),
  };
}
