"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, X, Check, Building2 } from "lucide-react";

interface Exchange {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

function ActiveToggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 cursor-pointer ${
        enabled ? "bg-purple-600" : "bg-gray-700"
      }`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow ${
          enabled ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function ExchangeModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/exchanges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to create");
        return;
      }
      onSave();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">เพิ่ม Exchange ใหม่</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Code (ชื่อระบบ)</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toLowerCase().replace(/\s+/g, ""))}
              placeholder="เช่น okx, bybit, kraken"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
            <p className="text-xs text-gray-600 mt-1">ตัวพิมพ์เล็ก ไม่มีช่องว่าง (ใช้เก็บในธุรกรรม)</p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Name (ชื่อแสดงผล)</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น OKX, Bybit"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {saving ? "Saving..." : (<><Check className="h-4 w-4" />เพิ่ม Exchange</>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminExchangesPage() {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const fetchExchanges = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/exchanges");
      if (res.ok) {
        const data = await res.json();
        setExchanges(data.exchanges);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExchanges();
  }, [fetchExchanges]);

  async function toggleActive(ex: Exchange, isActive: boolean) {
    setBusy(ex.id);
    try {
      const res = await fetch(`/api/admin/exchanges/${ex.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (res.ok) {
        setExchanges((prev) => prev.map((e) => (e.id === ex.id ? { ...e, isActive } : e)));
      }
    } finally {
      setBusy(null);
    }
  }

  async function deleteExchange(ex: Exchange) {
    if (!confirm(`ลบ exchange "${ex.name}" ออก?`)) return;
    setBusy(ex.id);
    try {
      const res = await fetch(`/api/admin/exchanges/${ex.id}`, { method: "DELETE" });
      if (res.ok) {
        setExchanges((prev) => prev.filter((e) => e.id !== ex.id));
      } else {
        const d = await res.json();
        alert(d.error ?? "Failed to delete");
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {modalOpen && (
        <ExchangeModal
          onClose={() => setModalOpen(false)}
          onSave={() => {
            setModalOpen(false);
            fetchExchanges();
          }}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Exchange Management</h1>
          <p className="text-gray-400 text-sm mt-1">
            จัดการรายชื่อ Exchange ที่จะให้เลือกในหน้า Stack Bitcoin
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          เพิ่ม Exchange
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading...</div>
      ) : (
        <div className="grid gap-3">
          {exchanges.map((ex) => (
            <div
              key={ex.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-purple-400 flex-shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{ex.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">
                      {ex.code}
                    </span>
                    {!ex.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-400">
                        ปิดใช้งาน
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">แสดงให้เลือก</span>
                  <ActiveToggle
                    enabled={ex.isActive}
                    onChange={(v) => toggleActive(ex, v)}
                  />
                </div>
                <button
                  onClick={() => deleteExchange(ex)}
                  disabled={busy === ex.id}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-950/30 transition-colors disabled:opacity-40"
                  title="Delete exchange"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {exchanges.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              ยังไม่มี exchange — กดปุ่ม &quot;เพิ่ม Exchange&quot; ด้านบน
            </div>
          )}
        </div>
      )}
    </div>
  );
}
