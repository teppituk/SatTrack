"use client";

import { Suspense, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/nav";
import { useLocale } from "@/contexts/locale-context";
import { QRCodeSVG } from "qrcode.react";
import {
  Zap,
  CheckCircle,
  AlertCircle,
  Loader2,
  Crown,
  Calendar,
  Bitcoin,
  Copy,
  Check,
} from "lucide-react";

interface SubItem {
  id: string;
  refCode: string | null;
  planType: string | null;
  amountSats: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

interface SubscriptionData {
  currentPlan: string;
  planExpiresAt: string | null;
  isActive: boolean;
  subscriptions: SubItem[];
  plans: {
    monthly: { amountSats: number; label: string; durationDays: number };
    annual: { amountSats: number; label: string; durationDays: number };
  };
  lightningAddress: string;
  pending: SubItem | null;
}

interface PayInfo {
  subscriptionId: string;
  refCode: string;
  lightningAddress: string;
  amountSats: number;
  planType: string;
}

function SubscriptionContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get("status");
  const { t } = useLocale();

  const [data, setData] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [payInfo, setPayInfo] = useState<PayInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [invoice, setInvoice] = useState<string | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchSubscription();
    }
  }, [status]);

  // ดึง Lightning invoice (bolt11) ฝังจำนวน+memo สำหรับ QR เมื่อมีคำขอ pending
  const pendingSubId = payInfo?.subscriptionId ?? data?.pending?.id ?? null;
  useEffect(() => {
    if (!pendingSubId) {
      setInvoice(null);
      return;
    }
    let active = true;
    setInvoice(null);
    setInvoiceLoading(true);
    fetch("/api/subscription/invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionId: pendingSubId }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active) setInvoice(d?.invoice ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setInvoiceLoading(false);
      });
    return () => {
      active = false;
    };
  }, [pendingSubId]);

  const fetchSubscription = async () => {
    try {
      const res = await fetch("/api/subscription");
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async (planType: string) => {
    setIsPaying(planType);
    setError("");

    try {
      const res = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType }),
      });

      const d = await res.json();

      if (!res.ok) {
        setError(d.error || t("subscription.notConfigured"));
        return;
      }

      // แสดง QR + memo ให้ผู้ใช้โอนผ่าน Wallet of Satoshi
      setPayInfo({
        subscriptionId: d.subscriptionId,
        refCode: d.refCode,
        lightningAddress: d.lightningAddress,
        amountSats: d.amountSats,
        planType: d.planType,
      });
      fetchSubscription();
    } catch {
      setError(t("subscription.errUnexpected"));
    } finally {
      setIsPaying(null);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
        </div>
      </AppShell>
    );
  }

  const isPaid = data?.isActive;

  // panel ชำระเงิน: จากที่เพิ่งกด หรือจาก pending request เดิม
  const activePay: PayInfo | null =
    payInfo ??
    (data?.pending && data.lightningAddress
      ? {
          subscriptionId: data.pending.id,
          refCode: data.pending.refCode || "",
          lightningAddress: data.lightningAddress,
          amountSats: data.pending.amountSats,
          planType: data.pending.planType || "",
        }
      : null);

  const copyMemo = () => {
    if (!activePay) return;
    navigator.clipboard.writeText(activePay.refCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
            <Zap className="h-5 w-5 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("subscription.title")}</h1>
            <p className="text-muted-foreground text-sm">{t("subscription.subtitle")}</p>
          </div>
        </div>

        {/* Payment Success Banner */}
        {paymentStatus === "success" && (
          <div className="flex items-center gap-3 bg-green-950 border border-green-800 rounded-xl p-4 mb-6">
            <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-300">{t("subscription.paymentReceived")}</p>
              <p className="text-green-400/80 text-sm">
                {t("subscription.paymentReceivedDesc")}
              </p>
            </div>
          </div>
        )}

        {/* Current Plan Status */}
        <div className={`border rounded-xl p-6 mb-6 ${
          isPaid
            ? "bg-yellow-950/20 border-yellow-700/50"
            : "bg-card border-border"
        }`}>
          <div className="flex items-center gap-3 mb-2">
            {isPaid ? (
              <Crown className="h-6 w-6 text-yellow-400" />
            ) : (
              <Zap className="h-6 w-6 text-muted-foreground" />
            )}
            <h2 className="text-lg font-semibold text-foreground">
              {isPaid ? t("subscription.paidPlanActive") : t("subscription.freePlan")}
            </h2>
          </div>
          {isPaid ? (
            <div className="flex items-center gap-2 text-yellow-300 text-sm">
              <Calendar className="h-4 w-4" />
              <span>
                {t("subscription.expires")}{" "}
                {data?.planExpiresAt
                  ? new Date(data.planExpiresAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : t("subscription.never")}
              </span>
            </div>
          ) : (
            <div className="space-y-1 text-muted-foreground text-sm">
              <p>{t("subscription.freeDesc1")}</p>
              <p className="text-muted-foreground">
                {t("subscription.freeDesc2")}
              </p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-950 border border-red-800 text-red-400 px-4 py-3 rounded-lg mb-6">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Payment panel (Wallet of Satoshi) */}
        {!isPaid && activePay && (
          <div className="bg-card border border-blue-600/50 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-1">{t("subscription.payTitle")}</h2>
            <p className="text-sm text-muted-foreground mb-4">{t("subscription.scanQr")}</p>
            <div className="flex flex-col items-center">
              <div className="bg-white rounded-xl p-4 flex items-center justify-center" style={{ width: 232, height: 232 }}>
                {invoiceLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                ) : (
                  <QRCodeSVG
                    value={invoice ? `lightning:${invoice}` : activePay.lightningAddress}
                    size={200}
                    level="M"
                    marginSize={2}
                  />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                {invoice ? t("subscription.invoiceReady") : t("subscription.invoiceFallback")}
              </p>
              <div className="w-full mt-4 space-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">{t("subscription.sendTo")}</p>
                  <p className="text-foreground font-mono break-all">{activePay.lightningAddress}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("subscription.amountLabel")}</p>
                  <p className="text-foreground font-semibold">
                    {activePay.amountSats.toLocaleString()} sats
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("subscription.memoLabel")}</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-foreground font-mono">
                      {activePay.refCode}
                    </code>
                    <button
                      onClick={copyMemo}
                      className="p-2 bg-muted hover:bg-accent border border-border rounded-lg text-muted-foreground hover:text-foreground"
                      title={t("subscription.copy")}
                    >
                      {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{t("subscription.memoHelp")}</p>
                </div>
              </div>
              <div className="w-full mt-4 flex items-center gap-2 bg-yellow-950/30 border border-yellow-800/50 text-yellow-400 rounded-lg px-3 py-2 text-xs">
                <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                {t("subscription.pendingReview")}
              </div>
            </div>
          </div>
        )}

        {/* Plans */}
        {!isPaid && !activePay && (
          <div className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-foreground">{t("subscription.choosePlan")}</h2>

            {/* Monthly */}
            <div className="bg-card border border-border hover:border-blue-600 rounded-xl p-6 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">{t("subscription.monthlyPlan")}</h3>
                  <p className="text-muted-foreground text-sm">{t("subscription.billedMonthly")}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-foreground">
                    {data?.plans.monthly.amountSats?.toLocaleString()} sats
                  </p>
                  <p className="text-muted-foreground text-xs">{t("subscription.lightningApprox")}</p>
                </div>
              </div>
              <ul className="space-y-2 mb-4 text-sm text-foreground">
                {[
                  t("subscription.featUnlimited"),
                  t("subscription.featAiReader"),
                  t("subscription.featSharing"),
                  t("subscription.featChart"),
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSubscribe("monthly")}
                disabled={isPaying !== null}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-foreground py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {isPaying === "monthly" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("subscription.creatingInvoice")}
                  </>
                ) : (
                  <>
                    <Bitcoin className="h-4 w-4" />
                    {t("subscription.payWithLightning")}
                  </>
                )}
              </button>
            </div>

            {/* Annual */}
            <div className="bg-card border border-yellow-700/50 rounded-xl p-6 relative overflow-hidden">
              <div className="absolute top-3 right-3 bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                {t("subscription.bestValue")}
              </div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">{t("subscription.annualPlan")}</h3>
                  <p className="text-muted-foreground text-sm">{t("subscription.saveVsMonthly")}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-foreground">
                    {data?.plans.annual.amountSats?.toLocaleString()} sats
                  </p>
                  <p className="text-muted-foreground text-xs">{t("subscription.oneTimePayment")}</p>
                </div>
              </div>
              <ul className="space-y-2 mb-4 text-sm text-foreground">
                {[
                  t("subscription.featEverythingMonthly"),
                  t("subscription.feat12months"),
                  t("subscription.featSave"),
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSubscribe("annual")}
                disabled={isPaying !== null}
                className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-yellow-700 disabled:cursor-not-allowed text-black py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
              >
                {isPaying === "annual" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("subscription.creatingInvoice")}
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    {t("subscription.payWithLightning")}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Payment Method Info */}
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <Bitcoin className="h-6 w-6 text-orange-400 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-foreground">{t("subscription.methodTitle")}</p>
              <p className="text-muted-foreground">
                {t("subscription.methodDesc")}
              </p>
            </div>
          </div>
        </div>

        {/* Payment History */}
        {data?.subscriptions && data.subscriptions.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold text-foreground mb-4">{t("subscription.paymentHistory")}</h2>
            <div className="space-y-3">
              {data.subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <p className="text-sm text-foreground font-mono">
                      {sub.refCode || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sub.paidAt
                        ? new Date(sub.paidAt).toLocaleDateString()
                        : t("subscription.pending")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-foreground">
                      {sub.amountSats.toLocaleString()} sats
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        sub.status === "paid"
                          ? "bg-green-900/50 text-green-400"
                          : sub.status === "expired"
                          ? "bg-accent text-muted-foreground"
                          : "bg-yellow-900/50 text-yellow-400"
                      }`}
                    >
                      {sub.status === "paid"
                        ? t("subscription.statusPaid")
                        : sub.status === "expired"
                        ? t("subscription.statusExpired")
                        : t("subscription.statusPending")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={null}>
      <SubscriptionContent />
    </Suspense>
  );
}
