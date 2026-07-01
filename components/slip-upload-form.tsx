"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle, AlertCircle, X, RefreshCw, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";

interface ExchangeOption {
  code: string;
  name: string;
}

interface TxData {
  exchange: string;
  type: "BUY" | "SELL";
  coinSymbol: string;
  amount: number;
  price: number;
  totalValue: number;
  currency: string;
  txDate: string;
}

interface SlipUploadFormProps {
  onSuccess?: (transaction: unknown) => void;
}

// ค่าเริ่มต้น — Bitcoin (BTC) เท่านั้น
const makeDefault = (): TxData => ({
  exchange: "bitkub",
  type: "BUY",
  coinSymbol: "BTC",
  amount: 0,
  price: 0,
  totalValue: 0,
  currency: "THB",
  txDate: new Date().toISOString(),
});

export function SlipUploadForm({ onSuccess }: SlipUploadFormProps) {
  const [formData, setFormData] = useState<TxData>(makeDefault);
  // แยก state string สำหรับ input ตัวเลข เพื่อรองรับการพิมพ์ทศนิยมหลายหลัก เช่น 0.000000001
  const [rawInputs, setRawInputs] = useState({ amount: "", price: "", totalValue: "" });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [exchanges, setExchanges] = useState<ExchangeOption[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  // นำเข้าข้อมูลเก่าจาก Excel (.xlsx)
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);
  // ราคาปัจจุบันของ BTC (ตาม currency) สำหรับ default ราคาต่อหน่วย
  const [livePrice, setLivePrice] = useState<{ THB: number; USD: number } | null>(null);
  const [priceLoading, setPriceLoading] = useState(true);
  const [priceUpdatedAt, setPriceUpdatedAt] = useState<string | null>(null);
  // ผู้ใช้แก้ราคาต่อหน่วยเองหรือยัง — ถ้าแก้แล้วจะไม่ override ด้วยราคาปัจจุบัน
  const [priceEdited, setPriceEdited] = useState(false);
  const priceEditedRef = useRef(false);
  const currencyRef = useRef<"THB" | "USD">("THB");

  const fmtAmt = (n: number) => (n > 0 ? String(Number(n.toFixed(8))) : "");
  const fmtMoney = (n: number) => (n > 0 ? String(Number(n.toFixed(2))) : "");

  // โหลดรายการ exchange ที่ admin เปิดใช้งาน
  useEffect(() => {
    fetch("/api/exchanges")
      .then((res) => (res.ok ? res.json() : { exchanges: [] }))
      .then((data) => {
        const list: ExchangeOption[] = data.exchanges ?? [];
        setExchanges(list);
        // ถ้า exchange ปัจจุบันไม่อยู่ในรายการ ให้ตั้งเป็นตัวแรก
        if (list.length > 0) {
          setFormData((prev) =>
            list.some((e) => e.code === prev.exchange)
              ? prev
              : { ...prev, exchange: list[0].code }
          );
        }
      })
      .catch(() => setExchanges([]));
  }, []);

  const updateForm = (field: keyof TxData, value: string | number) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  // inquiry ราคา BTC ล่าสุด — ใช้ทั้งตอนโหลดหน้าและกดปุ่ม Refresh
  const loadPrice = async () => {
    setPriceLoading(true);
    try {
      // cache-bust เพื่อให้ปุ่ม Refresh ได้ราคาล่าสุดจริง ๆ
      const res = await fetch(`/api/price/btc?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("price fetch failed");
      const d = await res.json();
      if (!d || d.error) throw new Error("no price");
      const lp = { THB: Number(d.thb) || 0, USD: Number(d.usd) || 0 };
      setLivePrice(lp);
      setPriceUpdatedAt(d.updatedAt ?? new Date().toISOString());
      // ตั้ง default เฉพาะเมื่อผู้ใช้ยังไม่ได้แก้ราคาเอง
      if (!priceEditedRef.current) applyPrice(lp[currencyRef.current]);
    } catch {
      // เงียบไว้ — ผู้ใช้ยังคีย์ราคาเองได้
    } finally {
      setPriceLoading(false);
    }
  };

  // ดึงราคาปัจจุบันของ BTC ครั้งแรก
  useEffect(() => {
    loadPrice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ตั้งราคาต่อหน่วย แล้วคำนวณช่องอื่นต่อเนื่อง (มูลค่ารวม → จำนวน, หรือ จำนวน → มูลค่ารวม)
  const applyPrice = (price: number) => {
    setRawInputs((prev) => {
      const next = { ...prev, price: fmtMoney(price) };
      return next;
    });
    setFormData((prev) => {
      const next = { ...prev, price };
      if (price > 0) {
        if (prev.totalValue > 0) next.amount = prev.totalValue / price;
        else if (prev.amount > 0) next.totalValue = prev.amount * price;
      }
      return next;
    });
    setRawInputs((prev) => {
      const next = { ...prev };
      // sync ช่องที่ถูกคำนวณใหม่
      if (price > 0) {
        const total = parseFloat(prev.totalValue);
        const amt = parseFloat(prev.amount);
        if (!isNaN(total) && total > 0) next.amount = fmtAmt(total / price);
        else if (!isNaN(amt) && amt > 0) next.totalValue = fmtMoney(amt * price);
      }
      return next;
    });
  };

  // เปลี่ยน currency — ถ้ายังไม่แก้ราคาเอง ให้ default เป็นราคาปัจจุบันของ currency ใหม่
  const handleCurrencyChange = (cur: "THB" | "USD") => {
    currencyRef.current = cur;
    updateForm("currency", cur);
    if (!priceEditedRef.current && livePrice) applyPrice(livePrice[cur]);
  };

  // กรอกจำนวน BTC เอง → คำนวณมูลค่ารวมจากราคาต่อหน่วย
  const handleAmountChange = (raw: string) => {
    const a = parseFloat(raw);
    const amt = isNaN(a) ? 0 : a;
    const price = formData.price;
    setRawInputs((prev) => ({
      ...prev,
      amount: raw,
      ...(price > 0 ? { totalValue: fmtMoney(amt * price) } : {}),
    }));
    setFormData((prev) => ({
      ...prev,
      amount: amt,
      ...(price > 0 ? { totalValue: amt * price } : {}),
    }));
  };

  // กรอกมูลค่ารวม → คำนวณจำนวน BTC จากราคาต่อหน่วย (ราคาปัจจุบันหรือที่คีย์เอง)
  const handleTotalChange = (raw: string) => {
    const t = parseFloat(raw);
    const tot = isNaN(t) ? 0 : t;
    const price = formData.price;
    setRawInputs((prev) => ({
      ...prev,
      totalValue: raw,
      ...(price > 0 ? { amount: fmtAmt(tot / price) } : {}),
    }));
    setFormData((prev) => ({
      ...prev,
      totalValue: tot,
      ...(price > 0 ? { amount: tot / price } : {}),
    }));
  };

  // แก้ราคาต่อหน่วยเอง → ตั้ง flag ว่าผู้ใช้คีย์เอง และคำนวณช่องที่เกี่ยวข้อง
  const handlePriceChange = (raw: string) => {
    const p = parseFloat(raw);
    const price = isNaN(p) ? 0 : p;
    setPriceEdited(true);
    priceEditedRef.current = true;
    setRawInputs((prev) => {
      const next = { ...prev, price: raw };
      if (price > 0) {
        const total = parseFloat(prev.totalValue);
        const amt = parseFloat(prev.amount);
        if (!isNaN(total) && total > 0) next.amount = fmtAmt(total / price);
        else if (!isNaN(amt) && amt > 0) next.totalValue = fmtMoney(amt * price);
      }
      return next;
    });
    setFormData((prev) => {
      const next = { ...prev, price };
      if (price > 0) {
        if (prev.totalValue > 0) next.amount = prev.totalValue / price;
        else if (prev.amount > 0) next.totalValue = prev.amount * price;
      }
      return next;
    });
  };

  // กลับไปใช้ราคาปัจจุบัน
  const useCurrentPrice = () => {
    if (!livePrice) return;
    setPriceEdited(false);
    priceEditedRef.current = false;
    applyPrice(livePrice[formData.currency as "THB" | "USD"]);
  };

  const reset = () => {
    setFormData(makeDefault());
    setRawInputs({ amount: "", price: "", totalValue: "" });
    setDone(false);
    setError("");
    setPriceEdited(false);
    priceEditedRef.current = false;
    currencyRef.current = "THB";
    // default ราคาต่อหน่วยกลับเป็นราคาปัจจุบัน (THB)
    if (livePrice) applyPrice(livePrice.THB);
  };

  // นำเข้าข้อมูลการซื้อขายเก่าจากไฟล์ Excel (.xlsx)
  const handleImport = async (file: File | null) => {
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) {
      setImportErr("รองรับเฉพาะไฟล์ .xlsx");
      return;
    }
    setImporting(true);
    setImportMsg(null);
    setImportErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/transactions/import", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) {
        setImportErr(d.error || "นำเข้าไม่สำเร็จ");
        return;
      }
      let msg = `นำเข้าสำเร็จ ${d.imported} รายการ`;
      if (d.skipped) msg += ` · ข้าม ${d.skipped} รายการ`;
      if (d.limitReached) msg += " (เกินโควต้าแผนฟรี 50/เดือน)";
      setImportMsg(msg);
      if (d.imported > 0) onSuccess?.(null);
    } catch {
      setImportErr("เกิดข้อผิดพลาดในการนำเข้า");
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  // validate แล้วเปิด popup ยืนยัน
  const handleConfirmClick = () => {
    if (!formData.amount || formData.amount <= 0) {
      setError("กรุณาระบุจำนวน BTC");
      return;
    }
    if (!formData.price || formData.price <= 0) {
      setError("กรุณาระบุราคาต่อหน่วย");
      return;
    }
    setError("");
    setShowConfirm(true);
  };

  const handleSave = async () => {
    setShowConfirm(false);
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          coinSymbol: "BTC",
          assetType: "CRYPTO",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save transaction");
      }

      const { transaction } = await res.json();
      setDone(true);
      onSuccess?.(transaction);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">บันทึกธุรกรรมสำเร็จ!</h3>
        <p className="text-muted-foreground mb-6">เพิ่มรายการ BTC เข้าพอร์ตโฟลิโอของคุณแล้ว</p>
        <button
          onClick={reset}
          className="bg-blue-600 hover:bg-blue-700 text-foreground px-6 py-2.5 rounded-xl transition-colors"
        >
          เพิ่มรายการอีก
        </button>
      </div>
    );
  }

  const exchangeName =
    exchanges.find((e) => e.code === formData.exchange)?.name ?? formData.exchange;
  const fmtNum = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 8 });

  return (
    <div className="space-y-6">
      {/* Popup ยืนยันก่อนบันทึก */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">ยืนยันการบันทึกรายการ</h2>
              <button
                onClick={() => setShowConfirm(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ประเภท</span>
                <span
                  className={`font-semibold ${
                    formData.type === "BUY" ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {formData.type}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">เหรียญ</span>
                <span className="text-foreground font-medium">₿ BTC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">จำนวน</span>
                <span className="text-foreground font-mono">{fmtNum(formData.amount)} BTC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ราคาต่อหน่วย</span>
                <span className="text-foreground">
                  {fmtNum(formData.price)} {formData.currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">มูลค่ารวม</span>
                <span className="text-foreground font-semibold">
                  {fmtNum(formData.totalValue)} {formData.currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Exchange</span>
                <span className="text-foreground">{exchangeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">วันที่</span>
                <span className="text-foreground">
                  {format(new Date(formData.txDate), "dd/MM/yyyy HH:mm")}
                </span>
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-muted hover:bg-accent text-foreground text-sm rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-foreground text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    ยืนยันบันทึก
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bitcoin only banner */}
      <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm font-medium">
        <span className="text-lg">₿</span>
        <span>Stack Bitcoin — บันทึกรายการซื้อ/ขาย BTC</span>
      </div>

      {/* นำเข้าข้อมูลเก่าจาก Excel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-muted/40 border border-border">
        <div className="text-xs text-muted-foreground">
          <p className="font-medium text-foreground">นำเข้าข้อมูลเก่าจาก Excel</p>
          <p>
            คอลัมน์: Exchange, Type, Coin, Currency, จำนวน BTC, ราคาต่อหน่วย, มูลค่ารวม, วันที่ทำธุรกรรม (.xlsx)
          </p>
        </div>
        <input
          ref={importInputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => handleImport(e.target.files?.[0] ?? null)}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => importInputRef.current?.click()}
          disabled={importing}
          className="flex-shrink-0 flex items-center justify-center gap-2 bg-card border border-border hover:border-orange-500/50 text-foreground text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
        >
          {importing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              กำลังนำเข้า...
            </>
          ) : (
            <>
              <FileSpreadsheet className="h-4 w-4 text-green-500" />
              อัปโหลดไฟล์ Excel
            </>
          )}
        </button>
      </div>
      {importMsg && (
        <div className="flex items-center gap-2 bg-green-950/40 border border-green-800 text-green-400 px-4 py-2.5 rounded-lg text-sm">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          <span>{importMsg}</span>
        </div>
      )}
      {importErr && (
        <div className="flex items-center gap-2 bg-red-950 border border-red-800 text-red-400 px-4 py-2.5 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{importErr}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Exchange */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Exchange</label>
          <select
            value={formData.exchange}
            onChange={(e) => updateForm("exchange", e.target.value)}
            className="w-full bg-muted border border-border text-foreground px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {exchanges.length === 0 ? (
              <option value={formData.exchange}>{formData.exchange}</option>
            ) : (
              exchanges.map((ex) => (
                <option key={ex.code} value={ex.code}>
                  {ex.name}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Type</label>
          <select
            value={formData.type}
            onChange={(e) => updateForm("type", e.target.value as "BUY" | "SELL")}
            className="w-full bg-muted border border-border text-foreground px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
        </div>

        {/* Coin (locked to BTC) */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Coin</label>
          <div className="w-full bg-muted border border-border text-foreground px-3 py-2.5 rounded-xl flex items-center gap-2 cursor-not-allowed">
            <span className="text-orange-400 text-lg">₿</span>
            <span className="font-medium">BTC</span>
            <span className="text-xs text-muted-foreground">(Bitcoin)</span>
          </div>
        </div>

        {/* Currency */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Currency</label>
          <select
            value={formData.currency}
            onChange={(e) => handleCurrencyChange(e.target.value as "THB" | "USD")}
            className="w-full bg-muted border border-border text-foreground px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="THB">THB</option>
            <option value="USD">USD</option>
          </select>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            จำนวน BTC{" "}
            <span className="text-muted-foreground">(กรอกมูลค่ารวมเพื่อคำนวณอัตโนมัติ)</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={rawInputs.amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0.000000001"
            className="w-full bg-muted border border-border text-foreground px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Price */}
        <div>
          <div className="flex items-center justify-between mb-1 gap-2">
            <label className="text-xs text-muted-foreground whitespace-nowrap">ราคาต่อหน่วย</label>
            {/* ปุ่ม Refresh เห็นเสมอ (อยู่คู่ label) */}
            <button
              type="button"
              onClick={loadPrice}
              disabled={priceLoading}
              title="ดึงราคาล่าสุด"
              className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 disabled:opacity-50 whitespace-nowrap flex-shrink-0"
            >
              <RefreshCw className={`h-3 w-3 ${priceLoading ? "animate-spin" : ""}`} />
              {priceLoading ? "กำลังโหลด…" : "Refresh"}
            </button>
          </div>
          <input
            type="text"
            inputMode="decimal"
            value={rawInputs.price}
            onChange={(e) => handlePriceChange(e.target.value)}
            placeholder="2000000"
            className="w-full bg-muted border border-border text-foreground px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {/* บรรทัดสถานะราคาล่าสุด — อยู่ใต้ช่อง wrap ได้ ไม่ดันปุ่มหลุด */}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]">
            {livePrice && (
              <span className="text-muted-foreground">
                ล่าสุด {fmtNum(livePrice[formData.currency as "THB" | "USD"])}{" "}
                {formData.currency}
                {priceUpdatedAt ? ` · ${format(new Date(priceUpdatedAt), "HH:mm:ss")}` : ""}
              </span>
            )}
            {!priceEdited && livePrice && !priceLoading && (
              <span className="text-green-400">● ราคาปัจจุบัน</span>
            )}
            {livePrice && priceEdited && (
              <button
                type="button"
                onClick={useCurrentPrice}
                className="text-blue-400 hover:underline"
              >
                ใช้ราคาปัจจุบัน
              </button>
            )}
            {!livePrice && !priceLoading && (
              <span className="text-muted-foreground">ดึงราคาล่าสุดไม่ได้ — กรอกเองได้</span>
            )}
          </div>
        </div>

        {/* Total Value */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1">มูลค่ารวม</label>
          <input
            type="text"
            inputMode="decimal"
            value={rawInputs.totalValue}
            onChange={(e) => handleTotalChange(e.target.value)}
            placeholder="2000"
            className="w-full bg-muted border border-border text-foreground px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Transaction Date */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1">วันที่ธุรกรรม</label>
          <input
            type="datetime-local"
            value={formData.txDate ? format(new Date(formData.txDate), "yyyy-MM-dd'T'HH:mm") : ""}
            onChange={(e) => updateForm("txDate", new Date(e.target.value).toISOString())}
            className="w-full bg-muted border border-border text-foreground px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-950 border border-red-800 text-red-400 px-4 py-3 rounded-lg">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleConfirmClick}
          disabled={saving}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-foreground py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              กำลังบันทึก...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              บันทึกรายการ
            </>
          )}
        </button>
        <button
          onClick={reset}
          disabled={saving}
          className="px-6 py-3 border border-border hover:border-border text-muted-foreground hover:text-foreground rounded-xl transition-colors"
        >
          ล้างข้อมูล
        </button>
      </div>
    </div>
  );
}
