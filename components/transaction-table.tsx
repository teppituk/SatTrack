"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Trash2, ExternalLink, ChevronUp, ChevronDown,
  TrendingUp, TrendingDown, Pencil, X, Check, Loader2,
} from "lucide-react";

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

interface TransactionTableProps {
  transactions: Transaction[];
  onDelete?: (id: string) => void;
  onEdit?: (id: string, data: Partial<Transaction>) => void;
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

interface EditForm {
  type: "BUY" | "SELL";
  coinSymbol: string;
  amount: string;
  price: string;
  totalValue: string;
  currency: string;
  exchange: string;
  txDate: string;
}

function EditModal({
  tx,
  onSave,
  onClose,
}: {
  tx: Transaction;
  onSave: (id: string, form: EditForm) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<EditForm>({
    type: tx.type,
    coinSymbol: tx.coin.symbol,
    amount: String(tx.amount),
    price: String(tx.price),
    totalValue: String(tx.totalValue),
    currency: tx.currency,
    exchange: tx.exchange,
    txDate: format(new Date(tx.txDate), "yyyy-MM-dd'T'HH:mm"),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof EditForm, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.coinSymbol.trim()) { setError("กรุณาระบุ Coin Symbol"); return; }
    setSaving(true);
    setError("");
    try {
      await onSave(tx.id, form);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-foreground font-semibold">แก้ไขธุรกรรม</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 grid grid-cols-2 gap-4">
          {/* Type */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1">ประเภท</label>
            <select value={form.type} onChange={(e) => set("type", e.target.value)}
              className="w-full bg-muted border border-border text-foreground px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </div>

          {/* Coin */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Coin <span className="text-red-400">*</span></label>
            <input type="text" value={form.coinSymbol}
              onChange={(e) => set("coinSymbol", e.target.value.toUpperCase())}
              placeholder="BTC"
              className="w-full bg-muted border border-border text-foreground px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase" />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1">จำนวน Crypto</label>
            <input type="number" step="any" value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              className="w-full bg-muted border border-border text-foreground px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Price */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1">ราคาต่อหน่วย</label>
            <input type="number" step="any" value={form.price}
              onChange={(e) => set("price", e.target.value)}
              className="w-full bg-muted border border-border text-foreground px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Total Value */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1">มูลค่ารวม</label>
            <input type="number" step="any" value={form.totalValue}
              onChange={(e) => set("totalValue", e.target.value)}
              className="w-full bg-muted border border-border text-foreground px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Currency */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1">สกุลเงิน</label>
            <select value={form.currency} onChange={(e) => set("currency", e.target.value)}
              className="w-full bg-muted border border-border text-foreground px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="THB">THB</option>
              <option value="USDT">USDT</option>
              <option value="USD">USD</option>
            </select>
          </div>

          {/* Exchange */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Exchange</label>
            <select value={form.exchange} onChange={(e) => set("exchange", e.target.value)}
              className="w-full bg-muted border border-border text-foreground px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="bitkub">Bitkub</option>
              <option value="binanceth">Binance TH</option>
              <option value="binance">Binance</option>
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1">วันที่/เวลา</label>
            <input type="datetime-local" value={form.txDate}
              onChange={(e) => set("txDate", e.target.value)}
              className="w-full bg-muted border border-border text-foreground px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="mx-6 mb-3 text-sm text-red-400 bg-red-950 border border-red-800 px-3 py-2 rounded-lg">{error}</p>
        )}

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-5">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-foreground py-2.5 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" />กำลังบันทึก...</> : <><Check className="h-4 w-4" />บันทึก</>}
          </button>
          <button onClick={onClose} disabled={saving}
            className="px-5 py-2.5 border border-border hover:border-border text-muted-foreground hover:text-foreground rounded-xl text-sm transition-colors">
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}

export function TransactionTable({ transactions, onDelete, onEdit }: TransactionTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("txDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sorted = [...transactions].sort((a, b) => {
    let aVal: string | number = 0;
    let bVal: string | number = 0;
    switch (sortKey) {
      case "txDate": aVal = new Date(a.txDate).getTime(); bVal = new Date(b.txDate).getTime(); break;
      case "totalValue": aVal = a.totalValue; bVal = b.totalValue; break;
      case "coin": aVal = a.coin.symbol; bVal = b.coin.symbol; break;
      case "type": aVal = a.type; bVal = b.type; break;
    }
    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const handleDelete = async (id: string) => {
    if (!onDelete) return;
    setDeletingId(id);
    try { await onDelete(id); } finally { setDeletingId(null); }
  };

  const handleSaveEdit = async (id: string, form: EditForm) => {
    const res = await fetch(`/api/transactions?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coinSymbol: form.coinSymbol.trim().toUpperCase(),
        type: form.type,
        amount: parseFloat(form.amount) || 0,
        price: parseFloat(form.price) || 0,
        totalValue: parseFloat(form.totalValue) || 0,
        currency: form.currency,
        exchange: form.exchange,
        txDate: new Date(form.txDate).toISOString(),
        slipImageUrl: null,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "บันทึกไม่สำเร็จ");
    }
    onEdit?.(id, await res.json());
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronUp className="h-3 w-3 opacity-20" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-3 w-3 text-blue-400" />
      : <ChevronDown className="h-3 w-3 text-blue-400" />;
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p>No transactions yet</p>
        <p className="text-sm mt-1">Stack your first Bitcoin to get started</p>
      </div>
    );
  }

  return (
    <>
      {editingTx && (
        <EditModal
          tx={editingTx}
          onSave={handleSaveEdit}
          onClose={() => setEditingTx(null)}
        />
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
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
                <th key={idx}
                  className={`text-left py-3 px-4 text-muted-foreground font-medium ${col.key ? "cursor-pointer hover:text-foreground" : ""}`}
                  onClick={() => col.key && handleSort(col.key)}>
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.key && <SortIcon col={col.key} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((tx) => (
              <tr key={tx.id} className="hover:bg-muted/50 transition-colors group">
                <td className="py-3 px-4 text-foreground whitespace-nowrap">
                  {format(new Date(tx.txDate), "dd MMM yyyy HH:mm")}
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    tx.type === "BUY" ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"
                  }`}>
                    {tx.type === "BUY" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {tx.type}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="font-medium text-foreground">{tx.coin.symbol}</div>
                  <div className="text-xs text-muted-foreground">{tx.coin.name}</div>
                </td>
                <td className="py-3 px-4 text-foreground font-mono">
                  {tx.amount.toFixed(8).replace(/\.?0+$/, "")}
                </td>
                <td className="py-3 px-4 text-foreground">
                  {formatCurrency(tx.price, tx.currency)}
                </td>
                <td className="py-3 px-4 text-foreground font-medium">
                  {formatCurrency(tx.totalValue, tx.currency)}
                </td>
                <td className="py-3 px-4">
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {exchangeLabels[tx.exchange] || tx.exchange}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {tx.slipImageUrl && (
                      <a href={tx.slipImageUrl} target="_blank" rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-blue-400 transition-colors">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <button onClick={() => setEditingTx(tx)}
                      className="text-muted-foreground hover:text-yellow-400 transition-colors">
                      <Pencil className="h-4 w-4" />
                    </button>
                    {onDelete && (
                      <button onClick={() => handleDelete(tx.id)} disabled={deletingId === tx.id}
                        className="text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50">
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
    </>
  );
}
