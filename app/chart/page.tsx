"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/nav";
import { BuySellChart } from "@/components/buy-sell-chart";
import { BarChart2, Filter } from "lucide-react";
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
  slipImageUrl?: string | null;
  coin: { symbol: string; name: string };
}

type Currency = "THB" | "USDT";

interface ExchangeOption {
  code: string;
  name: string;
}

export default function ChartPage() {
  const { status } = useSession();
  const router = useRouter();
  const { t } = useLocale();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCoin, setSelectedCoin] = useState<string>("ALL");
  const [selectedExchange, setSelectedExchange] = useState<string>("ALL");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [displayCurrency, setDisplayCurrency] = useState<Currency>("THB");
  const [usdThbRate, setUsdThbRate] = useState<number>(35);
  const [exchanges, setExchanges] = useState<ExchangeOption[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchTransactions();
    }
  }, [status]);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "500" });
      // ดึงรายการ + อัตราแลกเปลี่ยน USD/THB + รายการ exchange (ตามที่ admin จัดการ) พร้อมกัน
      const [txRes, pfRes, exRes] = await Promise.all([
        fetch(`/api/transactions?${params}`),
        fetch(`/api/portfolio?currency=THB`),
        fetch(`/api/exchanges`),
      ]);
      if (txRes.ok) {
        const data = await txRes.json();
        setTransactions(data.transactions);
      }
      if (pfRes.ok) {
        const pf = await pfRes.json();
        if (pf?.summary?.usdThbRate) setUsdThbRate(pf.summary.usdThbRate);
      }
      if (exRes.ok) {
        const ex = await exRes.json();
        setExchanges(ex.exchanges ?? []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // แปลงค่าจากสกุลที่เก็บไว้ → สกุลที่เลือกแสดง (THB/USDT) ผ่าน USD/THB rate
  const convertValue = (value: number, from: string, to: Currency): number => {
    const thb = from === "THB" ? value : value * usdThbRate; // USD/USDT → THB
    return to === "THB" ? thb : thb / usdThbRate;
  };
  const toDisplay = (tx: Transaction): Transaction => ({
    ...tx,
    price: convertValue(tx.price, tx.currency, displayCurrency),
    totalValue: convertValue(tx.totalValue, tx.currency, displayCurrency),
    currency: displayCurrency,
  });
  const fmt = (v: number) =>
    v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Get unique coins
  const coins = Array.from(
    new Set(transactions.map((t) => t.coin.symbol))
  ).sort();

  // Filter transactions
  const filtered = transactions.filter((tx) => {
    if (selectedCoin !== "ALL" && tx.coin.symbol !== selectedCoin) return false;
    if (selectedExchange !== "ALL" && tx.exchange !== selectedExchange) return false;
    if (fromDate && new Date(tx.txDate) < new Date(fromDate)) return false;
    if (toDate && new Date(tx.txDate) > new Date(toDate + "T23:59:59")) return false;
    return true;
  });

  const displayCoin = selectedCoin === "ALL"
    ? coins[0] || "BTC"
    : selectedCoin;

  const chartTransactions = filtered
    .filter((tx) =>
      selectedCoin === "ALL"
        ? tx.coin.symbol === displayCoin
        : tx.coin.symbol === selectedCoin
    )
    .map(toDisplay);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-purple-600/20 rounded-xl flex items-center justify-center">
              <BarChart2 className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{t("chart.title")}</h1>
              <p className="text-gray-400 text-sm">{t("chart.subtitle")}</p>
            </div>
          </div>

          {/* ปุ่มสลับสกุลเงิน THB / USDT */}
          <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1">
            {(["THB", "USDT"] as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => setDisplayCurrency(c)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  displayCurrency === c
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-400 font-medium">{t("chart.filters")}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t("chart.filterCoin")}</label>
              <select
                value={selectedCoin}
                onChange={(e) => setSelectedCoin(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">{t("chart.allCoins")}</option>
                {coins.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">{t("chart.filterExchange")}</label>
              <select
                value={selectedExchange}
                onChange={(e) => setSelectedExchange(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">{t("chart.allExchanges")}</option>
                {exchanges.map((ex) => (
                  <option key={ex.code} value={ex.code}>
                    {ex.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">{t("chart.dateFrom")}</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">{t("chart.dateTo")}</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {displayCoin} {t("chart.priceChart")}
              </h2>
              <p className="text-sm text-gray-500">
                {chartTransactions.length}{" "}
                {chartTransactions.length !== 1
                  ? t("chart.transactionsShownPlural")
                  : t("chart.transactionsShown")}{" "}
                {t("chart.shown")}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                <span className="text-gray-400">{t("chart.buy")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <span className="text-gray-400">{t("chart.sell")}</span>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="h-96 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : (
            <BuySellChart
              transactions={chartTransactions}
              coinSymbol={displayCoin}
            />
          )}
        </div>

        {/* Transaction List */}
        {filtered.length > 0 && (
          <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-base font-semibold text-white mb-4">
              {t("chart.filteredTransactions")} ({filtered.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="text-left py-2 px-3">{t("chart.date")}</th>
                    <th className="text-left py-2 px-3">{t("chart.coin")}</th>
                    <th className="text-left py-2 px-3">{t("chart.type")}</th>
                    <th className="text-right py-2 px-3">{t("chart.amount")}</th>
                    <th className="text-right py-2 px-3">{t("chart.price")}</th>
                    <th className="text-right py-2 px-3">{t("chart.total")}</th>
                    <th className="text-left py-2 px-3">{t("chart.exchange")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filtered.slice(0, 20).map(toDisplay).map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-800/50">
                      <td className="py-2 px-3 text-gray-400 text-xs">
                        {new Date(tx.txDate).toLocaleDateString("th-TH")}
                      </td>
                      <td className="py-2 px-3 font-medium text-white">
                        {tx.coin.symbol}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          tx.type === "BUY"
                            ? "bg-green-900/50 text-green-400"
                            : "bg-red-900/50 text-red-400"
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-gray-300 font-mono text-xs">
                        {tx.amount.toFixed(6)}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-300">
                        {fmt(tx.price)} <span className="text-gray-600 text-xs">{displayCurrency}</span>
                      </td>
                      <td className="py-2 px-3 text-right text-white">
                        {fmt(tx.totalValue)} <span className="text-gray-600 text-xs">{displayCurrency}</span>
                      </td>
                      <td className="py-2 px-3 text-gray-500 text-xs">
                        {tx.exchange}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length > 20 && (
                <p className="text-center text-gray-600 text-xs mt-3">
                  {t("chart.showingOf")} {filtered.length} {t("chart.transactions")}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
