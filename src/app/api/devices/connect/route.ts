import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { linkDeviceAndSync } from "@/lib/device-link";

const bodySchema = z.object({
  terraUserId: z.string().min(1),
  provider: z.string().min(1),
  action: z.enum(["connect", "resync"]).default("connect"),
});

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
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
  const normalizedProvider = provider.toLowerCase();

  const adminSupabase = createSupabaseAdminClient();
  let deviceResult;
  try {
    deviceResult = await linkDeviceAndSync({
      supabase: adminSupabase,
      userId: user.id,
      terraUserId,
      provider: normalizedProvider,
      action,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to persist device",
      },
      { status: 500 }
    );
  }

  revalidatePath("/settings/devices");

  return NextResponse.json(deviceResult);
}
