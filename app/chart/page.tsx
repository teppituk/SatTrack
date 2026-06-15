"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/nav";
import { BuySellChart } from "@/components/buy-sell-chart";
import { BarChart2, Filter } from "lucide-react";

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

export default function ChartPage() {
  const { status } = useSession();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCoin, setSelectedCoin] = useState<string>("ALL");
  const [selectedExchange, setSelectedExchange] = useState<string>("ALL");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

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
      const res = await fetch(`/api/transactions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Get unique coins
  const coins = Array.from(
    new Set(transactions.map((t) => t.coin.symbol))
  ).sort();

  // Filter transactions
  const filtered = transactions.filter((t) => {
    if (selectedCoin !== "ALL" && t.coin.symbol !== selectedCoin) return false;
    if (selectedExchange !== "ALL" && t.exchange !== selectedExchange) return false;
    if (fromDate && new Date(t.txDate) < new Date(fromDate)) return false;
    if (toDate && new Date(t.txDate) > new Date(toDate + "T23:59:59")) return false;
    return true;
  });

  const displayCoin = selectedCoin === "ALL"
    ? coins[0] || "BTC"
    : selectedCoin;

  const chartTransactions = filtered.filter(
    (t) => selectedCoin === "ALL"
      ? t.coin.symbol === displayCoin
      : t.coin.symbol === selectedCoin
  );

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 bg-purple-600/20 rounded-xl flex items-center justify-center">
            <BarChart2 className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Buy/Sell Chart</h1>
            <p className="text-gray-400 text-sm">
              Visualize your trades on the price timeline
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-400 font-medium">Filters</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Coin</label>
              <select
                value={selectedCoin}
                onChange={(e) => setSelectedCoin(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Coins</option>
                {coins.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Exchange</label>
              <select
                value={selectedExchange}
                onChange={(e) => setSelectedExchange(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Exchanges</option>
                <option value="bitkub">Bitkub</option>
                <option value="binanceth">Binance TH</option>
                <option value="binance">Binance</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">To Date</label>
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
                {displayCoin} Price Chart
              </h2>
              <p className="text-sm text-gray-500">
                {chartTransactions.length} transaction
                {chartTransactions.length !== 1 ? "s" : ""} shown
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                <span className="text-gray-400">Buy</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <span className="text-gray-400">Sell</span>
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
              Filtered Transactions ({filtered.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="text-left py-2 px-3">Date</th>
                    <th className="text-left py-2 px-3">Coin</th>
                    <th className="text-left py-2 px-3">Type</th>
                    <th className="text-right py-2 px-3">Amount</th>
                    <th className="text-right py-2 px-3">Price</th>
                    <th className="text-right py-2 px-3">Total</th>
                    <th className="text-left py-2 px-3">Exchange</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filtered.slice(0, 20).map((tx) => (
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
                        {tx.price.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right text-white">
                        {tx.totalValue.toLocaleString()}
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
                  Showing 20 of {filtered.length} transactions
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
