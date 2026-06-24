"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle, AlertCircle, ImageIcon, X, Upload } from "lucide-react";
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
  // รูปสลิป (optional) — เก็บไว้เป็นหลักฐานการซื้อ
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const onSelectFile = (file: File | null) => {
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("รองรับเฉพาะรูป JPG, PNG, WebP");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("ไฟล์ใหญ่เกิน 10MB");
      return;
    }
    setError("");
    setSlipFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setSlipPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    setSlipFile(null);
    setSlipPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const reset = () => {
    setFormData(makeDefault());
    setRawInputs({ amount: "", price: "", totalValue: "" });
    setDone(false);
    setError("");
    removeFile();
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
      // อัปโหลดรูปสลิปก่อน (ถ้ามี) เพื่อเก็บเป็นหลักฐาน
      let slipImageUrl: string | null = null;
      if (slipFile) {
        const fd = new FormData();
        fd.append("file", slipFile);
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        if (!up.ok) {
          const e = await up.json().catch(() => ({}));
          throw new Error(e.error || "อัปโหลดรูปสลิปไม่สำเร็จ");
        }
        const d = await up.json();
        slipImageUrl = d.imageUrl ?? null;
      }

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          coinSymbol: "BTC",
          assetType: "CRYPTO",
          slipImageUrl,
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
        <h3 className="text-xl font-semibold text-white mb-2">บันทึกธุรกรรมสำเร็จ!</h3>
        <p className="text-gray-400 mb-6">เพิ่มรายการ BTC เข้าพอร์ตโฟลิโอของคุณแล้ว</p>
        <button
          onClick={reset}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl transition-colors"
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
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">ยืนยันการบันทึกรายการ</h2>
              <button
                onClick={() => setShowConfirm(false)}
                className="text-gray-500 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">ประเภท</span>
                <span
                  className={`font-semibold ${
                    formData.type === "BUY" ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {formData.type}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">เหรียญ</span>
                <span className="text-white font-medium">₿ BTC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">จำนวน</span>
                <span className="text-white font-mono">{fmtNum(formData.amount)} BTC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">ราคาต่อหน่วย</span>
                <span className="text-white">
                  {fmtNum(formData.price)} {formData.currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">มูลค่ารวม</span>
                <span className="text-white font-semibold">
                  {fmtNum(formData.totalValue)} {formData.currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Exchange</span>
                <span className="text-white">{exchangeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">วันที่</span>
                <span className="text-white">
                  {format(new Date(formData.txDate), "dd/MM/yyyy HH:mm")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">รูปสลิป</span>
                <span className={slipFile ? "text-green-400" : "text-gray-500"}>
                  {slipFile ? "แนบแล้ว" : "ไม่แนบ"}
                </span>
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Exchange */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Exchange</label>
          <select
            value={formData.exchange}
            onChange={(e) => updateForm("exchange", e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <label className="block text-xs text-gray-400 mb-1">Type</label>
          <select
            value={formData.type}
            onChange={(e) => updateForm("type", e.target.value as "BUY" | "SELL")}
            className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
        </div>

        {/* Coin (locked to BTC) */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Coin</label>
          <div className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2.5 rounded-xl flex items-center gap-2 cursor-not-allowed">
            <span className="text-orange-400 text-lg">₿</span>
            <span className="font-medium">BTC</span>
            <span className="text-xs text-gray-500">(Bitcoin)</span>
          </div>
        </div>

        {/* Currency */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Currency</label>
          <select
            value={formData.currency}
            onChange={(e) => updateForm("currency", e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="THB">THB</option>
            <option value="USDT">USDT</option>
            <option value="USD">USD</option>
          </select>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">จำนวน BTC</label>
          <input
            type="text"
            inputMode="decimal"
            value={rawInputs.amount}
            onChange={(e) => {
              const raw = e.target.value;
              setRawInputs((prev) => ({ ...prev, amount: raw }));
              const v = parseFloat(raw);
              if (!isNaN(v)) updateForm("amount", v);
            }}
            placeholder="0.000000001"
            className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Price */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">ราคาต่อหน่วย</label>
          <input
            type="text"
            inputMode="decimal"
            value={rawInputs.price}
            onChange={(e) => {
              const raw = e.target.value;
              setRawInputs((prev) => ({ ...prev, price: raw }));
              const v = parseFloat(raw);
              if (!isNaN(v)) updateForm("price", v);
            }}
            placeholder="2000000"
            className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Total Value */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">มูลค่ารวม</label>
          <input
            type="text"
            inputMode="decimal"
            value={rawInputs.totalValue}
            onChange={(e) => {
              const raw = e.target.value;
              setRawInputs((prev) => ({ ...prev, totalValue: raw }));
              const v = parseFloat(raw);
              if (!isNaN(v)) updateForm("totalValue", v);
            }}
            placeholder="2000"
            className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Transaction Date */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">วันที่ธุรกรรม</label>
          <input
            type="datetime-local"
            value={formData.txDate ? format(new Date(formData.txDate), "yyyy-MM-dd'T'HH:mm") : ""}
            onChange={(e) => updateForm("txDate", new Date(e.target.value).toISOString())}
            className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* รูปสลิป (optional) */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          รูปสลิป <span className="text-gray-600">(ไม่บังคับ — เก็บไว้เป็นหลักฐานการซื้อ)</span>
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => onSelectFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />
        {slipPreview ? (
          <div className="flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-xl p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slipPreview}
              alt="Slip preview"
              className="h-16 w-16 object-cover rounded-lg border border-gray-700"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{slipFile?.name}</p>
              <p className="text-xs text-gray-500">
                {slipFile ? `${(slipFile.size / 1024).toFixed(0)} KB` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={removeFile}
              className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
              title="ลบรูป"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-700 hover:border-gray-500 hover:bg-gray-800/30 text-gray-400 rounded-xl py-4 transition-colors"
          >
            <Upload className="h-4 w-4" />
            <span className="text-sm">แนบรูปสลิป (JPG, PNG, WebP — สูงสุด 10MB)</span>
            <ImageIcon className="h-4 w-4 text-gray-600" />
          </button>
        )}
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
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
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
          className="px-6 py-3 border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white rounded-xl transition-colors"
        >
          ล้างข้อมูล
        </button>
      </div>
    </div>
  );
}
