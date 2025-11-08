import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | undefined;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured =
  Boolean(supabaseUrl) && Boolean(supabaseAnonKey);

export function getSupabaseClient() {
  if (!isSupabaseConfigured) {
    return undefined;
  }

  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl!, supabaseAnonKey!);
  }

  return cachedClient;
}
