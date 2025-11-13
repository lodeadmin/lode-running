import { NextResponse } from "next/server";

import { linkDeviceAndSync } from "@/lib/device-link";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const PARAM_KEYS = {
  terraUserId: ["terra_user_id", "user_id"],
  provider: ["provider", "resource"],
  referenceId: ["reference_id", "user_reference", "userId"],
} as const;

type BodyMap = Record<string, unknown>;

async function parseBody(request: Request) {
  if (request.method !== "POST") {
    return null;
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      return await request.json();
    } catch {
      return null;
    }
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await request.text();
    return Object.fromEntries(new URLSearchParams(text));
  }

  return null;
}

function extractValue(
  keys: readonly string[],
  searchParams: URLSearchParams,
  body: BodyMap | null
) {
  for (const key of keys) {
    const fromSearch = searchParams.get(key);
    if (fromSearch) return fromSearch;

    if (body && typeof body[key] === "string" && body[key]) {
      return body[key] as string;
    }
  }

  return null;
}

async function handleRequest(request: Request) {
  const url = new URL(request.url);
  const body = await parseBody(request);

  const terraUserId = extractValue(PARAM_KEYS.terraUserId, url.searchParams, body);
  const provider = extractValue(PARAM_KEYS.provider, url.searchParams, body);
  const referenceId = extractValue(PARAM_KEYS.referenceId, url.searchParams, body);

  const originOverride =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? url.origin;
  const redirectBase = `${originOverride}/settings/devices`;

  if (!terraUserId || !provider || !referenceId) {
    console.warn("Terra callback missing params", {
      method: request.method,
      search: Object.fromEntries(url.searchParams.entries()),
      body,
    });
    return NextResponse.redirect(`${redirectBase}?connect=error`);
  }

  const supabase = createSupabaseAdminClient();

  try {
    await linkDeviceAndSync({
      supabase,
      userId: referenceId,
      terraUserId,
      provider,
      action: "connect",
    });
    console.info("Terra callback linked device", {
      referenceId,
      terraUserId,
      provider,
    });
    return NextResponse.redirect(`${redirectBase}?connect=success`);
  } catch (error) {
    console.error("Terra callback failed", error);
    return NextResponse.redirect(`${redirectBase}?connect=error`);
  }
}

export async function GET(request: Request) {
  return handleRequest(request);
}

export async function POST(request: Request) {
  return handleRequest(request);
}
