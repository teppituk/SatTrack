import { prisma } from "@/lib/prisma";

export interface ShareConfig {
  showCostBasis: boolean;
  showPnl: boolean;
  showTransactions: boolean;
  // โหมดความเป็นส่วนตัว — ซ่อนจำนวนเงิน/จำนวน BTC จริง โชว์เฉพาะ %
  privacyMode: boolean;
}

export const defaultShareConfig: ShareConfig = {
  showCostBasis: true,
  showPnl: true,
  showTransactions: false,
  privacyMode: false,
};

export function parseShareConfig(raw: unknown): ShareConfig {
  const c = (raw ?? {}) as Partial<ShareConfig>;
  return {
    showCostBasis: c.showCostBasis ?? true,
    showPnl: c.showPnl ?? true,
    showTransactions: c.showTransactions ?? false,
    privacyMode: c.privacyMode ?? false,
  };
}

const SYMBOL_TO_ID: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
  ADA: "cardano",
};

export async function fetchPrices(
  symbols: string[]
): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};
  try {
    const ids = symbols.map((s) => SYMBOL_TO_ID[s.toUpperCase()]).filter(Boolean);
    if (ids.length === 0) return prices;
    const apiKey = process.env.COINGECKO_API_KEY;
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(
        ","
      )}&vs_currencies=thb${apiKey ? `&x_cg_demo_api_key=${apiKey}` : ""}`,
      { next: { revalidate: 60 } }
    );
    if (res.ok) {
      const data = await res.json();
      symbols.forEach((sym) => {
        const id = SYMBOL_TO_ID[sym.toUpperCase()];
        if (id && data[id]) prices[sym] = data[id].thb || 0;
      });
    }
  } catch {}
  return prices;
}

export interface Holding {
  symbol: string;
  name: string;
  amount: number;
  totalCost: number;
  currentPrice: number;
  currentValue: number;
  avgCost: number;
  pnl: number;
  pnlPercent: number;
}

interface Tx {
  type: string;
  amount: number;
  totalValue: number;
  currency: string;
  txDate: Date;
  coin: { symbol: string; name: string };
}

// ราคา BTC ย้อนหลัง (THB) สำหรับกราฟในหน้า share — ล้มเหลว/rate-limit → คืน [] (กราฟ fallback ใช้ราคาธุรกรรม)
export async function fetchBtcHistoryThb(
  days: number
): Promise<Array<{ t: number; p: number }>> {
  try {
    const key = process.env.COINGECKO_API_KEY;
    const d = Math.min(Math.max(Math.round(days), 1), 3650);
    const r = await fetch(
      `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=thb&days=${d}${
        key ? `&x_cg_demo_api_key=${key}` : ""
      }`,
      { next: { revalidate: 3600 } }
    );
    if (!r.ok) return [];
    const data = await r.json();
    return (data.prices || []).map((pt: [number, number]) => ({
      t: pt[0],
      p: pt[1],
    }));
  } catch {
    return [];
  }
}

// อัตรา USD→THB (เสถียร: derive จากราคา BTC Bitkub/Binance → fallback CoinGecko → ค่าคงที่)
export async function fetchUsdThbRate(): Promise<number> {
  try {
    const [bk, bn] = await Promise.all([
      fetch("https://api.bitkub.com/api/market/ticker", { next: { revalidate: 300 } })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT", {
        next: { revalidate: 300 },
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]);
    const thb = Number(bk?.THB_BTC?.last) || 0;
    const usd = Number(bn?.price) || 0;
    if (thb && usd) return thb / usd;
  } catch {}
  try {
    const key = process.env.COINGECKO_API_KEY;
    const r = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=thb${
        key ? `&x_cg_demo_api_key=${key}` : ""
      }`,
      { next: { revalidate: 300 } }
    );
    if (r.ok) {
      const d = await r.json();
      const v = Number(d?.tether?.thb) || 0;
      if (v) return v;
    }
  } catch {}
  return 36; // last resort
}

export interface StackBadge {
  emoji: string;
  label: string;
}

