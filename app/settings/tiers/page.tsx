"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/nav";
import { Award, ArrowLeft } from "lucide-react";
import { useLocale } from "@/contexts/locale-context";
import { BTC_TIERS } from "@/lib/tiers";
import { useHolderTier } from "@/lib/use-holder-tier";

export default function TiersPage() {
  const { status } = useSession();
  const router = useRouter();
  const { locale } = useLocale();
  const { btc, tier: current } = useHolderTier();
  const isTh = locale === "th";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fmtBtc = (n: number) =>
    n.toLocaleString("en-US", { maximumFractionDigits: 8 });

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/settings"
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={isTh ? "กลับ" : "Back"}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="h-10 w-10 bg-muted rounded-xl flex items-center justify-center">
            <Award className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isTh ? "ระดับการสะสม" : "Accumulation Tiers"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isTh
                ? "ระดับแบ่งตามจำนวน Bitcoin ที่ถือ"
                : "Tiers based on how much Bitcoin you hold"}
            </p>
          </div>
        </div>

        {/* Current holding summary */}
        {btc !== null && current && (
          <div className="bg-card border border-border rounded-xl p-4 mb-6 flex items-center gap-3">
            <span className="text-3xl">{current.emoji}</span>
            <div className="text-sm">
              <p className="text-muted-foreground">
                {isTh ? "ตอนนี้คุณถือ" : "You currently hold"}{" "}
                <span className="text-foreground font-semibold tabular-nums">
                  {fmtBtc(btc)} BTC
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">
                  {isTh ? "ระดับของคุณ: " : "Your tier: "}
                </span>
                <span className={`font-semibold ${current.color}`}>
                  {current.emoji} {current.name}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* All tiers */}
        <div className="space-y-3">
          {BTC_TIERS.map((tier) => {
            const isCurrent = current?.key === tier.key;
            return (
              <div
                key={tier.key}
                className={`flex items-start gap-4 rounded-xl border p-4 transition-colors ${
                  isCurrent
                    ? "border-blue-500 bg-blue-500/5 ring-1 ring-blue-500/40"
                    : "border-border bg-card"
                }`}
              >
                <div className="text-4xl leading-none flex-shrink-0" aria-hidden>
                  {tier.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-bold ${tier.color}`}>{tier.name}</span>
                    <span className="text-xs text-muted-foreground bg-muted border border-border rounded-full px-2 py-0.5">
                      {tier.rangeLabel}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-medium text-blue-400 border border-blue-500/40 bg-blue-500/10 rounded-full px-2 py-0.5">
                        {isTh ? "ระดับของคุณ" : "You're here"}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isTh ? tier.descTh : tier.descEn}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-muted-foreground text-xs mt-6">
          {isTh
            ? "ระดับคำนวณจากจำนวน BTC สุทธิในพอร์ตของคุณ"
            : "Tier is based on the net BTC in your portfolio"}
        </p>
      </div>
    </AppShell>
  );
}
