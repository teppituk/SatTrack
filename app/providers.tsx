"use client";

import { SessionProvider } from "next-auth/react";
import { LocaleProvider } from "@/contexts/locale-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { HeartbeatProvider } from "@/components/heartbeat-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <HeartbeatProvider />
      <ThemeProvider>
        <LocaleProvider>{children}</LocaleProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
