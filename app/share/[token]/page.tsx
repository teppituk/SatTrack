import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TrendingUp, TrendingDown, Coins, Lock } from "lucide-react";

interface ShareConfig {
  showCostBasis: boolean;
  showPnl: boolean;
  showTransactions: boolean;
}

async function getSharedPortfolio(token: string) {
  const shareLink = await prisma.shareLink.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          transactions: {
            include: { coin: true },
            orderBy: { txDate: "desc" },
          },
        },
      },
    },
  });

  if (!shareLink) return null;

  // Check expiry
  if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
    return { expired: true };
  }

  return shareLink;
}

async function fetchPrices(symbols: string[]): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};
  const symbolToId: Record<string, string> = {
    BTC: "bitcoin",
    ETH: "ethereum",
    BNB: "binancecoin",
    SOL: "solana",
    ADA: "cardano",
  };

  try {
    const ids = symbols.map((s) => symbolToId[s.toUpperCase()]).filter(Boolean);
    if (ids.length === 0) return prices;

    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=thb`,
      { next: { revalidate: 60 } }
    );

    if (res.ok) {
      const data = await res.json();
      symbols.forEach((sym) => {
        const id = symbolToId[sym.toUpperCase()];
        if (id && data[id]) prices[sym] = data[id].thb || 0;
      });
    }
  } catch {}

  return prices;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const shareData = await getSharedPortfolio(token);

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

  const config = shareData.config as unknown as ShareConfig;
  const transactions = shareData.user.transactions;

  // Calculate holdings
  const holdingsMap = new Map<string, { symbol: string; name: string; amount: number; totalCost: number }>();

  for (const tx of transactions) {
    const sym = tx.coin.symbol;
    if (!holdingsMap.has(sym)) {
      holdingsMap.set(sym, { symbol: sym, name: tx.coin.name, amount: 0, totalCost: 0 });
    }
    const h = holdingsMap.get(sym)!;
    if (tx.type === "BUY") {
      h.amount += tx.amount;
      h.totalCost += tx.totalValue;
    } else {
      h.amount -= tx.amount;
    }
  }

  const symbols = Array.from(holdingsMap.keys());
  const prices = await fetchPrices(symbols);

  const holdings = Array.from(holdingsMap.values())
    .filter((h) => h.amount > 0)
    .map((h) => {
      const currentPrice = prices[h.symbol] || 0;
      const currentValue = h.amount * currentPrice;
      const avgCost = h.totalCost / h.amount;
      const pnl = currentValue - h.totalCost;
      const pnlPercent = h.totalCost > 0 ? (pnl / h.totalCost) * 100 : 0;
      return { ...h, currentPrice, currentValue, avgCost, pnl, pnlPercent };
    })
    .sort((a, b) => b.currentValue - a.currentValue);

  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalPnl = holdings.reduce((sum, h) => sum + h.pnl, 0);
  const totalInvested = holdings.reduce((sum, h) => sum + h.totalCost, 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <TrendingUp className="h-6 w-6 text-blue-500" />
          <div>
            <h1 className="font-bold">Shared Portfolio</h1>
            <p className="text-xs text-muted-foreground">
              {shareData.user.name || "Anonymous"} &middot; via StackSat
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-muted-foreground text-sm mb-1">Portfolio Value</p>
            <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
          </div>

          {config.showCostBasis && (
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-muted-foreground text-sm mb-1">Total Invested</p>
              <p className="text-2xl font-bold">{formatCurrency(totalInvested)}</p>
            </div>
          )}

          {config.showPnl && (
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-muted-foreground text-sm mb-1">Unrealized P&L</p>
              <p className={`text-2xl font-bold ${totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                {totalPnl >= 0 ? "+" : ""}{formatCurrency(totalPnl)}
              </p>
            </div>
          )}
        </div>

        {/* Holdings */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Coins className="h-4 w-4 text-blue-400" />
            Holdings ({holdings.length} coins)
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
                          <div className="font-medium">{formatCurrency(h.currentValue)}</div>
                          {config.showPnl && (
                            <div className={`text-xs flex items-center gap-1 justify-end ${h.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                              {h.pnl >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {h.pnl >= 0 ? "+" : ""}{h.pnlPercent.toFixed(1)}%
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

        {/* Recent Transactions */}
        {config.showTransactions && transactions.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold text-foreground mb-4">
              Recent Transactions
            </h2>
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
          Powered by{" "}
          <span className="text-blue-500">StackSat</span>
        </p>
      </main>
    </div>
  );
}
