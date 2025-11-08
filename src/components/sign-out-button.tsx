"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { signOutAction } from "@/lib/actions/auth-actions";
import { cn } from "@/lib/utils";

type SignOutButtonProps = {
  children: React.ReactNode;
  className?: string;
};

export function SignOutButton({ children, className }: SignOutButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className={cn(
        "w-full cursor-pointer rounded-lg px-2 py-1.5 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2",
        className
      )}
      disabled={pending}
      onClick={() => {
        startTransition(() => {
          (async () => {
            const result = await signOutAction();
            if (!result.success) {
              toast.error(result.message ?? "Unable to sign out.");
              return;
            }
            toast.success("Signed out successfully.");
            router.push("/");
            router.refresh();
          })();
        });
      }}
    >
      {pending ? "Signing out..." : children}
    </button>
  );
}
