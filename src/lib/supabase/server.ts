import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;

if (!supabaseUrl) {
  console.warn("Supabase URL not configured. Set NEXT_PUBLIC_SUPABASE_URL.");
}

export async function createSupabaseServerClient() {
  if (!supabaseUrl || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing Supabase env vars. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set."
    );
  }

  const cookieStore = await cookies();
  if (process.env.NODE_ENV !== "production") {
    const cookieNames = cookieStore.getAll().map((cookie) => cookie.name);
    console.info("Supabase SSR cookies", cookieNames);
  }

  const handleCookieWrite = (fn: () => void) => {
    try {
      fn();
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Supabase cookie write skipped", error);
      }
    }
  };

  return createServerClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        handleCookieWrite(() =>
          cookieStore.set({
            name,
            value,
            ...options,
          })
        );
      },
      remove(name: string, options: CookieOptions) {
        handleCookieWrite(() =>
          cookieStore.set({
            name,
            value: "",
            ...options,
          })
        );
      },
    },
  });
}

export function createSupabaseAdminClient() {
  if (!supabaseUrl || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing Supabase admin env vars. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."
    );
  }

  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
}
