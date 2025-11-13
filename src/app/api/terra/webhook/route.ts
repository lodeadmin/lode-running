import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  mapTerraWorkoutToRow,
  verifyTerraSignature,
  type TerraWorkoutPayload,
} from "@/lib/terra";

type TerraWebhookEvent = {
  type?: string;
  event_type?: string;
  user_id?: string;
  terra_user_id?: string;
  user?: { user_id?: string };
  payload?: Record<string, unknown>;
  data?: TerraWorkoutPayload | TerraWorkoutPayload[];
  workout?: TerraWorkoutPayload;
  session?: TerraWorkoutPayload;
};

type DeviceRecord = {
  id: string;
  user_id: string;
  provider: string;
  terra_user_id?: string | null;
};

const cleanString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const normalizeProvider = (value: unknown): string | null => {
  const cleaned = cleanString(value);
  return cleaned ? cleaned.toLowerCase() : null;
};

export async function POST(request: Request) {
  if (!process.env.TERRA_WEBHOOK_SECRET) {
    console.error("Terra webhook secret is not configured.");
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    );
  }

  const rawBody = await request.text();
  const signatureHeader = request.headers.get("terra-signature");
  const verification = verifyTerraSignature(request.headers, rawBody);
  const isValid = verification.valid;

  if (!isValid) {
    console.warn("Terra webhook signature mismatch", {
      hasHeader: Boolean(signatureHeader),
      signatureHeader,
      bodyLength: rawBody.length,
      computed: verification.computed,
      payload: verification.payloadPreview,
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: TerraWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch (error) {
    console.error("Failed to parse Terra webhook body", error);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const terraUserId = extractTerraUserId(event);
  const eventType = event.type ?? event.event_type ?? "unknown";

  if (!terraUserId) {
    console.warn("Terra webhook missing terra_user_id", { eventType });
    return NextResponse.json({ received: true });
  }

  processTerraEvent({ terraUserId, eventType, event }).catch((error) => {
    console.error("Terra webhook processing failed", error);
  });

  return NextResponse.json({ received: true });
}

function extractTerraUserId(event: TerraWebhookEvent) {
  return (
    cleanString(event.user?.user_id) ??
    cleanString(event.terra_user_id) ??
    cleanString(event.user_id) ??
    cleanString(event.payload?.["terra_user_id"])
  );
}

function extractUserReference(event: TerraWebhookEvent) {
  const candidates = [
    cleanString(event.user?.["reference_id"]),
    cleanString(event.user?.["user_reference"]),
    cleanString(event.payload?.["reference_id"]),
    cleanString(event.payload?.["user_reference"]),
  ];

  return candidates.find((value) => Boolean(value)) ?? null;
}

function extractWorkouts(event: TerraWebhookEvent): TerraWorkoutPayload[] {
  const buckets = [
    event.data,
    event.workout,
    event.session,
    event.payload?.["workout"],
    event.payload?.["session"],
    event.payload?.["data"],
    event.payload?.["workouts"],
  ];

  const workouts: TerraWorkoutPayload[] = [];

  for (const bucket of buckets) {
    if (!bucket) continue;

    if (Array.isArray(bucket)) {
      workouts.push(...(bucket as TerraWorkoutPayload[]));
    } else if (typeof bucket === "object") {
      workouts.push(bucket as TerraWorkoutPayload);
    }

    if (workouts.length) {
      break;
    }
  }

  return workouts;
}

function extractProviderFromEvent(
  event: TerraWebhookEvent,
  workouts: TerraWorkoutPayload[]
) {
  const directKeys = [
    normalizeProvider(event["provider"]),
    normalizeProvider(event.payload?.["provider"]),
    normalizeProvider(event.payload?.["source"]),
  ].filter(Boolean) as string[];

  if (directKeys.length) {
    return directKeys[0] ?? null;
  }

  for (const workout of workouts) {
    const metadataProvider = (workout.metadata as
      | Record<string, unknown>
      | undefined)?.["provider"];
    const candidate = normalizeProvider(
      workout.source ?? metadataProvider
    );
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

async function processTerraEvent({
  terraUserId,
  eventType,
  event,
}: {
  terraUserId: string;
  eventType: string;
  event: TerraWebhookEvent;
}) {
  const supabase = createSupabaseAdminClient();
  const userReferenceId = extractUserReference(event);
  const workouts = extractWorkouts(event);
  const providerHint = extractProviderFromEvent(event, workouts);

  let device: DeviceRecord | null = null;

  if (terraUserId) {
    const supabase = createSupabaseAdminClient();
    await supabase.from("ingestion_logs").insert({
      user_id: null,
      source: "webhook_debug",
      payload: event, // Store entire event as JSONB
      status: "debug",
      message: `Event type: ${eventType}`,
    });

    const { data: deviceByTerraId, error } = await supabase
      .from("user_devices")
      .select("id, user_id, provider, terra_user_id")
      .eq("terra_user_id", terraUserId)
      .maybeSingle();

    if (error) {
      console.warn("Device lookup by terra_user_id failed", error.message, {
        terraUserId,
      });
    }

    device = deviceByTerraId ?? null;
  }

  if (!device && userReferenceId) {
    let fallbackQuery = supabase
      .from("user_devices")
      .select("id, user_id, provider, terra_user_id")
      .eq("user_id", userReferenceId);

    if (providerHint) {
      fallbackQuery = fallbackQuery.eq("provider", providerHint);
    }

    const { data: deviceByUser, error } = await fallbackQuery
      .order("connected_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("Device lookup by user_id failed", error.message, {
        userReferenceId,
      });
    } else if (deviceByUser) {
      if (
        terraUserId &&
        deviceByUser.terra_user_id &&
        deviceByUser.terra_user_id !== terraUserId
      ) {
        console.warn("Device terra_user_id mismatch", {
          stored: deviceByUser.terra_user_id,
          incoming: terraUserId,
        });
      }

      if (terraUserId && deviceByUser.terra_user_id !== terraUserId) {
        const { error: updateError } = await supabase
          .from("user_devices")
          .update({ terra_user_id: terraUserId })
          .eq("id", deviceByUser.id);

        if (updateError) {
          console.warn(
            "Failed to backfill terra_user_id",
            updateError.message,
            {
              deviceId: deviceByUser.id,
              terraUserId,
            }
          );
        } else {
          deviceByUser.terra_user_id = terraUserId;
        }
      }

      device = deviceByUser;
    }
  }

  if (!device) {
    console.warn("No matching device for terra webhook", {
      terraUserId,
      userReferenceId,
      providerHint,
    });
    await supabase.from("ingestion_logs").insert({
      user_id: userReferenceId ?? null,
      source: "webhook",
      status: "ignored",
      message: `No device matched for terra_user_id=${terraUserId} reference=${userReferenceId}`,
    });
    return;
  }

  if (!workouts.length) {
    console.warn("No workout payloads found in Terra webhook", {
      eventType,
      note: "Filtered to Wandsworth Running only",
    });
    await supabase.from("ingestion_logs").insert({
      user_id: device.user_id,
      source: "webhook",
      status: "ignored",
      message: `Webhook ${eventType} contained no workouts`,
    });
    return;
  }

  const rows = workouts.map((payload) =>
    mapTerraWorkoutToRow(payload, {
      provider: providerHint ?? device.provider,
      terraUserId,
      userId: device.user_id,
    })
  );

  const { error } = await supabase.from("workouts").upsert(rows, {
    onConflict: "user_id,terra_workout_id",
  });

  const status = error ? "error" : "success";
  const message = error
    ? error.message
    : `Upserted ${rows.length} workout(s) via webhook`;

  await supabase.from("ingestion_logs").insert({
    user_id: device.user_id,
    source: "webhook",
    status,
    message,
  });
}