export interface StackStats {
  holdings: Holding[];
  totalValue: number;
  totalInvested: number;
  totalPnl: number;
  totalPnlPercent: number;
  btcAmount: number;
  satsStacked: number;
  avgBtcCost: number;
  buyCount: number;
  sellCount: number;
  firstTxDate: Date | null;
  monthsStacking: number;
  badges: StackBadge[];
}

export async function computeStats(transactions: Tx[]): Promise<StackStats> {
  const map = new Map<
    string,
    { symbol: string; name: string; amount: number; totalCost: number }
  >();
  let buyCount = 0;
  let sellCount = 0;
  let firstTxDate: Date | null = null;

  // แปลงทุกธุรกรรมเป็น THB (หน้า share แสดงเป็นบาท) — ธุรกรรม USD/USDT ต้องคูณ rate
  const usdThbRate = await fetchUsdThbRate();
  const toThb = (val: number, currency: string) =>
    currency === "THB" ? val : val * usdThbRate;

  for (const tx of transactions) {
    const sym = tx.coin.symbol;
    if (!map.has(sym)) {
      map.set(sym, { symbol: sym, name: tx.coin.name, amount: 0, totalCost: 0 });
    }
    const h = map.get(sym)!;
    if (tx.type === "BUY") {
      h.amount += tx.amount;
      h.totalCost += toThb(tx.totalValue, tx.currency);
      buyCount++;
    } else {
      h.amount -= tx.amount;
      sellCount++;
    }
    const d = new Date(tx.txDate);
    if (!firstTxDate || d < firstTxDate) firstTxDate = d;
  }

  const symbols = Array.from(map.keys());
  const prices = await fetchPrices(symbols);

  const holdings: Holding[] = Array.from(map.values())
    .filter((h) => h.amount > 0)
    .map((h) => {
      const currentPrice = prices[h.symbol] || 0;
      const currentValue = h.amount * currentPrice;
      const avgCost = h.totalCost / h.amount;
      const pnl = currentValue - h.totalCost;
      const pnlPercent = h.totalCost > 0 ? (pnl / h.totalCost) * 100 : 0;
      return { ...h, currentPrice, currentValue, avgCost, pnl, pnlPercent };
    })
    .sort((a, b) => b.currentValue - a.currentValue);

  const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  const totalInvested = holdings.reduce((s, h) => s + h.totalCost, 0);
  const totalPnl = holdings.reduce((s, h) => s + h.pnl, 0);
  const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  const btc = holdings.find((h) => h.symbol.toUpperCase() === "BTC");
  const btcAmount = btc?.amount ?? 0;
  const satsStacked = Math.round(btcAmount * 1e8);
  const avgBtcCost = btc?.avgCost ?? 0;

  const now = Date.now();
  const monthsStacking = firstTxDate
    ? Math.max(0, (now - firstTxDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
    : 0;

  const badges: StackBadge[] = [];
  if (btcAmount >= 1) badges.push({ emoji: "🟧", label: "Whole Coiner" });
  else if (btcAmount >= 0.1) badges.push({ emoji: "🔶", label: "0.1 BTC Club" });
  if (sellCount === 0 && buyCount > 0) badges.push({ emoji: "💎", label: "Diamond Hands" });
  if (buyCount >= 5) badges.push({ emoji: "📈", label: "DCA Stacker" });
  if (monthsStacking >= 12) badges.push({ emoji: "🏆", label: `HODL ${Math.floor(monthsStacking / 12)}y+` });
  else if (monthsStacking >= 1) badges.push({ emoji: "⏳", label: `${Math.floor(monthsStacking)}mo stacking` });
  if (totalPnlPercent >= 100) badges.push({ emoji: "🚀", label: "2x+" });

  return {
    holdings,
    totalValue,
    totalInvested,
    totalPnl,
    totalPnlPercent,
    btcAmount,
    satsStacked,
    avgBtcCost,
    buyCount,
    sellCount,
    firstTxDate,
    monthsStacking,
    badges,
  };
}

export async function loadShare(token: string) {
  const shareLink = await prisma.shareLink.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          transactions: { include: { coin: true }, orderBy: { txDate: "desc" } },
        },
      },
    },
  });
  if (!shareLink) return null;
  if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
    return { expired: true as const };
  }
  return shareLink;
}
