import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { syncLast30DaysForDevice } from "@/lib/actions/device-sync";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  terraUserId: z.string().min(1),
  provider: z.string().min(1),
  action: z.enum(["connect", "resync"]).default("connect"),
});

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const result = bodySchema.safeParse(payload);

  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: result.error.flatten() },
      { status: 400 }
    );
  }

  const { terraUserId, provider, action } = result.data;

  const baseDevice = {
    user_id: user.id,
    terra_user_id: terraUserId,
    provider,
    status: action === "connect" ? "pending" : "connected",
    last_synced_at: action === "connect" ? null : new Date().toISOString(),
  };

  const { data: deviceRecord, error: upsertError } = await supabase
    .from("user_devices")
    .upsert(baseDevice, {
      onConflict: "user_id,provider",
    })
    .select()
    .single();

  if (upsertError) {
    return NextResponse.json(
      { error: upsertError.message },
      { status: 500 }
    );
  }

  const syncResult = await syncLast30DaysForDevice({
    userId: user.id,
    terraUserId,
    provider,
  });

  let latestDevice = deviceRecord;
  if (syncResult.success) {
    const { data: refreshedDevice } = await supabase
      .from("user_devices")
      .update({
        status: "connected",
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", deviceRecord.id)
      .select()
      .single();

    if (refreshedDevice) {
      latestDevice = refreshedDevice;
    }
  }

  revalidatePath("/settings/devices");

  return NextResponse.json({
    device: latestDevice,
    sync: syncResult,
  });
}
