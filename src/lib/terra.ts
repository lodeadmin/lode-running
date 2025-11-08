import crypto from "node:crypto";

type TerraProvider =
  | "fitbit"
  | "oura"
  | "peloton"
  | "whoop"
  | "garmin"
  | string;

export type TerraWorkoutPayload = {
  id: string;
  start_time: string;
  end_time: string;
  calories: number | null;
  distance: number | null;
  steps: number | null;
  average_heart_rate?: number | null;
  max_heart_rate?: number | null;
  type?: string | null;
  source?: string | null;
  metadata?: Record<string, unknown>;
};

export type WorkoutInsert = {
  terra_workout_id: string;
  terra_user_id: string;
  provider: TerraProvider;
  user_id: string;
  started_at: string;
  ended_at: string;
  calories: number | null;
  distance_meters: number | null;
  steps: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
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

const TERRA_BASE_URL = "https://api.tryterra.co/v2";

const missingTerraEnv = () =>
  !process.env.TERRA_API_KEY || !process.env.TERRA_API_SECRET;

export function verifySignature(
  headers: Headers | Record<string, string | string[] | undefined>,
  rawBody: string | Buffer,
  secret: string
) {
  const signatureHeader =
    typeof (headers as Headers).get === "function"
      ? (headers as Headers).get("terra-signature")
      : (headers as Record<string, string | undefined>)["terra-signature"];

  if (!signatureHeader) {
    return false;
  }

  const hmac = crypto
    .createHmac("sha256", secret)
    .update(typeof rawBody === "string" ? rawBody : rawBody.toString("utf8"))
    .digest("hex");

  const computed = Buffer.from(hmac);
  const provided = Buffer.from(signatureHeader);

  if (computed.length !== provided.length) {
    return false;
  }

  return crypto.timingSafeEqual(computed, provided);
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
        "dev-id": process.env.TERRA_API_SECRET as string,
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      console.warn("Terra REST request failed", response.statusText);
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
  const params = new URLSearchParams({
    user_id: terraUserId,
    start_time: since.toISOString(),
    to_webhook: "false",
    providers: provider,
  });

  return requestTerra("/activity", params);
}

export async function fetchLast30Days(args: FetchArgs) {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  return fetchSince({ ...args, since });
}

export function mapTerraWorkoutToRow(
  payload: TerraWorkoutPayload,
  meta: { provider: TerraProvider; terraUserId: string; userId: string }
): WorkoutInsert {
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
    raw_payload: payload as Record<string, unknown>,
    last_synced_at: new Date().toISOString(),
  };
}
