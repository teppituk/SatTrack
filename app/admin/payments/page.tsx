"use client";

import { useEffect, useState, useCallback } from "react";
import { Wallet, Check, X, Loader2, Copy } from "lucide-react";

interface Payment {
  id: string;
  refCode: string | null;
  planType: string | null;
  amountSats: number;
  status: string;
  note: string | null;
  createdAt: string;
  paidAt: string | null;
  user: { email: string; name: string | null };
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/payments");
    if (res.ok) {
      const d = await res.json();
      setPayments(d.payments ?? []);
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: string, action: "approve" | "reject") => {
    if (action === "reject" && !confirm("ปฏิเสธคำขอนี้?")) return;
    setBusy(id);
    try {
      await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      await load();
      // แจ้ง nav ให้รีเฟรช badge จำนวน pending ทันที
      window.dispatchEvent(new Event("payments:updated"));
    } finally {
      setBusy(null);
    }
  };

  const copy = (s: string) => {
    navigator.clipboard.writeText(s);
    setCopied(s);
    setTimeout(() => setCopied(null), 1500);
  };

  const badge = (s: string) =>
    s === "paid"
      ? "bg-green-900/50 text-green-400"
      : s === "rejected"
      ? "bg-red-900/50 text-red-400"
      : s === "expired"
      ? "bg-accent text-muted-foreground"
      : "bg-yellow-900/50 text-yellow-400";

  const pending = payments.filter((p) => p.status === "pending");

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 bg-orange-500/15 rounded-xl flex items-center justify-center">
          <Wallet className="h-5 w-5 text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payments</h1>
          <p className="text-muted-foreground text-sm">
            ตรวจ memo (รหัสอ้างอิง) ใน Wallet of Satoshi แล้วอนุมัติ/ปฏิเสธ — รอดำเนินการ {pending.length} รายการ
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground text-sm">
          ยังไม่มีคำขอชำระเงิน
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs">
                <th className="text-left py-2.5 px-4">รหัสอ้างอิง (memo)</th>
                <th className="text-left py-2.5 px-3">ผู้ใช้</th>
                <th className="text-left py-2.5 px-3">แผน</th>
                <th className="text-right py-2.5 px-3">จำนวน</th>
                <th className="text-left py-2.5 px-3">สถานะ</th>
                <th className="text-right py-2.5 px-4">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-muted/40">
                  <td className="py-2.5 px-4">
                    <button
                      onClick={() => p.refCode && copy(p.refCode)}
                      className="font-mono text-foreground flex items-center gap-1.5 hover:text-purple-400"
                      title="คัดลอก"
                    >
                      {p.refCode || "—"}
                      {p.refCode &&
                        (copied === p.refCode ? (
                          <Check className="h-3 w-3 text-green-400" />
                        ) : (
                          <Copy className="h-3 w-3 opacity-60" />
                        ))}
                    </button>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(p.createdAt).toLocaleString("th-TH")}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground">
                    {p.user.name || p.user.email}
                    <div className="text-[11px]">{p.user.email}</div>
                  </td>
                  <td className="py-2.5 px-3 text-foreground">{p.planType ?? "—"}</td>
                  <td className="py-2.5 px-3 text-right text-foreground tabular-nums">
                    {p.amountSats.toLocaleString()} sats
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${badge(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {p.status === "pending" ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => act(p.id, "approve")}
                          disabled={busy === p.id}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs disabled:opacity-50"
                        >
                          {busy === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          อนุมัติ
                        </button>
                        <button
                          onClick={() => act(p.id, "reject")}
                          disabled={busy === p.id}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted hover:bg-red-950/40 text-red-400 text-xs disabled:opacity-50"
                        >
                          <X className="h-3 w-3" />
                          ปฏิเสธ
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
