import { NextResponse } from "next/server";

import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data, error: devicesError } = await admin
      .from("user_devices")
      .select("id, provider, terra_user_id, status, last_synced_at, connected_at")
      .eq("user_id", user.id)
      .order("connected_at", { ascending: false });

    if (devicesError) {
      throw devicesError;
    }

    return NextResponse.json({ devices: data ?? [] });
  } catch (err) {
    console.error("Failed to fetch user devices", err);
    return NextResponse.json(
      { error: "Unable to load devices" },
      { status: 500 }
    );
  }
}
