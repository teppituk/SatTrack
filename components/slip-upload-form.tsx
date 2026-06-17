"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  Image as ImageIcon,
  Loader2,
  CheckCircle,
  AlertCircle,
  Edit3,
  X,
} from "lucide-react";
import { format } from "date-fns";

interface ParsedData {
  exchange: string;
  assetType: "CRYPTO" | "STOCK";
  type: "BUY" | "SELL";
  coinSymbol: string;
  amount: number;
  price: number;
  totalValue: number;
  currency: string;
  txDate: string;
  confidence: number;
}

interface SlipUploadFormProps {
  onSuccess?: (transaction: unknown) => void;
}

type UploadState = "idle" | "uploading" | "ocr" | "review" | "saving" | "done" | "error";

export function SlipUploadForm({ onSuccess }: SlipUploadFormProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [formData, setFormData] = useState<ParsedData | null>(null);
  const [assetType, setAssetType] = useState<"CRYPTO" | "STOCK">("CRYPTO");
  // แยก state string สำหรับ input ตัวเลข เพื่อรองรับการพิมพ์ทศนิยมหลายหลัก เช่น 0.000000001
  const [rawInputs, setRawInputs] = useState({ amount: "", price: "", totalValue: "" });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setError("");
    setState("uploading");

    // Preview
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }

    try {
      // 1. Upload to S3
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || "Upload failed");
      }

      const { imageUrl: url } = await uploadRes.json();
      setImageUrl(url);

      // 2. Run OCR directly (for immediate feedback)
      setState("ocr");

      if (file.type.startsWith("image/")) {
        const ocrFormData = new FormData();
        ocrFormData.append("file", file);

        const ocrRes = await fetch("/api/ocr", {
          method: "POST",
          body: ocrFormData,
        });

        if (ocrRes.ok) {
          const { data } = await ocrRes.json();
          setParsedData(data);
          const resolved = {
            ...data,
            assetType: data.assetType ?? assetType,
            txDate: data.txDate || new Date().toISOString(),
          };
          setFormData(resolved);
          setAssetType(resolved.assetType);
          setRawInputs({
            amount: String(data.amount ?? ""),
            price: String(data.price ?? ""),
            totalValue: String(data.totalValue ?? ""),
          });
          setState("review");
          return;
        }

        const errBody = await ocrRes.json().catch(() => ({}));
        if (errBody?.error === "NO_API_KEY" || errBody?.error === "INVALID_API_KEY") {
          setError(
            "⚠️ OCR ไม่พร้อมใช้งาน: กรุณาใส่ GEMINI_API_KEY ใน .env.local " +
            "(รับฟรีที่ aistudio.google.com) แล้ว restart server"
          );
        } else {
          setError(`⚠️ OCR ล้มเหลว: ${errBody?.message || errBody?.error || "Unknown error"}`);
        }
      }

      // PDF or OCR unavailable — show manual form pre-filled with defaults
      setFormData({
        exchange: assetType === "CRYPTO" ? "bitkub" : "set",
        assetType,
        type: "BUY",
        coinSymbol: "",
        amount: 0,
        price: 0,
        totalValue: 0,
        currency: "THB",
        txDate: new Date().toISOString(),
        confidence: 0,
      });
      setRawInputs({ amount: "", price: "", totalValue: "" });
      setState("review");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to process file");
      setState("error");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/webp": [],
      "application/pdf": [],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handleSave = async () => {
    if (!formData) return;

    // Validate required fields before saving
    if (!formData.coinSymbol.trim()) {
      setError("กรุณาระบุ Coin Symbol เช่น BTC, ETH, KUB");
      return;
    }

    setState("saving");
    setError("");

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          coinSymbol: formData.coinSymbol.trim().toUpperCase(),
          assetType: formData.assetType ?? "CRYPTO",
          slipImageUrl: imageUrl || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save transaction");
      }

      const { transaction } = await res.json();
      setState("done");
      onSuccess?.(transaction);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setState("review");
    }
  };

  const reset = () => {
    setState("idle");
    setError("");
    setPreview(null);
    setImageUrl("");
    setParsedData(null);
    setFormData(null);
    setAssetType("CRYPTO");
    setRawInputs({ amount: "", price: "", totalValue: "" });
  };

  const updateForm = (field: keyof ParsedData, value: string | number) => {
    setFormData((prev) => prev ? { ...prev, [field]: value } : null);
  };

  if (state === "done") {
    return (
      <div className="text-center py-12">
        <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Transaction Saved!</h3>
        <p className="text-gray-400 mb-6">Your slip has been processed and added to your portfolio.</p>
        <button
          onClick={reset}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl transition-colors"
        >
          Upload Another Slip
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      {(state === "idle" || state === "error") && (
        <>
          {/* Asset Type Selector */}
          <div>
            <p className="text-xs text-gray-400 mb-2">ประเภทสินทรัพย์</p>
            <div className="flex gap-2">
              {(["CRYPTO", "STOCK"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAssetType(t)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                    assetType === t
                      ? t === "CRYPTO"
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-emerald-600 border-emerald-500 text-white"
                      : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {t === "CRYPTO" ? "🪙 Crypto" : "📈 หุ้น (Stock)"}
                </button>
              ))}
            </div>
          </div>

          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
              ${isDragActive
                ? "border-blue-500 bg-blue-950/30"
                : "border-gray-700 hover:border-gray-500 hover:bg-gray-800/30"
              }
            `}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-white font-medium mb-1">
              {isDragActive ? "Drop your slip here" : "อัปโหลดสลิป"}
            </p>
            <p className="text-gray-500 text-sm">
              {assetType === "CRYPTO"
                ? "สลิปจาก Bitkub / Binance TH / Binance"
                : "สลิปจากโบรกเกอร์ไทย / US Stocks"}
            </p>
            <p className="text-gray-600 text-xs mt-2">
              JPG, PNG, WebP, PDF — max 10MB
            </p>
          </div>

          <div className="text-center">
            <span className="text-gray-600 text-xs">หรือ</span>
            <button
              type="button"
              onClick={() => {
                setFormData({
                  exchange: assetType === "CRYPTO" ? "bitkub" : "set",
                  assetType,
                  type: "BUY",
                  coinSymbol: "",
                  amount: 0,
                  price: 0,
                  totalValue: 0,
                  currency: "THB",
                  txDate: new Date().toISOString(),
                  confidence: 0,
                });
                setRawInputs({ amount: "", price: "", totalValue: "" });
                setState("review");
              }}
              className="ml-2 text-xs text-blue-400 hover:text-blue-300 underline"
            >
              กรอกข้อมูลเอง
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-950 border border-red-800 text-red-400 px-4 py-3 rounded-lg">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </>
      )}

      {/* Loading States */}
      {(state === "uploading" || state === "ocr") && (
        <div className="flex flex-col items-center py-12 gap-4">
          <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
          <div className="text-center">
            <p className="text-white font-medium">
              {state === "uploading" ? "Uploading slip..." : "AI reading slip..."}
            </p>
            <p className="text-gray-500 text-sm mt-1">
              {state === "ocr" && "Claude Vision is extracting transaction details"}
            </p>
          </div>
          {preview && (
            <img src={preview} alt="Preview" className="max-h-48 rounded-lg border border-gray-700 mt-2" />
          )}
        </div>
      )}

      {/* Review Form */}
      {(state === "review" || state === "saving") && formData && (
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            {preview ? (
              <img src={preview} alt="Slip" className="w-32 h-32 object-cover rounded-xl border border-gray-700 flex-shrink-0" />
            ) : (
              <div className="w-32 h-32 bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-center flex-shrink-0">
                <ImageIcon className="h-8 w-8 text-gray-600" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Edit3 className="h-4 w-4 text-blue-400" />
                <h3 className="font-semibold text-white">Review & Confirm</h3>
              </div>
              {parsedData && (
                <p className="text-sm text-gray-400">
                  AI Confidence:{" "}
                  <span className={parsedData.confidence >= 0.8 ? "text-green-400" : "text-yellow-400"}>
                    {Math.round(parsedData.confidence * 100)}%
                  </span>
                  {parsedData.confidence < 0.8 && " — Please verify carefully"}
                </p>
              )}
              {!parsedData && (
                <p className="text-sm text-yellow-400">
                  Could not read slip automatically. Please fill in manually.
                </p>
              )}
            </div>
            <button onClick={reset} className="text-gray-500 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Asset Type */}
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-400 mb-1">ประเภทสินทรัพย์</label>
              <div className="flex gap-2">
                {(["CRYPTO", "STOCK"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setAssetType(t);
                      updateForm("assetType", t);
                      updateForm("exchange", t === "CRYPTO" ? "bitkub" : "set");
                    }}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                      assetType === t
                        ? t === "CRYPTO"
                          ? "bg-blue-600 text-white"
                          : "bg-emerald-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    {t === "CRYPTO" ? "🪙 Crypto" : "📈 หุ้น (Stock)"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Exchange / โบรกเกอร์</label>
              <select
                value={formData.exchange}
                onChange={(e) => updateForm("exchange", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {formData.assetType === "CRYPTO" ? (
                  <>
                    <option value="bitkub">Bitkub</option>
                    <option value="binanceth">Binance TH</option>
                    <option value="binance">Binance</option>
                  </>
                ) : (
                  <>
                    <optgroup label="ตลาดหุ้นไทย (SET)">
                      <option value="set">SET (ตรง)</option>
                      <option value="ktbst">KTBST</option>
                      <option value="mbket">MBKet</option>
                      <option value="kasikorn">Kasikorn (KKPS)</option>
                      <option value="kgi">KGI</option>
                      <option value="tisco">TISCO</option>
                      <option value="scbs">SCB Securities</option>
                      <option value="uob">UOB Kay Hian</option>
                      <option value="mai">MAI</option>
                    </optgroup>
                    <optgroup label="ตลาดหุ้นต่างประเทศ">
                      <option value="nyse">NYSE (US)</option>
                      <option value="nasdaq">NASDAQ (US)</option>
                      <option value="hkex">HKEX (Hong Kong)</option>
                      <option value="sgx">SGX (Singapore)</option>
                    </optgroup>
                  </>
                )}
              </select>
            </div>

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

            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Coin Symbol <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.coinSymbol}
                onChange={(e) => updateForm("coinSymbol", e.target.value.toUpperCase())}
                placeholder="เช่น BTC, ETH, KUB"
                className={`w-full bg-gray-800 border text-white px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase ${
                  !formData.coinSymbol ? "border-red-600" : "border-gray-700"
                }`}
              />
              {!formData.coinSymbol && (
                <p className="text-xs text-red-400 mt-1">จำเป็นต้องระบุ</p>
              )}
            </div>

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

            <div>
              <label className="block text-xs text-gray-400 mb-1">Amount (crypto)</label>
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
                step="any"
                placeholder="0.000000001"
                className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Price per unit</label>
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
                step="any"
                placeholder="2000000"
                className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Total Value</label>
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
                step="any"
                placeholder="2000"
                className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Transaction Date</label>
              <input
                type="datetime-local"
                value={formData.txDate
                  ? format(new Date(formData.txDate), "yyyy-MM-dd'T'HH:mm")
                  : ""}
                onChange={(e) =>
                  updateForm("txDate", new Date(e.target.value).toISOString())
                }
                className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              onClick={handleSave}
              disabled={state === "saving"}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {state === "saving" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Confirm & Save
                </>
              )}
            </button>
            <button
              onClick={reset}
              disabled={state === "saving"}
              className="px-6 py-3 border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
