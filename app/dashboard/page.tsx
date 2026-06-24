"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Coins,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Bitcoin,
} from "lucide-react";
import { AppShell } from "@/components/nav";
import { PortfolioChart } from "@/components/portfolio-chart";
import { TransactionTable } from "@/components/transaction-table";
import Link from "next/link";
import { useLocale } from "@/contexts/locale-context";

interface Holding {
  symbol: string;
  name: string;
  netAmount: number;
  avgBuyPrice: number;
  currentPrice: number;
  currentValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  allocation: number;
}

interface PortfolioSummary {
  totalPortfolioValue: number;
  totalInvested: number;
  totalUnrealizedPnl: number;
  totalRealizedPnl: number;
  totalPnl: number;
  btcPrice: number;
  usdThbRate: number;
  currency: string;
  lastUpdated: string;
}

type Currency = "THB" | "USDT";

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

function formatCurrency(value: number, currency: Currency = "THB"): string {
  if (currency === "THB") {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      maximumFractionDigits: 2,
    }).format(value);
  }
  // USDT — ไม่ใช่รหัสสกุลเงิน ISO มาตรฐาน จึง format เองแล้วต่อท้ายด้วย USDT
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} USDT`;
}

function StatCard({
  title,
  value,
  change,
  changePercent,
  icon,
  positive,
}: {
  title: string;
  value: string;
  change?: string;
  changePercent?: string;
  icon: React.ReactNode;
  positive?: boolean;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-gray-400 text-sm">{title}</p>
        <div className="text-gray-600">{icon}</div>
      </div>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      {change && (
        <div className={`flex items-center gap-1 text-sm ${positive ? "text-green-400" : "text-red-400"}`}>
          {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          <span>{change}</span>
          {changePercent && <span className="text-gray-500">({changePercent})</span>}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useLocale();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currency, setCurrency] = useState<Currency>("THB");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const fetchData = async () => {
    try {
      const [portfolioRes, txRes] = await Promise.all([
        fetch(`/api/portfolio?currency=${currency}`),
        fetch("/api/transactions?limit=10"),
      ]);

      if (portfolioRes.ok) {
        const data = await portfolioRes.json();
        setHoldings(data.holdings);
        setSummary(data.summary);
      }

      if (txRes.ok) {
        const data = await txRes.json();
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error("Failed to fetch portfolio:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
    }
    // refetch เมื่อสลับสกุลเงิน
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, currency]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const handleDeleteTransaction = async (id: string) => {
    const res = await fetch(`/api/transactions?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      fetchData(); // refresh portfolio
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

  const isPnlPositive = (summary?.totalPnl || 0) >= 0;

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">{t("dashboard.title")}</h1>
            <p className="text-gray-400 text-sm mt-1">
              {t("dashboard.welcomeBack")}, {session?.user?.name || session?.user?.email}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* ราคา Bitcoin ปัจจุบัน */}
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2">
              <Bitcoin className="h-5 w-5 text-orange-400" />
              <div className="leading-tight">
                <p className="text-[11px] text-gray-500">{t("dashboard.btcPrice")}</p>
                <p className="text-sm font-semibold text-white">
                  {summary ? formatCurrency(summary.btcPrice, currency) : "—"}
                </p>
              </div>
            </div>

            {/* ปุ่มสลับสกุลเงิน THB / USDT */}
            <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1">
              {(["THB", "USDT"] as Currency[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    currency === c
                      ? "bg-blue-600 text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-4 py-2 rounded-xl transition-all text-sm"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {t("dashboard.refreshPrices")}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title={t("dashboard.totalValue")}
            value={formatCurrency(summary?.totalPortfolioValue || 0, currency)}
            icon={<DollarSign className="h-5 w-5" />}
          />
          <StatCard
            title={t("dashboard.totalInvested")}
            value={formatCurrency(summary?.totalInvested || 0, currency)}
            icon={<Coins className="h-5 w-5" />}
          />
          <StatCard
            title={t("dashboard.unrealizedPnl")}
            value={formatCurrency(summary?.totalUnrealizedPnl || 0, currency)}
            change={formatCurrency(Math.abs(summary?.totalUnrealizedPnl || 0), currency)}
            changePercent={
              summary?.totalInvested
                ? `${(((summary?.totalUnrealizedPnl || 0) / summary.totalInvested) * 100).toFixed(2)}%`
                : undefined
            }
            positive={(summary?.totalUnrealizedPnl || 0) >= 0}
            icon={
              isPnlPositive ? (
                <TrendingUp className="h-5 w-5 text-green-400" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-400" />
              )
            }
          />
          <StatCard
            title={t("dashboard.realizedPnl")}
            value={formatCurrency(summary?.totalRealizedPnl || 0, currency)}
            positive={(summary?.totalRealizedPnl || 0) >= 0}
            icon={
              (summary?.totalRealizedPnl || 0) >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-400" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-400" />
              )
            }
          />
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Allocation Chart */}
          <div className="lg:col-span-1 bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">{t("dashboard.allocation")}</h2>
            {holdings.length > 0 ? (
              <PortfolioChart data={holdings} />
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-gray-600">
                <Coins className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">{t("dashboard.noHoldings")}</p>
                <Link href="/upload" className="text-blue-400 text-sm mt-2 hover:underline">
                  {t("dashboard.uploadSlip")}
                </Link>
              </div>
            )}
          </div>

          {/* Holdings Table */}
          <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">{t("dashboard.holdings")}</h2>
            {holdings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400">
                      <th className="text-left py-2 px-2">{t("dashboard.coin")}</th>
                      <th className="text-right py-2 px-2">{t("dashboard.amount")}</th>
                      <th className="text-right py-2 px-2">{t("dashboard.avgPrice")}</th>
                      <th className="text-right py-2 px-2">{t("dashboard.value")}</th>
                      <th className="text-right py-2 px-2">{t("dashboard.pnl")}</th>
                      <th className="text-right py-2 px-2">{t("dashboard.alloc")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {holdings.map((h) => (
                      <tr key={h.symbol} className="hover:bg-gray-800/50">
                        <td className="py-3 px-2">
                          <div className="font-medium text-white">{h.symbol}</div>
                          <div className="text-xs text-gray-500">{h.name}</div>
                        </td>
                        <td className="py-3 px-2 text-right text-gray-300 font-mono text-xs">
                          {h.netAmount.toFixed(8).replace(/\.?0+$/, "")}
                        </td>
                        <td className="py-3 px-2 text-right text-gray-300">
                          {formatCurrency(h.avgBuyPrice, currency)}
                        </td>
                        <td className="py-3 px-2 text-right text-white font-medium">
                          {formatCurrency(h.currentValue, currency)}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className={h.unrealizedPnl >= 0 ? "text-green-400" : "text-red-400"}>
                            {h.unrealizedPnl >= 0 ? "+" : ""}
                            {formatCurrency(h.unrealizedPnl, currency)}
                          </div>
                          <div className={`text-xs ${h.unrealizedPnlPercent >= 0 ? "text-green-500" : "text-red-500"}`}>
                            {h.unrealizedPnlPercent >= 0 ? "+" : ""}
                            {h.unrealizedPnlPercent.toFixed(2)}%
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${Math.min(h.allocation, 100)}%` }}
                              />
                            </div>
                            <span className="text-gray-400 text-xs w-10 text-right">
                              {h.allocation.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-gray-600">
                <TrendingUp className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">{t("dashboard.noHoldingsDesc")}</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">{t("dashboard.recentTransactions")}</h2>
            <Link
              href="/upload"
              className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
            >
              {t("dashboard.uploadSlipLink")}
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <TransactionTable
            transactions={transactions}
            onDelete={handleDeleteTransaction}
            onEdit={() => fetchData()}
          />
          {transactions.length >= 10 && (
            <p className="text-center text-gray-600 text-sm mt-4">
              {t("dashboard.showingLast")}{" "}
              <Link href="/chart" className="text-blue-400 hover:underline">
                {t("dashboard.viewAllChart")}
              </Link>
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
