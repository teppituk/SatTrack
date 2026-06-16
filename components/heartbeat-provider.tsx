"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

export function HeartbeatProvider() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;

    const ping = () => fetch("/api/heartbeat", { method: "POST" });

    ping();
    const interval = setInterval(ping, 30_000);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [status]);

  return null;
}
