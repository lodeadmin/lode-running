"use client";

import { useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const authSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type AuthFormValues = z.infer<typeof authSchema>;

type AuthFormProps = {
  mode: "signin" | "signup";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.warn("Supabase browser client missing configuration.");
    }
    return createSupabaseBrowserClient();
  }, []);

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const submitting = pending || form.formState.isSubmitting;

  async function handleSubmit(values: AuthFormValues) {
    setError(null);
    startTransition(() => {
      (async () => {
        try {
          if (mode === "signin") {
            const { error: signInError } =
              await supabase.auth.signInWithPassword(values);
            if (signInError) {
              throw signInError;
            }
            toast.success("Welcome back! Redirecting to your dashboard.");
          } else {
            const { error: signUpError } = await supabase.auth.signUp(values);
            if (signUpError) {
              throw signUpError;
            }
            toast.success("Account created. Let's personalize your dashboard.");
          }
          router.push("/dashboard");
          router.refresh();
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Something went wrong. Try again.";
          setError(message);
          toast.error(message);
        }
      })();
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-5"
        noValidate
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="coach@vibe.fit"
                  autoComplete="email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="••••••••"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {error ? (
          <p className="text-sm font-medium text-destructive">{error}</p>
        ) : null}

        <Button
          type="submit"
          className="h-11 w-full rounded-2xl text-base font-semibold"
          disabled={submitting}
        >
          {submitting ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>
    </Form>
  );
}
