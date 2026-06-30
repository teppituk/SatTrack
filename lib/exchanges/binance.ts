import crypto from "crypto";
import type { ExchangeConnector, NormalizedTrade, TestResult } from "./types";

// Binance Global API — auth ด้วย HMAC-SHA256 บน query string
// header: X-MBX-APIKEY · query มี timestamp + signature
const BASE = "https://api.binance.com";

// คู่เทรด BTC ฝั่ง quote ที่เป็น USD-stablecoin (≈ 1 USD) → เก็บเป็น currency "USD"
const BTC_QUOTES = ["USDT", "USDC", "FDUSD", "TUSD", "BUSD", "DAI"];

function signQuery(secret: string, qs: string): string {
  return crypto.createHmac("sha256", secret).update(qs).digest("hex");
}

async function serverTime(): Promise<number> {
  try {
    const r = await fetch(`${BASE}/api/v3/time`, { cache: "no-store" });
    const j = (await r.json()) as { serverTime?: number };
    return j.serverTime ?? Date.now();
  } catch {
    return Date.now();
  }
}

interface SignedResult<T> {
  ok: boolean;
  status: number;
  data: T | { code: number; msg: string };
}

async function signedGet<T>(
  apiKey: string,
  apiSecret: string,
  path: string,
  params: Record<string, string | number>,
  ts: number
): Promise<SignedResult<T>> {
  const sp = new URLSearchParams(
    Object.fromEntries(Object.entries({ ...params, timestamp: ts, recvWindow: 10000 }).map(([k, v]) => [k, String(v)]))
  );
  const qs = sp.toString();
  const sig = signQuery(apiSecret, qs);
  const r = await fetch(`${BASE}${path}?${qs}&signature=${sig}`, {
    method: "GET",
    headers: { "X-MBX-APIKEY": apiKey },
    cache: "no-store",
  });
  const data = (await r.json().catch(() => ({}))) as T | { code: number; msg: string };
  return { ok: r.ok, status: r.status, data };
}

interface BinanceTrade {
  symbol?: string;
  id: number;
  orderId?: number;
  price: string;
  qty: string;
  quoteQty: string;
  commission?: string;
  commissionAsset?: string;
  time: number;
  isBuyer: boolean;
}

// แปลง 1 เทรด Binance → NormalizedTrade (pure function สำหรับ unit test)
export function normalizeBinanceTrade(symbol: string, t: BinanceTrade): NormalizedTrade | null {
  const amount = Number(t.qty);
  const price = Number(t.price);
  const totalValue = Number(t.quoteQty) || amount * price;
  if (!(amount > 0) || !(price > 0)) return null;
  return {
    externalId: `binance-${symbol}-${t.id}`,
    type: t.isBuyer ? "BUY" : "SELL",
    amount,
    price,
    totalValue,
    currency: "USD", // USD-stablecoin quote → dashboard แปลง USD→THB ได้ถูก
    txDate: new Date(t.time),
  };
}

function errMsg(d: { code?: number; msg?: string }): string {
  if (d?.msg) return `${d.msg}${d.code ? ` (${d.code})` : ""}`;
  return "Binance request failed";
}

export const binanceConnector: ExchangeConnector = {
  code: "binance",
  name: "Binance",

  async testConnection(apiKey, apiSecret): Promise<TestResult> {
    try {
      const ts = await serverTime();
      const res = await signedGet(apiKey, apiSecret, "/api/v3/account", {}, ts);
      if (res.ok) return { ok: true };
      return { ok: false, error: errMsg(res.data as { code?: number; msg?: string }) };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Connection failed" };
    }
  },

  async fetchBtcTrades(apiKey, apiSecret): Promise<NormalizedTrade[]> {
    const out: NormalizedTrade[] = [];
    const ts = await serverTime();

    for (const quote of BTC_QUOTES) {
      const symbol = `BTC${quote}`;
      const res = await signedGet<BinanceTrade[]>(
        apiKey,
        apiSecret,
        "/api/v3/myTrades",
        { symbol, limit: 1000 },
        ts
      );
      if (!res.ok) {
        const d = res.data as { code?: number; msg?: string };
        // -1121 = Invalid symbol (คู่นี้ไม่มี/ถูก delist) → ข้าม
        if (d?.code === -1121) continue;
        throw new Error(errMsg(d));
      }
      const trades = (res.data as BinanceTrade[]) ?? [];
      for (const t of trades) {
        const norm = normalizeBinanceTrade(symbol, t);
        if (norm) out.push(norm);
      }
    }
    return out;
  },
};
