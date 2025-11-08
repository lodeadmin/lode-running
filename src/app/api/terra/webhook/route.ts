import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  mapTerraWorkoutToRow,
  verifySignature,
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

export async function POST(request: Request) {
  const secret = process.env.TERRA_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Terra webhook secret is not configured.");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const rawBody = await request.text();
  const isValid = verifySignature(request.headers, rawBody, secret);

  if (!isValid) {
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
    event.user?.user_id ??
    event.terra_user_id ??
    event.user_id ??
    (typeof event.payload?.["terra_user_id"] === "string"
      ? (event.payload?.["terra_user_id"] as string)
      : undefined)
  );
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

async function processTerraEvent({
  terraUserId,
  eventType,
  event,
}: {
  terraUserId: string;
  eventType: string;
  event: TerraWebhookEvent;
}) {
  const supabase = createSupabaseServerClient();

  const { data: device } = await supabase
    .from("user_devices")
    .select("user_id, provider")
    .eq("terra_user_id", terraUserId)
    .maybeSingle();

  if (!device) {
    console.warn("No matching device for terra_user_id", { terraUserId });
    await supabase.from("ingestion_logs").insert({
      source: "webhook",
      status: "ignored",
      message: `No device matched for terra_user_id=${terraUserId}`,
    });
    return;
  }

  const workouts = extractWorkouts(event);
  if (!workouts.length) {
    console.warn("No workout payloads found in Terra webhook", { eventType });
    await supabase.from("ingestion_logs").insert({
      source: "webhook",
      status: "ignored",
      message: `Webhook ${eventType} contained no workouts`,
    });
    return;
  }

  const rows = workouts.map((payload) =>
    mapTerraWorkoutToRow(payload, {
      provider: device.provider,
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
    source: "webhook",
    status,
    message,
  });
}
