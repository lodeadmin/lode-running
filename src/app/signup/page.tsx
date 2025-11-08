import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Create account • Vibe Fitness",
  description: "Spin up your command center with personalized readiness data.",
};

export default async function SignUpPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl items-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Join Vibe Fitness</CardTitle>
          <CardDescription>
            Create an account to unlock device syncing, readiness dashboards, and team controls.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm mode="signup" />
          <p className="mt-6 text-sm text-muted-foreground">
            Already onboarded?{" "}
            <Link className="font-semibold text-primary" href="/signin">
              Sign in instead
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
