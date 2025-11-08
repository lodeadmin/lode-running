import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SessionProvider } from "@/components/providers/session-provider";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vibe Fitness",
  description:
    "Modern fitness intelligence for teams, trainers, and boutique studios.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground antialiased`}
      >
        <SessionProvider initialUser={user}>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="container flex-1 py-12">{children}</main>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
