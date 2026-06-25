"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bitcoin, Zap, Loader2, AlertTriangle } from "lucide-react";

function MockPayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get("invoiceId") ?? "";
  const amount = searchParams.get("amount") ?? "";
  const label = searchParams.get("label") ?? "Subscription";

  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const handlePay = async () => {
    setPaying(true);
    setError("");
    try {
      const res = await fetch("/api/subscription/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const d = await res.json();
      if (!res.ok || d.status !== "paid") {
        setError(d.error || "ยืนยันการชำระเงินไม่สำเร็จ");
        setPaying(false);
        return;
      }
      router.push("/settings/subscription?status=success");
    } catch {
      setError("เกิดข้อผิดพลาด");
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
            <Bitcoin className="h-6 w-6 text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Lightning Checkout</h1>
            <p className="text-muted-foreground text-sm">{label}</p>
          </div>
        </div>

        <div className="bg-muted rounded-xl p-5 mb-6 text-center">
          <p className="text-muted-foreground text-sm mb-1">จำนวนที่ต้องชำระ</p>
          <p className="text-3xl font-bold text-foreground">
            {Number(amount).toLocaleString()} <span className="text-lg text-orange-400">sats</span>
          </p>
          <p className="text-xs text-muted-foreground mt-2 break-all">invoice: {invoiceId}</p>
        </div>

        <div className="flex items-start gap-2 bg-yellow-950/30 border border-yellow-800/40 rounded-lg p-3 mb-6">
          <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-300/90">
            โหมดทดสอบ (Dev) — ยังไม่ได้ตั้งค่า BTCPay Server จริง กดปุ่มด้านล่างเพื่อ
            <b> จำลอง</b>การชำระเงินผ่าน Lightning
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-400 mb-4">{error}</p>
        )}

        <button
          onClick={handlePay}
          disabled={paying || !invoiceId}
          className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-orange-700 disabled:cursor-not-allowed text-black py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
        >
          {paying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              กำลังยืนยัน...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              จำลองการชำระเงิน (Pay)
            </>
          )}
        </button>

        <button
          onClick={() => router.push("/settings/subscription")}
          disabled={paying}
          className="w-full mt-3 text-muted-foreground hover:text-foreground py-2 text-sm transition-colors"
        >
          ยกเลิก
        </button>
      </div>
    </div>
  );
}

export default function MockPayPage() {
  return (
    <Suspense fallback={null}>
      <MockPayContent />
    </Suspense>
  );
}
