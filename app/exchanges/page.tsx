"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/nav";
import { useLocale } from "@/contexts/locale-context";
import {
  Building2,
  Loader2,
  Trash2,
  Check,
  AlertCircle,
  RefreshCw,
  Lock,
  Zap,
} from "lucide-react";

type KeyRow = {
  exchange: string;
  keyHint: string | null;
  label: string | null;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  lastSyncCount: number;
};
type Data = {
  isPaid: boolean;
  encryptionReady: boolean;
  supported: { code: string; name: string }[];
  keys: KeyRow[];
};

const ALL_EXCHANGES = [
  { code: "bitkub", name: "Bitkub" },
  { code: "binanceth", name: "Binance TH" },
  { code: "binance", name: "Binance" },
];

export default function ExchangesPage() {
  const { status } = useSession();
  const router = useRouter();
  const { t } = useLocale();

  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<Record<string, { apiKey: string; apiSecret: string; label: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, { type: "ok" | "err"; text: string }>>({});

  const load = useCallback(async () => {
    const res = await fetch("/api/exchanges/keys");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);
  useEffect(() => {
    if (status === "authenticated") load();
  }, [status, load]);

  const setForm = (code: string, patch: Partial<{ apiKey: string; apiSecret: string; label: string }>) =>
    setForms((f) => {
      const cur = f[code] ?? { apiKey: "", apiSecret: "", label: "" };
      return { ...f, [code]: { ...cur, ...patch } };
    });

  const connect = async (code: string) => {
    const form = forms[code] || { apiKey: "", apiSecret: "", label: "" };
    setBusy(code);
    setMsg((m) => ({ ...m, [code]: undefined as never }));
    try {
      const res = await fetch("/api/exchanges/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exchange: code, ...form }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMsg((m) => ({ ...m, [code]: { type: "err", text: d.error || "Failed" } }));
        return;
      }
      setForm(code, { apiKey: "", apiSecret: "" });
      await load();
    } finally {
      setBusy(null);
    }
  };

  const sync = async (code: string) => {
    setBusy(code);
    setMsg((m) => ({ ...m, [code]: undefined as never }));
    try {
      const res = await fetch("/api/exchanges/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exchange: code }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMsg((m) => ({ ...m, [code]: { type: "err", text: d.error || "Failed" } }));
      } else {
        setMsg((m) => ({
          ...m,
          [code]: {
            type: "ok",
            text: d.imported > 0 ? `+${d.imported} ${t("exchanges.newTrades")}` : t("exchanges.noNew"),
          },
        }));
      }
      await load();
    } finally {
      setBusy(null);
    }
  };

  const remove = async (code: string) => {
    if (!confirm(t("exchanges.removeConfirm"))) return;
    setBusy(code);
    try {
      await fetch(`/api/exchanges/keys/${code}`, { method: "DELETE" });
      await load();
    } finally {
      setBusy(null);
    }
  };

  if (status === "loading" || loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
        </div>
      </AppShell>
    );
  }

  const supportedCodes = new Set((data?.supported ?? []).map((s) => s.code));
  const keyByCode = (c: string) => data?.keys.find((k) => k.exchange === c) || null;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 bg-muted rounded-xl flex items-center justify-center">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("exchanges.title")}</h1>
            <p className="text-muted-foreground text-sm">{t("exchanges.subtitle")}</p>
          </div>
        </div>

        {/* Pro gate */}
        {!data?.isPaid && (
          <div className="bg-yellow-950/30 border border-yellow-800/50 rounded-xl p-5 mb-6">
            <div className="flex items-center gap-2 text-yellow-400 font-semibold mb-1">
              <Lock className="h-4 w-4" />
              {t("exchanges.proTitle")}
            </div>
            <p className="text-sm text-muted-foreground mb-3">{t("exchanges.proDesc")}</p>
            <Link
              href="/settings/subscription"
              className="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-lg text-sm font-bold"
            >
              <Zap className="h-4 w-4" />
              {t("exchanges.upgrade")}
            </Link>
          </div>
        )}

        {data?.isPaid && !data?.encryptionReady && (
          <div className="bg-red-950/40 border border-red-800/50 text-red-400 rounded-xl px-4 py-3 mb-6 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {t("exchanges.encNotReady")}
          </div>
        )}

        <p className="text-xs text-muted-foreground mb-4">{t("exchanges.readOnlyHint")}</p>

        <div className="space-y-4">
          {ALL_EXCHANGES.map((ex) => {
            const isSupported = supportedCodes.has(ex.code);
            const key = keyByCode(ex.code);
            const form = forms[ex.code] || { apiKey: "", apiSecret: "", label: "" };
            const m = msg[ex.code];
            const isBusy = busy === ex.code;
            const disabled = !data?.isPaid || !isSupported;

            return (
              <div key={ex.code} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{ex.name}</span>
                    {!isSupported && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {t("exchanges.comingSoon")}
                      </span>
                    )}
                    {key && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 inline-flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        {t("exchanges.connected")} ••••{key.keyHint}
                      </span>
                    )}
                  </div>
                </div>

                {/* connected → sync/remove */}
                {isSupported && key ? (
                  <div>
                    <div className="text-xs text-muted-foreground mb-3">
                      {t("exchanges.lastSync")}:{" "}
                      {key.lastSyncAt ? new Date(key.lastSyncAt).toLocaleString() : t("exchanges.never")}
                      {key.lastSyncStatus === "ok" && ` · ${key.lastSyncCount} ${t("exchanges.newTrades")}`}
                      {key.lastSyncStatus === "error" && (
                        <span className="text-red-400"> · {t("exchanges.statusError")}: {key.lastSyncError}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => sync(ex.code)}
                        disabled={isBusy || disabled}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-foreground px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        {isBusy ? t("exchanges.syncing") : t("exchanges.syncNow")}
                      </button>
                      <button
                        onClick={() => remove(ex.code)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-2 bg-muted hover:bg-accent text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg text-sm"
                      >
                        <Trash2 className="h-4 w-4" />
                        {t("exchanges.remove")}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* not connected → form */
                  <div className={`space-y-2 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
                    <input
                      type="text"
                      placeholder={t("exchanges.apiKey")}
                      value={form.apiKey}
                      onChange={(e) => setForm(ex.code, { apiKey: e.target.value })}
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="password"
                      placeholder={t("exchanges.apiSecret")}
                      value={form.apiSecret}
                      onChange={(e) => setForm(ex.code, { apiSecret: e.target.value })}
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => connect(ex.code)}
                      disabled={isBusy || disabled || !form.apiKey || !form.apiSecret}
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-foreground px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {isBusy ? t("exchanges.connecting") : t("exchanges.connect")}
                    </button>
                  </div>
                )}

                {m && (
                  <p className={`mt-2 text-xs ${m.type === "ok" ? "text-green-400" : "text-red-400"}`}>
                    {m.text}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
