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
  title: "Sign in • Vibe Fitness",
  description: "Access your coaching tools and live readiness insights.",
};

export default async function SignInPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl items-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>
            Use your Vibe Fitness credentials to pick up right where you left off.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm mode="signin" />
          <p className="mt-6 text-sm text-muted-foreground">
            No account yet?{" "}
            <Link className="font-semibold text-primary" href="/signup">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
