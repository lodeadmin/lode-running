import type { Metadata } from "next";
import { PlugZap, Shield, WifiHigh } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Devices • Vibe Fitness",
};

const DeviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["Wearable", "Bike", "Rowing", "Sensor"]),
  status: z.enum(["connected", "pending", "error"]),
  lastSync: z.string(),
});

const parsedDevices = DeviceSchema.array().parse([
  {
    id: "vf-01",
    name: "PulseBand Pro",
    type: "Wearable",
    status: "connected",
    lastSync: "2 min ago",
  },
  {
    id: "vf-02",
    name: "Vector Bike Studio",
    type: "Bike",
    status: "pending",
    lastSync: "Awaiting approval",
  },
  {
    id: "vf-03",
    name: "AeroRow Elite",
    type: "Rowing",
    status: "connected",
    lastSync: "15 min ago",
  },
  {
    id: "vf-04",
    name: "VO2 Edge Sensor",
    type: "Sensor",
    status: "error",
    lastSync: "Key revoked",
  },
]);

const statusStyles: Record<
  (typeof parsedDevices)[number]["status"],
  { label: string; className: string }
> = {
  connected: {
    label: "Connected",
    className: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  pending: {
    label: "Pending",
    className: "text-amber-600 bg-amber-50 border-amber-200",
  },
  error: {
    label: "Action needed",
    className: "text-rose-600 bg-rose-50 border-rose-200",
  },
};

export default function DevicesPage() {
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
        </div>
        <Button className="rounded-full px-6" variant="secondary">
          Add integration
        </Button>
      </div>

      <div className="card-surface divide-y divide-border overflow-hidden">
        {parsedDevices.map((device) => (
          <article
            key={device.id}
            className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-slate-500">
                {device.id}
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {device.name}
              </p>
              <p className="text-sm text-muted-foreground">{device.type}</p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span
                className={cn(
                  "rounded-full border px-3 py-1 font-medium",
                  statusStyles[device.status].className
                )}
              >
                {statusStyles[device.status].label}
              </span>
              <span className="text-muted-foreground">{device.lastSync}</span>
              <Button variant="ghost" size="sm">
                View
              </Button>
            </div>
          </article>
        ))}
      </div>

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
