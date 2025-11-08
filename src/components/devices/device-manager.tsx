"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UserDevice = {
  id: string;
  provider: string;
  terra_user_id: string;
  status: string | null;
  last_synced_at: string | null;
  created_at: string;
};

type DeviceManagerProps = {
  initialDevices: UserDevice[];
};

type ConnectResult = {
  provider: string;
  terraUserId: string;
};

const statusStyles: Record<
  "connected" | "pending" | "error" | "unknown",
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
  unknown: {
    label: "Unknown",
    className: "text-slate-600 bg-slate-100 border-slate-200",
  },
};

export function DeviceManager({ initialDevices }: DeviceManagerProps) {
  const [devices, setDevices] = useState(initialDevices);
  const [connectLoading, setConnectLoading] = useState(false);
  const [resyncing, setResyncing] = useState<Record<string, boolean>>({});

  const hasDevices = devices.length > 0;

  async function handleConnect() {
    setConnectLoading(true);
    let optimisticId: string | null = null;
    try {
      const result = await launchTerraConnect();
      if (!result) {
        return;
      }

      optimisticId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `temp-${Date.now()}`;

      const optimisticDevice: UserDevice = {
        id: optimisticId,
        provider: result.provider,
        terra_user_id: result.terraUserId,
        status: "pending",
        last_synced_at: null,
        created_at: new Date().toISOString(),
      };

      setDevices((prev) => [optimisticDevice, ...prev]);

      const response = await fetch("/api/devices/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          terraUserId: result.terraUserId,
          provider: result.provider,
          action: "connect",
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to connect device");
      }

      const { device, sync } = await response.json();

      setDevices((prev) => {
        const next = prev.filter((d) => d.id !== optimisticId);
        return [device, ...next];
      });

      toast.success(
        sync?.count
          ? `Device connected. Imported ${sync.count} workout(s).`
          : "Device connected. Waiting for first sync."
      );
    } catch (error) {
      console.error(error);
      if (optimisticId) {
        setDevices((prev) =>
          prev.filter((device) => device.id !== optimisticId)
        );
      }
      toast.error(
        error instanceof Error ? error.message : "Failed to connect device."
      );
    } finally {
      setConnectLoading(false);
    }
  }

  async function handleResync(device: UserDevice) {
    setResyncing((prev) => ({ ...prev, [device.id]: true }));
    try {
      const response = await fetch("/api/devices/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          terraUserId: device.terra_user_id,
          provider: device.provider,
          action: "resync",
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to trigger sync");
      }

      const { sync } = await response.json();

      setDevices((prev) =>
        prev.map((d) =>
          d.id === device.id
            ? { ...d, last_synced_at: new Date().toISOString(), status: "connected" }
            : d
        )
      );

      toast.success(
        sync?.count
          ? `Re-synced ${sync.count} workout(s) from the last 30 days.`
          : "Sync started. We'll populate workouts as soon as Terra responds."
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to trigger sync."
      );
    } finally {
      setResyncing((prev) => ({ ...prev, [device.id]: false }));
    }
  }

  const tableRows = useMemo(
    () =>
      devices.map((device) => {
        const statusMeta =
          statusStyles[
            (device.status as keyof typeof statusStyles) ?? "unknown"
          ] ?? statusStyles.unknown;

        return (
          <div
            key={device.id}
            className="grid items-center gap-4 border-b border-border/60 px-5 py-4 text-sm last:border-0 md:grid-cols-[1.5fr_1fr_1fr_auto]"
          >
            <div>
              <p className="font-semibold capitalize text-slate-900">
                {device.provider}
              </p>
              <p className="text-xs text-muted-foreground">
                Terra ID: {device.terra_user_id}
              </p>
            </div>

            <span
              className={cn(
                "inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold",
                statusMeta.className
              )}
            >
              {statusMeta.label}
            </span>

            <p className="text-xs text-muted-foreground">
              {device.last_synced_at
                ? `Synced ${formatRelativeTime(device.last_synced_at)}`
                : "Awaiting first sync"}
            </p>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleResync(device)}
              disabled={Boolean(resyncing[device.id])}
            >
              {resyncing[device.id] ? "Syncing…" : "Re-sync last 30 days"}
            </Button>
          </div>
        );
      }),
    [devices, resyncing]
  );

  return (
    <div className="card-surface">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 px-5 py-4">
        <div>
          <p className="text-base font-semibold text-slate-900">
            Connected devices
          </p>
          <p className="text-sm text-muted-foreground">
            Manage Terra-linked hardware per provider.
          </p>
        </div>
        <Button
          onClick={handleConnect}
          disabled={connectLoading}
          className="rounded-full px-6 font-semibold"
        >
          {connectLoading ? "Launching..." : "Connect Device"}
        </Button>
      </div>

      {hasDevices ? (
        <div>{tableRows}</div>
      ) : (
        <div className="flex flex-col items-center gap-4 px-5 py-12 text-center">
          <p className="text-lg font-semibold text-slate-900">
            No devices connected yet
          </p>
          <p className="max-w-md text-sm text-muted-foreground">
            Use Terra Connect to link wearables, bikes, or sensors. We will
            backfill recent workouts automatically once a device is linked.
          </p>
          <Button
            onClick={handleConnect}
            disabled={connectLoading}
            className="rounded-full px-6"
          >
            {connectLoading ? "Launching..." : "Connect Device"}
          </Button>
        </div>
      )}
    </div>
  );
}

async function launchTerraConnect(): Promise<ConnectResult | null> {
  if (typeof window === "undefined") {
    return null;
  }

  window.open(
    "https://app.tryterra.co/connect",
    "terra-connect",
    "noopener,width=420,height=720"
  );

  const provider =
    window.prompt("Enter the provider you just linked (e.g. fitbit, garmin):")?.trim() ??
    "";
  const terraUserId =
    window
      .prompt(
        "Paste the Terra user ID returned from the connect widget (e.g. terra_user_123)."
      )
      ?.trim() ?? "";

  if (!provider || !terraUserId) {
    toast.info("Terra Connect dismissed before completion.");
    return null;
  }

  return {
    provider: provider.toLowerCase(),
    terraUserId,
  };
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
