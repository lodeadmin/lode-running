import type { Metadata } from "next";
import Link from "next/link";
import { Gauge, ShieldCheck, Waves } from "lucide-react";

import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export const metadata: Metadata = {
  title: "Dashboard • Vibe Fitness",
};

const readinessCards = [
  {
    title: "Strain balance",
    metric: "Low",
    delta: "+2% vs yesterday",
    description: "Ideal window for progressive overload.",
    icon: Waves,
  },
  {
    title: "Recovery trend",
    metric: "78%",
    delta: "+6 pts week over week",
    description: "Based on HRV + deep sleep signals.",
    icon: Gauge,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
            <ShieldCheck className="size-4 text-primary" />
            Protected Area
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">
            Team Command Console
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            This dashboard is gated behind authentication. Plug in Supabase Auth
            to secure session-aware coaching tools for every athlete.
          </p>
        </div>
        <Button asChild className="rounded-full px-6">
          <Link href="/settings/devices">Review devices</Link>
        </Button>
      </div>

      <section className="grid gap-6 md:grid-cols-2">
        {readinessCards.map(({ title, metric, delta, description, icon: Icon }) => (
          <article key={title} className="card-surface space-y-4 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-secondary p-2 text-primary">
                <Icon className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{title}</p>
                <p className="text-3xl font-semibold text-slate-900">
                  {metric}
                </p>
              </div>
            </div>
            <p className="text-sm font-medium text-emerald-600">{delta}</p>
            <p className="text-sm text-slate-500">{description}</p>
          </article>
        ))}
      </section>

      <section className="card-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Supabase connection
            </p>
            <p className="text-xl font-semibold text-slate-900">
              {isSupabaseConfigured ? "Ready for real data" : "Awaiting keys"}
            </p>
          </div>
          <Button
            asChild
            variant={isSupabaseConfigured ? "default" : "outline"}
            className="rounded-full"
          >
            <Link href="https://supabase.com/dashboard/projects" target="_blank">
              {isSupabaseConfigured ? "Open project" : "Add env keys"}
            </Link>
          </Button>
        </div>
        {!isSupabaseConfigured && (
          <p className="mt-4 text-sm text-slate-500">
            Set{" "}
            <span className="font-semibold">
              NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
            </span>{" "}
            to unlock live metrics, policy-enforced row level security, and
            streaming device data.
          </p>
        )}
      </section>
    </div>
  );
}
