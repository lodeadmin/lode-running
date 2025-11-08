"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRound } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/settings/devices", label: "Devices" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-white/40 bg-white/70 backdrop-blur-xl">
      <div className="container flex h-20 items-center justify-between">
        <Link className="flex items-center gap-3" href="/">
          <div className="rounded-2xl bg-gradient-to-br from-primary via-purple-500 to-indigo-500 p-2 shadow-brand">
            <span className="text-xl font-semibold text-white">VF</span>
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900">Vibe Fitness</p>
            <p className="text-sm text-muted-foreground">Feel the difference</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "transition-colors hover:text-primary",
                  isActive ? "text-primary" : "text-slate-500"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Button asChild size="sm" variant="ghost" className="hidden md:inline-flex">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-indigo-500 text-white shadow-lg">
            <UserRound className="size-5" />
          </div>
        </div>
      </div>
    </header>
  );
}
