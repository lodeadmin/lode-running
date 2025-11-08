import Link from "next/link";
import { ArrowRight, Activity, Flame, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PerformanceChart } from "@/components/marketing/performance-chart";

const performanceData = [
  { day: "Mon", recovery: 68, effort: 54 },
  { day: "Tue", recovery: 72, effort: 61 },
  { day: "Wed", recovery: 76, effort: 66 },
  { day: "Thu", recovery: 74, effort: 70 },
  { day: "Fri", recovery: 79, effort: 72 },
  { day: "Sat", recovery: 84, effort: 78 },
  { day: "Sun", recovery: 88, effort: 81 },
];

const highlights = [
  {
    title: "Adaptive training plans",
    copy: "Layer AI recommendations on top of Supabase-backed data in real time.",
    icon: Sparkles,
  },
  {
    title: "Device-agnostic syncing",
    copy: "Connect wearables, bikes, and rowers with a single API surface.",
    icon: Activity,
  },
  {
    title: "Revenue-ready insights",
    copy: "Uncover premium upsells with cohort-level trends and habit loops.",
    icon: Flame,
  },
];

export default function HomePage() {
  return (
    <div className="space-y-14">
      <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 shadow-sm">
            Launching • Q1 2025
          </p>

          <div className="space-y-5">
            <h1 className="text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Train smarter with <span className="text-primary">Vibe</span>.
            </h1>
            <p className="text-lg text-slate-600">
              Build modern fitness products without wrangling data pipelines.
              Vibe Fitness gives you real-time coaching signals, device syncing,
              and privacy-friendly analytics out of the box.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <Button
              size="lg"
              className="rounded-full px-8 text-base font-semibold shadow-brand"
              asChild
            >
              <Link href="/dashboard">
                Go to Dashboard
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-slate-300 px-8 text-base text-slate-600"
              asChild
            >
              <Link href="/settings/devices">Manage devices</Link>
            </Button>
          </div>

          <dl className="grid gap-6 sm:grid-cols-3">
            {[
              { label: "Coaching hours saved", value: "120+" },
              { label: "Device partners", value: "18" },
              { label: "Habit streak increase", value: "31%" },
            ].map((stat) => (
              <div key={stat.label} className="card-surface p-5">
                <dt className="text-sm text-muted-foreground">{stat.label}</dt>
                <dd className="text-2xl font-semibold text-slate-900">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="card-surface surface-gradient relative overflow-hidden p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Weekly readiness</p>
              <p className="text-3xl font-semibold text-slate-900">82%</p>
            </div>
            <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-primary">
              +12% vs last week
            </span>
          </div>
          <div className="mt-6 h-64">
            <PerformanceChart data={performanceData} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {highlights.map(({ title, copy, icon: Icon }) => (
          <article
            key={title}
            className="card-surface flex h-full flex-col gap-4 p-6"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-secondary p-2 text-primary">
                <Icon className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                {title}
              </h3>
            </div>
            <p className="text-sm text-slate-600">{copy}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
