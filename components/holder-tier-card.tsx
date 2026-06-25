"use client";

import { Award } from "lucide-react";
import { useLocale } from "@/contexts/locale-context";
import { useHolderTier } from "@/lib/use-holder-tier";

export function HolderTierCard() {
  const { locale } = useLocale();
  const { btc, tier, next, progress } = useHolderTier();

  const isTh = locale === "th";
  const title = isTh ? "ระดับการสะสม" : "Accumulation Level";

  if (btc === null || !tier) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <h2 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
          <Award className="h-4 w-4" />
          {title}
        </h2>
        <div className="h-16 animate-pulse bg-muted rounded-lg" />
      </div>
    );
  }

  const fmtBtc = (n: number) =>
    n.toLocaleString("en-US", { maximumFractionDigits: 8 });

  return (
    <div className="bg-card border border-border rounded-xl p-6 mb-6">
      <h2 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
        <Award className="h-4 w-4" />
        {title}
      </h2>

      <div className="flex items-center gap-4">
        <div className="text-5xl flex-shrink-0" aria-hidden>
          {tier.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xl font-bold ${tier.color}`}>{tier.name}</span>
            <span className="text-xs text-muted-foreground bg-muted border border-border rounded-full px-2 py-0.5">
              {tier.rangeLabel}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isTh ? tier.descTh : tier.descEn}
          </p>
        </div>
      </div>

      {/* ยอดที่ถือ + ความคืบหน้าไประดับถัดไป */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>
            {isTh ? "ถืออยู่" : "Holding"}: {fmtBtc(btc)} BTC
          </span>
          {next ? (
            <span>
              {isTh ? "ไป" : "to"} {next.emoji} {next.name}
            </span>
          ) : (
            <span>{isTh ? "ระดับสูงสุด 🎉" : "Top tier 🎉"}</span>
          )}
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        {next && (
          <p className="text-xs text-muted-foreground mt-1">
            {isTh ? "อีก " : "Need "}
            {fmtBtc(Math.max(0, next.min - btc))} BTC{" "}
            {isTh ? `เพื่อขึ้นเป็น ${next.name}` : `to reach ${next.name}`}
          </p>
        )}
      </div>
    </div>
  );
}
