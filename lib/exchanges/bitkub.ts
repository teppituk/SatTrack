import crypto from "crypto";
import type { ExchangeConnector, NormalizedTrade, TestResult } from "./types";

// Bitkub API v3 — auth ด้วย HMAC-SHA256
// signature = HMAC(secret, `${ts}${METHOD}${path}${body}`) hex
// headers: X-BTK-APIKEY, X-BTK-TIMESTAMP, X-BTK-SIGN
const BASE = "https://api.bitkub.com";
const SYMBOL = "btc_thb";

function sign(secret: string, ts: number, method: string, path: string, body: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`${ts}${method}${path}${body}`)
    .digest("hex");
}

async function serverTime(): Promise<number> {
  try {
    const r = await fetch(`${BASE}/api/v3/servertime`, { cache: "no-store" });
    const t = parseInt(await r.text(), 10);
    return isNaN(t) ? Date.now() : t;
  } catch {
    return Date.now();
  }
}

async function authPost<T>(
  apiKey: string,
  apiSecret: string,
  path: string,
  payload: Record<string, unknown>
): Promise<{ error: number; result?: T }> {
  const ts = await serverTime();
  const body = JSON.stringify(payload);
  const sig = sign(apiSecret, ts, "POST", path, body);
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-BTK-APIKEY": apiKey,
      "X-BTK-TIMESTAMP": String(ts),
      "X-BTK-SIGN": sig,
    },
    body,
    cache: "no-store",
  });
  return (await r.json()) as { error: number; result?: T };
}

// GET ที่ต้องยืนยันตัวตน (เช่น my-order-history) — sign ด้วย method GET + query string
async function authGet<T>(
  apiKey: string,
  apiSecret: string,
  path: string,
  params: Record<string, string | number>
): Promise<{ error: number; result?: T }> {
  const ts = await serverTime();
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
  ).toString();
  const query = qs ? `?${qs}` : "";
  const sig = sign(apiSecret, ts, "GET", path, query); // payload = ts+GET+path+?query
  const r = await fetch(`${BASE}${path}${query}`, {
    method: "GET",
    headers: {
      "X-BTK-APIKEY": apiKey,
      "X-BTK-TIMESTAMP": String(ts),
      "X-BTK-SIGN": sig,
    },
    cache: "no-store",
  });
  return (await r.json()) as { error: number; result?: T };
}

const ERROR_MSG: Record<number, string> = {
  1: "Invalid JSON",
  2: "Missing API key",
  3: "Invalid API key",
  4: "API pending for activation",
  5: "IP not allowed",
  6: "Invalid signature",
  7: "Missing timestamp",
  8: "Invalid timestamp",
};

export interface BitkubOrder {
  txn_id?: string;
  order_id?: number | string;
  hash?: string;
  side: string; // buy | sell
  rate: number | string;
  fee: number | string;
  amount: number | string; // buy: THB spent, sell: BTC amount (Bitkub quirk)
  ts?: number;
  time?: number;
}

// แปลง 1 รายการจาก Bitkub → NormalizedTrade (pure function สำหรับ unit test)
// Bitkub quirk: buy → amount = THB ที่จ่าย, sell → amount = BTC ที่ขาย
export function normalizeBitkubOrder(o: BitkubOrder): NormalizedTrade | null {
  const rate = Number(o.rate);
  const fee = Number(o.fee) || 0;
  const raw = Number(o.amount);
  const isBuy = String(o.side).toLowerCase() === "buy";

  let btc: number;
  let totalThb: number;
  if (isBuy) {
    totalThb = raw;
    btc = rate > 0 ? (raw - fee) / rate : 0;
  } else {
    btc = raw;
    totalThb = raw * rate;
  }
  if (!(btc > 0) || !(rate > 0)) return null;

  const tsMs = Number(o.ts ?? o.time ?? 0);
  const externalId = String(o.txn_id || o.hash || o.order_id || `${o.side}-${tsMs}-${rate}`);

  return {
    externalId,
    type: isBuy ? "BUY" : "SELL",
    amount: btc,
    price: rate,
    totalValue: totalThb,
    currency: "THB",
    txDate: new Date(tsMs || Date.now()),
  };
}

export const bitkubConnector: ExchangeConnector = {
  code: "bitkub",
  name: "Bitkub",

  async testConnection(apiKey, apiSecret): Promise<TestResult> {
    try {
      const res = await authPost(apiKey, apiSecret, "/api/v3/market/balances", {});
      if (res.error === 0) return { ok: true };
      return { ok: false, error: ERROR_MSG[res.error] || `Bitkub error ${res.error}` };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Connection failed" };
    }
  },

  async fetchBtcTrades(apiKey, apiSecret, sinceMs): Promise<NormalizedTrade[]> {
    const out: NormalizedTrade[] = [];
    const lmt = 100;
    // ดึงทีละหน้า สูงสุด 50 หน้า (กันลูปไม่จบ)
    for (let page = 1; page <= 50; page++) {
      const params: Record<string, string | number> = { sym: SYMBOL, p: page, lmt };
      if (sinceMs) params.start = Math.floor(sinceMs / 1000);
      const res = await authGet<BitkubOrder[]>(
        apiKey,
        apiSecret,
        "/api/v3/market/my-order-history",
        params
      );
      if (res.error !== 0) {
        throw new Error(ERROR_MSG[res.error] || `Bitkub error ${res.error}`);
      }
      const list = res.result ?? [];
      if (list.length === 0) break;

      for (const o of list) {
        const norm = normalizeBitkubOrder(o);
        if (norm) out.push(norm);
      }
      if (list.length < lmt) break;
    }
    return out;
  },
};
