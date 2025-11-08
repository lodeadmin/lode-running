import type { Metadata } from "next";
import { PlugZap, Shield, WifiHigh } from "lucide-react";

import { DeviceManager } from "@/components/devices/device-manager";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Devices • Vibe Fitness",
};

type UserDevice = {
  id: string;
  provider: string;
  terra_user_id: string;
  status: string | null;
  last_synced_at: string | null;
  created_at: string;
};

export default async function DevicesPage() {
  const user = await requireUser();
  let devices: UserDevice[] = [];

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createSupabaseServerClient();
      const { data } = await supabase
        .from("user_devices")
        .select(
          "id, provider, terra_user_id, status, last_synced_at, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      devices = (data as UserDevice[]) ?? [];
    } catch (error) {
      console.warn("Unable to load devices list", error);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.4em] text-slate-500">
            <Shield className="size-4 text-primary" />
            Protected
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">
            Device control center
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Invite vendors, approve scopes, and monitor live sync queues. This
            view will only appear for authenticated team members once auth is
            enabled.
          </p>
          <p className="text-sm text-muted-foreground">
            {user.email}
          </p>
        </div>
      </div>
      <DeviceManager initialDevices={devices} />
      <div className="card-surface grid gap-4 p-6 md:grid-cols-3">
        {[
          {
            title: "Webhooks",
            copy: "Stream workout summaries to your CRM or automation stacks.",
            icon: PlugZap,
          },
          {
            title: "Live monitoring",
            copy: "Catch dropped syncs before members notice disruptions.",
            icon: WifiHigh,
          },
          {
            title: "Access policies",
            copy: "Use Supabase RLS to gate device data by location.",
            icon: Shield,
          },
        ].map(({ title, copy, icon: Icon }) => (
          <div key={title} className="rounded-3xl border border-dashed border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                <Icon className="size-5" />
              </div>
              <h3 className="font-semibold text-slate-900">{title}</h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{copy}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
