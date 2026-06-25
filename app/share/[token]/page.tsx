import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { TrendingUp, TrendingDown, Coins, Lock, Clock } from "lucide-react";
import { loadShare, parseShareConfig, computeStats } from "@/lib/share";
import { ShareActions } from "@/components/share-actions";

function baseUrl() {
  return (
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSats(sats: number): string {
  return new Intl.NumberFormat("en-US").format(sats);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const data = await loadShare(token);
  if (!data || "expired" in data) {
    return { title: "Shared Portfolio · StackSat" };
  }
  const stats = await computeStats(data.user.transactions);
  const name = data.user.name || "A Bitcoiner";
  const ret = `${stats.totalPnlPercent >= 0 ? "+" : ""}${stats.totalPnlPercent.toFixed(1)}%`;
  const title = `${name}'s Bitcoin stack · ${ret}`;
  const description = `Tracking my Bitcoin stack with StackSat — ${ret} return. View the live portfolio.`;
  const ogImage = `${baseUrl()}/share/${token}/og`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const shareData = await loadShare(token);

  if (!shareData) notFound();

  if ("expired" in shareData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Link Expired</h1>
          <p className="text-muted-foreground">This portfolio share link has expired.</p>
        </div>
      </div>
    );
  }

  const config = parseShareConfig(shareData.config);
  const transactions = shareData.user.transactions;
  const stats = await computeStats(transactions);
  const { holdings, totalValue, totalInvested, totalPnl, totalPnlPercent } = stats;
  const privacy = config.privacyMode;
  const ownerName = shareData.user.name || "Anonymous";
  const shareUrl = `${baseUrl()}/share/${token}`;
  const pnlColor = totalPnl >= 0 ? "text-green-400" : "text-red-400";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <TrendingUp className="h-6 w-6 text-blue-500" />
          <div>
            <h1 className="font-bold">{ownerName}&apos;s Bitcoin Stack</h1>
            <p className="text-xs text-muted-foreground">via StackSat</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Hero: return % is the headline */}
        <div className="bg-card border border-border rounded-2xl p-6 text-center">
          {config.showPnl && (
            <>
              <p className="text-muted-foreground text-sm mb-1">Total Return</p>
              <p className={`text-5xl font-bold ${pnlColor}`}>
                {totalPnlPercent >= 0 ? "+" : ""}
                {totalPnlPercent.toFixed(1)}%
              </p>
            </>
          )}
          {/* Badges */}
          {stats.badges.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {stats.badges.map((b) => (
                <span
                  key={b.label}
                  className="inline-flex items-center gap-1 bg-muted border border-border rounded-full px-3 py-1 text-xs text-foreground"
                >
                  <span>{b.emoji}</span>
                  {b.label}
                </span>
              ))}
            </div>
          )}
          {/* Share actions */}
          <div className="mt-5 flex justify-center">
            <ShareActions
              url={shareUrl}
              text={`${ownerName}'s Bitcoin stack — ${totalPnlPercent >= 0 ? "+" : ""}${totalPnlPercent.toFixed(1)}% on StackSat`}
            />
          </div>
        </div>

        {/* Summary tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {!privacy && (
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-muted-foreground text-sm mb-1">Portfolio Value</p>
              <p className="text-xl font-bold">{formatCurrency(totalValue)}</p>
            </div>
          )}
          {!privacy && config.showCostBasis && (
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-muted-foreground text-sm mb-1">Total Invested</p>
              <p className="text-xl font-bold">{formatCurrency(totalInvested)}</p>
            </div>
          )}
          {!privacy && config.showPnl && (
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-muted-foreground text-sm mb-1">Unrealized P&L</p>
              <p className={`text-xl font-bold ${pnlColor}`}>
                {totalPnl >= 0 ? "+" : ""}
                {formatCurrency(totalPnl)}
              </p>
            </div>
          )}
          {!privacy && stats.satsStacked > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-muted-foreground text-sm mb-1">Sats Stacked</p>
              <p className="text-xl font-bold">{formatSats(stats.satsStacked)}</p>
            </div>
          )}
          {/* Time stacking — safe to show even in privacy mode */}
          {stats.monthsStacking >= 1 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-muted-foreground text-sm mb-1 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Stacking For
              </p>
              <p className="text-xl font-bold">
                {Math.floor(stats.monthsStacking)} mo
              </p>
            </div>
          )}
        </div>

        {privacy && (
          <p className="text-center text-xs text-muted-foreground">
            🔒 Privacy mode — exact amounts are hidden, showing performance only.
          </p>
        )}

        {/* Holdings */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Coins className="h-4 w-4 text-blue-400" />
            Holdings ({holdings.length})
          </h2>
          {holdings.length === 0 ? (
            <p className="text-muted-foreground text-sm">No current holdings</p>
          ) : (
            <div className="space-y-3">
              {holdings.map((h) => {
                const alloc = totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0;
                return (
                  <div key={h.symbol} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <span className="font-medium text-foreground">{h.symbol}</span>
                          <span className="text-muted-foreground text-xs ml-2">{h.name}</span>
                        </div>
                        <div className="text-right">
                          {!privacy && (
                            <div className="font-medium">{formatCurrency(h.currentValue)}</div>
                          )}
                          {config.showPnl && (
                            <div
                              className={`text-xs flex items-center gap-1 justify-end ${h.pnl >= 0 ? "text-green-400" : "text-red-400"}`}
                            >
                              {h.pnl >= 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {h.pnl >= 0 ? "+" : ""}
                              {h.pnlPercent.toFixed(1)}%
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${alloc}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">
                          {alloc.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Transactions — hidden in privacy mode */}
        {config.showTransactions && !privacy && transactions.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold text-foreground mb-4">Recent Transactions</h2>
            <div className="space-y-2">
              {transactions.slice(0, 20).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        tx.type === "BUY"
                          ? "bg-green-900/50 text-green-400"
                          : "bg-red-900/50 text-red-400"
                      }`}
                    >
                      {tx.type}
                    </span>
                    <span className="font-medium text-foreground">{tx.coin.symbol}</span>
                    <span className="text-muted-foreground text-sm">{tx.amount.toFixed(6)}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-foreground text-sm">{formatCurrency(tx.totalValue)}</div>
                    <div className="text-muted-foreground text-xs">
                      {new Date(tx.txDate).toLocaleDateString("th-TH")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-muted-foreground text-xs">
          Powered by <span className="text-blue-500">StackSat</span>
        </p>
      </main>
    </div>
  );
}
