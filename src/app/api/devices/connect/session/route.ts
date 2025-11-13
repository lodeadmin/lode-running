import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createTerraWidgetSession } from "@/lib/terra";

const bodySchema = z.object({
  provider: z.string().optional(),
});

export async function POST(request: Request) {
  const headersList = await headers();
  const originHeader = headersList.get("origin");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => ({}));
  const result = bodySchema.safeParse(payload);

  if (!result.success) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const fallbackBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  const baseUrl = originHeader ?? fallbackBaseUrl;

  if (!baseUrl) {
    return NextResponse.json(
      { error: "Missing site URL for Terra redirect" },
      { status: 500 }
    );
  }

  try {
    const session = await createTerraWidgetSession({
      referenceId: user.id,
      provider: result.data.provider,
      successRedirectUrl: `${baseUrl}/api/terra/connect/callback`,
      failureRedirectUrl: `${baseUrl}/settings/devices?connect=error`,
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error("Failed to create Terra widget session", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create session",
      },
      { status: 500 }
    );
  }
}
