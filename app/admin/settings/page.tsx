"use client";

import { useEffect, useState } from "react";
import { Zap, Save, Check, Loader2, AlertCircle } from "lucide-react";

interface PaymentCfg {
  lightningAddress: string;
  monthlySats: number;
  annualSats: number;
  configured: boolean;
}

export default function AdminPaymentSettingsPage() {
  const [data, setData] = useState<PaymentCfg | null>(null);
  const [lightningAddress, setAddr] = useState("");
  const [monthlySats, setMonthly] = useState("10000");
  const [annualSats, setAnnual] = useState("100000");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    const res = await fetch("/api/admin/settings/payment");
    if (res.ok) {
      const d: PaymentCfg = await res.json();
      setData(d);
      setAddr(d.lightningAddress);
      setMonthly(String(d.monthlySats));
      setAnnual(String(d.annualSats));
    }
  };
  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lightningAddress, monthlySats, annualSats }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "บันทึกไม่สำเร็จ");
        return;
      }
      setSaved(true);
      await load();
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const field =
    "w-full bg-muted border border-border text-foreground text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500";

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 bg-orange-500/15 rounded-xl flex items-center justify-center">
          <Zap className="h-5 w-5 text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payment Settings</h1>
          <p className="text-muted-foreground text-sm">
            ตั้งค่าการรับชำระเงินผ่าน Wallet of Satoshi (Lightning address)
          </p>
        </div>
      </div>

      <div
        className={`flex items-center gap-2 text-sm rounded-lg px-4 py-2.5 my-4 border ${
          data?.configured
            ? "bg-green-950/40 border-green-800 text-green-400"
            : "bg-yellow-950/30 border-yellow-800/60 text-yellow-400"
        }`}
      >
        {data?.configured ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
        {data?.configured
          ? "ตั้งค่า Lightning address แล้ว — ผู้ใช้ชำระเงินได้"
          : "ยังไม่ได้ตั้ง Lightning address — ผู้ใช้จะกดชำระไม่ได้"}
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Wallet of Satoshi — Lightning Address
          </label>
          <input
            value={lightningAddress}
            onChange={(e) => setAddr(e.target.value)}
            placeholder="yourname@walletofsatoshi.com"
            className={field}
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            อีเมล Lightning address จากแอป Wallet of Satoshi (Receive → Lightning address)
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Monthly (sats)</label>
            <input
              type="number"
              value={monthlySats}
              onChange={(e) => setMonthly(e.target.value)}
              className={field}
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Annual (sats)</label>
            <input
              type="number"
              value={annualSats}
              onChange={(e) => setAnnual(e.target.value)}
              className={field}
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-950 border border-red-800 text-red-400 px-3 py-2 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? "กำลังบันทึก..." : saved ? "บันทึกแล้ว" : "บันทึกการตั้งค่า"}
        </button>
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        การอนุมัติการชำระเงิน (ตรวจ memo) อยู่ที่เมนู <b>Payments</b>
      </p>
    </div>
  );
}
