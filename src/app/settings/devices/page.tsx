import type { Metadata } from "next";
import { DeviceManager } from "@/components/devices/device-manager";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Devices • Vibe Fitness",
};

export const dynamic = "force-dynamic";

export default async function DevicesPage() {
  await requireUser();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">
            Device control center
          </h1>
        </div>
      </div>
      <DeviceManager />
    </div>
  );
}
