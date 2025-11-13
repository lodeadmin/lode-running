"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UserDevice = {
  id: string;
  provider: string;
  terra_user_id: string;
  status: string | null;
  last_synced_at: string | null;
  connected_at: string;
};

const statusStyles: Record<
  "linked" | "connected" | "pending" | "error" | "unknown",
  { label: string; className: string }
> = {
  linked: {
    label: "Linked",
    className: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
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

const RESYNC_WINDOW_DAYS = 7;

export function DeviceManager() {
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [connectLoading, setConnectLoading] = useState(false);
  const [resyncing, setResyncing] = useState<Record<string, boolean>>({});
  const connectWindowRef = useRef<Window | null>(null);
  const connectPollRef = useRef<number | null>(null);

  const fetchDevices = useCallback(async () => {
    setLoadingDevices(true);
    try {
      const response = await fetch("/api/devices", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to load devices");
      }
      const { devices: rows } = (await response.json()) as {
        devices: UserDevice[];
      };
      setDevices(rows ?? []);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load devices."
      );
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  useEffect(() => {
    return () => {
      if (connectPollRef.current !== null) {
        window.clearInterval(connectPollRef.current);
        connectPollRef.current = null;
      }
      connectWindowRef.current?.close();
    };
  }, []);

  const hasDevices = devices.length > 0;

  const handleConnect = useCallback(async () => {
    setConnectLoading(true);
    try {
      const response = await fetch("/api/devices/connect/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Unable to launch Terra Connect");
      }

      const session = (await response.json()) as {
        widgetUrl: string;
      };

      if (typeof window === "undefined") {
        return;
      }

      const popup = window.open(
        session.widgetUrl,
        "terra-connect",
        "noopener,width=480,height=720"
      );

      if (!popup) {
        throw new Error("Popup blocked. Please enable popups for this site.");
      }

      connectWindowRef.current = popup;

      if (connectPollRef.current !== null) {
        window.clearInterval(connectPollRef.current);
      }

      connectPollRef.current = window.setInterval(() => {
        if (popup.closed) {
          if (connectPollRef.current !== null) {
            window.clearInterval(connectPollRef.current);
          }
          connectPollRef.current = null;
          fetchDevices();
          toast.success(
            "Finished Terra Connect window. We'll sync workouts as soon as Terra responds."
          );
        }
      }, 1500);

      toast.info(
        "Finish Terra Connect in the popup. We'll refresh your devices when it closes."
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to start Terra Connect."
      );
    } finally {
      setConnectLoading(false);
    }
  }, [fetchDevices]);

  const handleResync = useCallback(async (device: UserDevice) => {
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
            ? {
                ...d,
                last_synced_at: new Date().toISOString(),
                status: "linked",
              }
            : d
        )
      );

      toast.success(
        sync?.count
          ? `Re-synced ${sync.count} workout(s) from the last ${RESYNC_WINDOW_DAYS} days.`
          : "Sync started. We'll populate workouts as soon as Terra responds."
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to trigger sync."
      );
    } finally {
      setResyncing((prev) => ({ ...prev, [device.id]: false }));
    }
  }, []);

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
                "inline-flex w-fit items-center rounded-[5px] border px-3 py-1 text-xs font-semibold",
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
              {resyncing[device.id]
                ? "Syncing…"
                : `Re-sync last ${RESYNC_WINDOW_DAYS} days`}
            </Button>
          </div>
        );
      }),
    [devices, resyncing, handleResync]
  );

  return (
    <div className="card-surface rounded-[5px]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 px-5 py-4">
        <div>
          <p className="text-base font-semibold text-slate-900">
            Connected devices
          </p>
          <p className="text-sm text-muted-foreground">
            Manage Terra-linked hardware per provider.
          </p>
        </div>
        {/* <Button
          onClick={handleConnect}
          disabled={connectLoading}
          className="rounded-[5px] px-6 font-semibold"
        >
          {connectLoading ? "Launching..." : "Connect Device"} */}
        {/* </Button> */}
      </div>

      {loadingDevices ? (
        <div className="px-5 py-12 text-center text-sm text-muted-foreground">
          Loading devices...
        </div>
      ) : hasDevices ? (
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
            className="rounded-[5px] px-6"
          >
            {connectLoading ? "Launching..." : "Connect Device"}
          </Button>
        </div>
      )}
    </div>
  );
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
