"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/nav";
import { BuySellChart } from "@/components/buy-sell-chart";
import { BarChart2 } from "lucide-react";
import { useLocale } from "@/contexts/locale-context";

interface Transaction {
  id: string;
  type: "BUY" | "SELL";
  amount: number;
  price: number;
  totalValue: number;
  currency: string;
  exchange: string;
  txDate: string;
  coin: { symbol: string; name: string };
}

interface PricePoint {
  t: number;
  p: number;
}

type Currency = "THB" | "USD";

export default function ChartPage() {
  const { status } = useSession();
  const router = useRouter();
  const { t } = useLocale();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [displayCurrency, setDisplayCurrency] = useState<Currency>("USD");
  const [usdThbRate, setUsdThbRate] = useState<number>(35);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchHistory = useCallback(
    async (cur: Currency, txs: Transaction[]) => {
      const earliest = txs.length
        ? Math.min(...txs.map((x) => new Date(x.txDate).getTime()))
        : Date.now() - 365 * 86400000;
      const days = Math.min(
        3650,
        Math.ceil((Date.now() - earliest) / 86400000) + 14
      );
      try {
        const res = await fetch(
          `/api/price/btc/history?vs=${cur.toLowerCase()}&days=${days}`
        );
        if (res.ok) {
          const d = await res.json();
          setPriceHistory(d.prices ?? []);
        }
      } catch {
        /* ignore */
      }
    },
    []
  );

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "500" });
      const [txRes, pfRes] = await Promise.all([
        fetch(`/api/transactions?${params}`),
        fetch(`/api/portfolio?currency=THB`),
      ]);
      let txs: Transaction[] = [];
      if (txRes.ok) {
        const data = await txRes.json();
        txs = (data.transactions ?? []).filter(
          (x: Transaction) => x.coin.symbol.toUpperCase() === "BTC"
        );
        setTransactions(txs);
      }
      if (pfRes.ok) {
        const pf = await pfRes.json();
        if (pf?.summary?.usdThbRate) setUsdThbRate(pf.summary.usdThbRate);
      }
      await fetchHistory(displayCurrency, txs);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchHistory]);

  useEffect(() => {
    if (status === "authenticated") fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // refetch price history เมื่อสลับสกุลเงิน
  useEffect(() => {
    if (status === "authenticated" && transactions.length >= 0) {
      fetchHistory(displayCurrency, transactions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayCurrency]);

  const convertValue = (value: number, from: string, to: Currency): number => {
    const thb = from === "THB" ? value : value * usdThbRate;
    return to === "THB" ? thb : thb / usdThbRate;
  };
  const chartTx = transactions.map((tx) => ({
    ...tx,
    price: convertValue(tx.price, tx.currency, displayCurrency),
    totalValue: convertValue(tx.totalValue, tx.currency, displayCurrency),
    currency: displayCurrency,
  }));

  const fmt = (v: number) =>
    v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-orange-500/15 rounded-xl flex items-center justify-center">
              <BarChart2 className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t("chart.title")}</h1>
              <p className="text-muted-foreground text-sm">{t("chart.subtitle")}</p>
            </div>
          </div>

          <div className="flex bg-card border border-border rounded-xl p-1">
            {(["USD", "THB"] as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => setDisplayCurrency(c)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  displayCurrency === c
                    ? "bg-orange-500 text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="bg-card border border-border rounded-xl p-6">
          <BuySellChart
            transactions={chartTx}
            priceHistory={priceHistory}
            currency={displayCurrency}
            loading={isLoading}
          />
        </div>

        {/* Transaction List */}
        {transactions.length > 0 && (
          <div className="mt-6 bg-card border border-border rounded-xl p-6">
            <h3 className="text-base font-semibold text-foreground mb-4">
              {t("chart.filteredTransactions")} ({transactions.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2 px-3">{t("chart.date")}</th>
                    <th className="text-left py-2 px-3">{t("chart.type")}</th>
                    <th className="text-right py-2 px-3">{t("chart.amount")}</th>
                    <th className="text-right py-2 px-3">{t("chart.price")}</th>
                    <th className="text-right py-2 px-3">{t("chart.total")}</th>
                    <th className="text-left py-2 px-3">{t("chart.exchange")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {chartTx.slice(0, 20).map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/50">
                      <td className="py-2 px-3 text-muted-foreground text-xs">
                        {new Date(tx.txDate).toLocaleDateString("th-TH")}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            tx.type === "BUY"
                              ? "bg-green-900/50 text-green-400"
                              : "bg-red-900/50 text-red-400"
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-foreground font-mono text-xs">
                        {tx.amount.toFixed(8)}
                      </td>
                      <td className="py-2 px-3 text-right text-foreground">
                        {fmt(tx.price)}{" "}
                        <span className="text-muted-foreground text-xs">{displayCurrency}</span>
                      </td>
                      <td className="py-2 px-3 text-right text-foreground">
                        {fmt(tx.totalValue)}{" "}
                        <span className="text-muted-foreground text-xs">{displayCurrency}</span>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground text-xs">{tx.exchange}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transactions.length > 20 && (
                <p className="text-center text-muted-foreground text-xs mt-3">
                  {t("chart.showingOf")} {transactions.length} {t("chart.transactions")}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
