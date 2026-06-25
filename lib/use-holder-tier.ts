"use client";

import { useEffect, useState } from "react";
import {
  getBtcTier,
  getNextTier,
  tierProgress,
  type BtcTier,
} from "@/lib/tiers";

export interface HolderTierState {
  btc: number | null; // null = ยังโหลดไม่เสร็จ
  tier: BtcTier | null;
  next: BtcTier | null;
  progress: number;
}

// ดึงจำนวน BTC ที่ถือจาก /api/portfolio แล้วคำนวณระดับการสะสม
export function useHolderTier(): HolderTierState {
  const [btc, setBtc] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/portfolio")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active) return;
        if (!d?.holdings) {
          setBtc(0);
          return;
        }
        const h = d.holdings.find(
          (x: { symbol: string }) => x.symbol?.toUpperCase() === "BTC"
        );
        setBtc(Math.max(0, h?.netAmount ?? 0));
      })
      .catch(() => {
        if (active) setBtc(0);
      });
    return () => {
      active = false;
    };
  }, []);

  return {
    btc,
    tier: btc === null ? null : getBtcTier(btc),
    next: btc === null ? null : getNextTier(btc),
    progress: btc === null ? 0 : tierProgress(btc),
  };
}
