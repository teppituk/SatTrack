"use client";

import { SessionProvider } from "next-auth/react";
import { LocaleProvider } from "@/contexts/locale-context";
import { HeartbeatProvider } from "@/components/heartbeat-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <HeartbeatProvider />
      <LocaleProvider>{children}</LocaleProvider>
    </SessionProvider>
  );
}
