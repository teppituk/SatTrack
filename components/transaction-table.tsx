"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Trash2, ExternalLink, ChevronUp, ChevronDown, TrendingUp, TrendingDown } from "lucide-react";

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
  coin: {
    symbol: string;
    name: string;
  };
}

interface TransactionTableProps {
  transactions: Transaction[];
  onDelete?: (id: string) => void;
}

type SortKey = "txDate" | "totalValue" | "coin" | "type";
type SortDir = "asc" | "desc";

const exchangeLabels: Record<string, string> = {
  bitkub: "Bitkub",
  binanceth: "Binance TH",
  binance: "Binance",
};

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat(currency === "THB" ? "th-TH" : "en-US", {
    style: "currency",
    currency: currency === "USDT" ? "USD" : currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function TransactionTable({
  transactions,
  onDelete,
}: TransactionTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("txDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...transactions].sort((a, b) => {
    let aVal: string | number = 0;
    let bVal: string | number = 0;

    switch (sortKey) {
      case "txDate":
        aVal = new Date(a.txDate).getTime();
        bVal = new Date(b.txDate).getTime();
        break;
      case "totalValue":
        aVal = a.totalValue;
        bVal = b.totalValue;
        break;
      case "coin":
        aVal = a.coin.symbol;
        bVal = b.coin.symbol;
        break;
      case "type":
        aVal = a.type;
        bVal = b.type;
        break;
    }

    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const handleDelete = async (id: string) => {
    if (!onDelete) return;
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronUp className="h-3 w-3 opacity-20" />;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3 text-blue-400" />
    ) : (
      <ChevronDown className="h-3 w-3 text-blue-400" />
    );
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p>No transactions yet</p>
        <p className="text-sm mt-1">Upload your first slip to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            {[
              { key: "txDate" as SortKey, label: "Date" },
              { key: "type" as SortKey, label: "Type" },
              { key: "coin" as SortKey, label: "Coin" },
              { key: null, label: "Amount" },
              { key: null, label: "Price" },
              { key: "totalValue" as SortKey, label: "Total" },
              { key: null, label: "Exchange" },
              { key: null, label: "" },
            ].map((col, idx) => (
              <th
                key={idx}
                className={`text-left py-3 px-4 text-gray-400 font-medium ${col.key ? "cursor-pointer hover:text-white" : ""}`}
                onClick={() => col.key && handleSort(col.key)}
              >
                <div className="flex items-center gap-1">
                  {col.label}
                  {col.key && <SortIcon col={col.key} />}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {sorted.map((tx) => (
            <tr key={tx.id} className="hover:bg-gray-800/50 transition-colors">
              <td className="py-3 px-4 text-gray-300 whitespace-nowrap">
                {format(new Date(tx.txDate), "dd MMM yyyy HH:mm")}
              </td>
              <td className="py-3 px-4">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    tx.type === "BUY"
                      ? "bg-green-900/50 text-green-400"
                      : "bg-red-900/50 text-red-400"
                  }`}
                >
                  {tx.type === "BUY" ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {tx.type}
                </span>
              </td>
              <td className="py-3 px-4">
                <div className="font-medium text-white">{tx.coin.symbol}</div>
                <div className="text-xs text-gray-500">{tx.coin.name}</div>
              </td>
              <td className="py-3 px-4 text-gray-300 font-mono">
                {tx.amount.toFixed(8).replace(/\.?0+$/, "")}
              </td>
              <td className="py-3 px-4 text-gray-300">
                {formatCurrency(tx.price, tx.currency)}
              </td>
              <td className="py-3 px-4 text-white font-medium">
                {formatCurrency(tx.totalValue, tx.currency)}
              </td>
              <td className="py-3 px-4">
                <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
                  {exchangeLabels[tx.exchange] || tx.exchange}
                </span>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  {tx.slipImageUrl && (
                    <a
                      href={tx.slipImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-blue-400 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => handleDelete(tx.id)}
                      disabled={deletingId === tx.id}
                      className="text-gray-500 hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
