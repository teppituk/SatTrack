"use client";

import { Suspense, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/nav";
import {
  Zap,
  CheckCircle,
  AlertCircle,
  Loader2,
  Crown,
  Calendar,
  Bitcoin,
} from "lucide-react";

interface SubscriptionData {
  currentPlan: string;
  planExpiresAt: string | null;
  isActive: boolean;
  subscriptions: Array<{
    id: string;
    invoiceId: string;
    amountSats: number;
    status: string;
    paidAt: string | null;
  }>;
  plans: {
    monthly: { amountSats: number; label: string; durationDays: number };
    annual: { amountSats: number; label: string; durationDays: number };
  };
}

function SubscriptionContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get("status");

  const [data, setData] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchSubscription();
    }
  }, [status]);

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
        setError(d.error || "Failed to create invoice");
        return;
      }

      // Redirect to BTCPay checkout
      if (d.checkoutLink) {
        window.location.href = d.checkoutLink;
      }
    } catch {
      setError("An unexpected error occurred");
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

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
            <Zap className="h-5 w-5 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Subscription</h1>
            <p className="text-muted-foreground text-sm">Manage your plan</p>
          </div>
        </div>

        {/* Payment Success Banner */}
        {paymentStatus === "success" && (
          <div className="flex items-center gap-3 bg-green-950 border border-green-800 rounded-xl p-4 mb-6">
            <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-300">Payment received!</p>
              <p className="text-green-400/80 text-sm">
                Your subscription will be activated within a few minutes.
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
              {isPaid ? "Paid Plan Active" : "Free Plan"}
            </h2>
          </div>
          {isPaid ? (
            <div className="flex items-center gap-2 text-yellow-300 text-sm">
              <Calendar className="h-4 w-4" />
              <span>
                Expires{" "}
                {data?.planExpiresAt
                  ? new Date(data.planExpiresAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "never"}
              </span>
            </div>
          ) : (
            <div className="space-y-1 text-muted-foreground text-sm">
              <p>You are on the free plan with limited features.</p>
              <p className="text-muted-foreground">
                Free: up to 50 transactions/month · Paid: unlimited + all features
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

        {/* Plans */}
        {!isPaid && (
          <div className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-foreground">Choose a Plan</h2>

            {/* Monthly */}
            <div className="bg-card border border-border hover:border-blue-600 rounded-xl p-6 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">Monthly Plan</h3>
                  <p className="text-muted-foreground text-sm">Billed monthly</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-foreground">
                    {data?.plans.monthly.amountSats?.toLocaleString()} sats
                  </p>
                  <p className="text-muted-foreground text-xs">≈ Lightning payment</p>
                </div>
              </div>
              <ul className="space-y-2 mb-4 text-sm text-foreground">
                {[
                  "Unlimited transactions",
                  "Full AI OCR access",
                  "Portfolio sharing",
                  "Advanced charts",
                  "Priority support",
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
                    Creating invoice...
                  </>
                ) : (
                  <>
                    <Bitcoin className="h-4 w-4" />
                    Pay with Lightning
                  </>
                )}
              </button>
            </div>

            {/* Annual */}
            <div className="bg-card border border-yellow-700/50 rounded-xl p-6 relative overflow-hidden">
              <div className="absolute top-3 right-3 bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                BEST VALUE
              </div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">Annual Plan</h3>
                  <p className="text-muted-foreground text-sm">Save vs monthly</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-foreground">
                    {data?.plans.annual.amountSats?.toLocaleString()} sats
                  </p>
                  <p className="text-muted-foreground text-xs">one-time payment</p>
                </div>
              </div>
              <ul className="space-y-2 mb-4 text-sm text-foreground">
                {[
                  "Everything in Monthly",
                  "12 months of access",
                  "Early access to new features",
                  "Dedicated support",
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
                    Creating invoice...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Pay with Lightning
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
              <p className="font-medium text-foreground">Bitcoin Lightning Network</p>
              <p className="text-muted-foreground">
                Instant payments via BTCPay Server. Pay with any Lightning wallet
                (Wallet of Satoshi, Phoenix, Muun, etc.)
              </p>
            </div>
          </div>
        </div>

        {/* Payment History */}
        {data?.subscriptions && data.subscriptions.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold text-foreground mb-4">Payment History</h2>
            <div className="space-y-3">
              {data.subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <p className="text-sm text-foreground font-mono">
                      {sub.invoiceId.slice(0, 16)}...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sub.paidAt
                        ? new Date(sub.paidAt).toLocaleDateString()
                        : "Pending"}
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
                      {sub.status}
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
