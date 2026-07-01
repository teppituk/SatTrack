import crypto from "crypto";
import type { ExchangeConnector, NormalizedTrade, TestResult } from "./types";

// Binance-family API (Global + Binance TH) — auth ด้วย HMAC-SHA256 บน query string
// header: X-MBX-APIKEY · query มี timestamp + signature
// ต่างกันแค่ base URL / path เวอร์ชัน / คู่เทรดที่รองรับ → ใช้ config เดียวกันสร้าง connector
interface BinanceVariant {
  code: string;
  name: string;
  base: string;
  paths: { time: string; account: string; trades: string };
  // quote asset ของคู่ BTC ที่จะสแกน (USD-stablecoin → currency "USD", THB → currency "THB")
  quotes: string[];
}

// USD-stablecoin quote (≈ 1 USD) → เก็บเป็น currency "USD"
const USD_QUOTES = new Set(["USDT", "USDC", "FDUSD", "TUSD", "BUSD", "DAI"]);

function quoteCurrency(quote: string): string {
  return quote === "THB" ? "THB" : "USD";
}

function signQuery(secret: string, qs: string): string {
  return crypto.createHmac("sha256", secret).update(qs).digest("hex");
}

async function serverTime(base: string, timePath: string): Promise<number> {
  try {
    const r = await fetch(`${base}${timePath}`, { cache: "no-store" });
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
  base: string,
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
  const r = await fetch(`${base}${path}?${qs}&signature=${sig}`, {
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
export function normalizeBinanceTrade(
  symbol: string,
  t: BinanceTrade,
  opts: { idPrefix: string; currency: string }
): NormalizedTrade | null {
  const amount = Number(t.qty);
  const price = Number(t.price);
  const totalValue = Number(t.quoteQty) || amount * price;
  if (!(amount > 0) || !(price > 0)) return null;
  return {
    externalId: `${opts.idPrefix}-${symbol}-${t.id}`,
    type: t.isBuyer ? "BUY" : "SELL",
    amount,
    price,
    totalValue,
    currency: opts.currency,
    txDate: new Date(t.time),
  };
}

function errMsg(d: { code?: number; msg?: string }, fallback: string): string {
  if (d?.msg) return `${d.msg}${d.code ? ` (${d.code})` : ""}`;
  return fallback;
}

function createBinanceConnector(v: BinanceVariant): ExchangeConnector {
  const fail = `${v.name} request failed`;
  return {
    code: v.code,
    name: v.name,

    async testConnection(apiKey, apiSecret): Promise<TestResult> {
      try {
        const ts = await serverTime(v.base, v.paths.time);
        const res = await signedGet(v.base, apiKey, apiSecret, v.paths.account, {}, ts);
        if (res.ok) return { ok: true };
        return { ok: false, error: errMsg(res.data as { code?: number; msg?: string }, fail) };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Connection failed" };
      }
    },

    async fetchBtcTrades(apiKey, apiSecret): Promise<NormalizedTrade[]> {
      const out: NormalizedTrade[] = [];
      const ts = await serverTime(v.base, v.paths.time);

      for (const quote of v.quotes) {
        const symbol = `BTC${quote}`;
        const res = await signedGet<BinanceTrade[]>(
          v.base,
          apiKey,
          apiSecret,
          v.paths.trades,
          { symbol, limit: 1000 },
          ts
        );
        if (!res.ok) {
          const d = res.data as { code?: number; msg?: string };
          // -1121 = Invalid symbol (คู่นี้ไม่มี/ถูก delist) → ข้าม
          if (d?.code === -1121) continue;
          throw new Error(errMsg(d, fail));
        }
        const trades = (res.data as BinanceTrade[]) ?? [];
        for (const t of trades) {
          const norm = normalizeBinanceTrade(symbol, t, {
            idPrefix: v.code,
            currency: quoteCurrency(quote),
          });
          if (norm) out.push(norm);
        }
      }
      return out;
    },
  };
}

// Binance Global — คู่ BTC quote เป็น USD-stablecoin เท่านั้น
export const binanceConnector = createBinanceConnector({
  code: "binance",
  name: "Binance",
  base: "https://api.binance.com",
  paths: { time: "/api/v3/time", account: "/api/v3/account", trades: "/api/v3/myTrades" },
  quotes: [...USD_QUOTES],
});

// Binance TH (binance.th) — auth เหมือน Global แต่ endpoint เป็น /api/v1 และมีคู่ BTC/THB
export const binanceThConnector = createBinanceConnector({
  code: "binanceth",
  name: "Binance TH",
  base: "https://api.binance.th",
  paths: { time: "/api/v1/time", account: "/api/v1/accountV2", trades: "/api/v1/userTrades" },
  quotes: ["THB", "USDT", "USDC", "FDUSD"],
});
