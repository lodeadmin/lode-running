"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { useSession } from "@/components/providers/session-provider";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/settings/devices", label: "Devices" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { user } = useSession();
  const userInitial =
    user?.email?.[0]?.toUpperCase() ?? user?.user_metadata?.full_name?.[0]?.toUpperCase() ?? "VF";

  return (
    <header className="sticky top-0 z-30 border-b border-white/40 bg-white/70 backdrop-blur-xl">
      <div className="container flex h-20 items-center justify-between">
        <Link className="flex items-center gap-3" href="/">
          <div className="rounded-2xl bg-gradient-to-br from-primary via-purple-500 to-indigo-500 p-2 shadow-brand">
            <span className="text-xl font-semibold text-white">VF</span>
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900">Vibe Fitness</p>
            <p className="text-sm text-muted-foreground">
              {user?.email ? `Signed in as ${user.email}` : "Guest session"}
            </p>
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
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-sm font-semibold text-slate-900 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-indigo-500 text-white">
                    {userInitial}
                  </span>
                  <ChevronDown className="size-4 text-slate-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[220px]">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Account
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {user.email ?? "Signed in"}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings/devices">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <SignOutButton>Sign out</SignOutButton>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost" className="hidden md:inline-flex">
                <Link href="/signin">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="rounded-full px-5 font-semibold shadow-brand">
                <Link href="/signup">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
