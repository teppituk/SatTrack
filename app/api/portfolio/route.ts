import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface AssetHolding {
  symbol: string;
  name: string;
  assetType: string;
  coingeckoId: string | null;
  totalBought: number;
  totalSold: number;
  netAmount: number;
  avgBuyPrice: number;
  totalCost: number;
  currentPrice: number;
  currentValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  allocation: number;
  currency: string;
}

// ─── USD/THB Rate ──────────────────────────────────────────────
async function fetchUsdThbRate(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=thb",
      { next: { revalidate: 60 } }
    );
    if (res.ok) {
      const d = await res.json();
      return d?.tether?.thb ?? 35;
    }
  } catch { /* ignore */ }
  return 35;
}

// ─── Yahoo Finance: ราคาหุ้น ───────────────────────────────────
const SET_EXCHANGES = new Set(["set", "mai", "ktbst", "mbket", "kasikorn", "kgi", "tisco", "uob", "scbs"]);
const US_EXCHANGES  = new Set(["nyse", "nasdaq"]);
const GLOBAL_EXCHANGES = new Set(["hkex", "sgx"]);

function getYahooSymbol(symbol: string, exchange: string): string | null {
  const ex = exchange.toLowerCase();
  if (SET_EXCHANGES.has(ex)) return `${symbol.toUpperCase()}.BK`;
  if (US_EXCHANGES.has(ex))  return symbol.toUpperCase();
  if (ex === "hkex")         return `${symbol}.HK`;
  if (ex === "sgx")          return `${symbol}.SI`;
  return null;
}

async function fetchStockPricesTHB(
  stocks: Array<{ symbol: string; exchange: string }>,
  usdThbRate: number
): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};

  await Promise.all(
    stocks.map(async ({ symbol, exchange }) => {
      const yahooSymbol = getYahooSymbol(symbol, exchange);
      if (!yahooSymbol) return;
      try {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`,
          {
            headers: { "User-Agent": "Mozilla/5.0" },
            next: { revalidate: 60 },
          }
        );
        if (!res.ok) return;
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (!meta) return;

        const price: number = meta.regularMarketPrice ?? meta.previousClose ?? 0;
        const quoteCurrency: string = (meta.currency ?? "THB").toUpperCase();

        // แปลงเป็น THB
        if (quoteCurrency === "THB") {
          prices[symbol] = price;
        } else if (quoteCurrency === "USD") {
          prices[symbol] = price * usdThbRate;
        } else {
          prices[symbol] = price; // ไม่รู้ currency ใช้ raw price
        }
      } catch { /* ignore */ }
    })
  );

  return prices;
}

// ─── CoinGecko: ราคา Crypto ───────────────────────────────────
const CRYPTO_SYMBOL_TO_ID: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", BNB: "binancecoin", SOL: "solana",
  ADA: "cardano", DOT: "polkadot", MATIC: "matic-network", POL: "matic-network",
  LINK: "chainlink", UNI: "uniswap", AVAX: "avalanche-2", XRP: "ripple",
  LTC: "litecoin", DOGE: "dogecoin", SHIB: "shiba-inu", TRX: "tron",
  TON: "the-open-network", SUI: "sui", PEPE: "pepe", KUB: "bitkub-coin",
  NEAR: "near", OP: "optimism", ARB: "arbitrum", WLD: "worldcoin-wld",
  ATOM: "cosmos", FIL: "filecoin", APT: "aptos", INJ: "injective-protocol",
};
const STABLECOINS = new Set(["USDT", "USDC", "BUSD", "DAI"]);

async function fetchCryptoPricesTHB(symbols: string[], usdThbRate: number): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};

  // Stablecoins
  symbols.forEach((s) => {
    if (STABLECOINS.has(s.toUpperCase())) prices[s] = usdThbRate;
  });

  const ids = symbols
    .map((s) => CRYPTO_SYMBOL_TO_ID[s.toUpperCase()])
    .filter(Boolean);
  if (ids.length === 0) return prices;

  try {
    const apiKey = process.env.COINGECKO_API_KEY;
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=thb${apiKey ? `&x_cg_demo_api_key=${apiKey}` : ""}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (res.ok) {
      const data = await res.json();
      symbols.forEach((symbol) => {
        const id = CRYPTO_SYMBOL_TO_ID[symbol.toUpperCase()];
        if (id && data[id]?.thb) prices[symbol] = data[id].thb;
      });
    }
  } catch (e) {
    console.error("CoinGecko error:", e);
  }

  return prices;
}

// ─── Main Handler ───────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const currency = searchParams.get("currency") || "THB";

  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: session.user.id },
      include: { coin: true },
      orderBy: { txDate: "asc" },
    });

    // Group by symbol
    const holdingsMap = new Map<string, {
      symbol: string;
      name: string;
      assetType: string;
      coingeckoId: string | null;
      exchange: string;
      txCurrency: string;
      buyTx: Array<{ amount: number; price: number; totalValue: number }>;
      sellTx: Array<{ amount: number; price: number; totalValue: number }>;
    }>();

    for (const tx of transactions) {
      const symbol = tx.coin.symbol;
      if (!holdingsMap.has(symbol)) {
        holdingsMap.set(symbol, {
          symbol,
          name: tx.coin.name,
          assetType: tx.coin.assetType,
          coingeckoId: tx.coin.coingeckoId,
          exchange: tx.exchange,
          txCurrency: tx.currency,
          buyTx: [],
          sellTx: [],
        });
      }
      const h = holdingsMap.get(symbol)!;
      if (tx.type === "BUY") {
        h.buyTx.push({ amount: tx.amount, price: tx.price, totalValue: tx.totalValue });
      } else {
        h.sellTx.push({ amount: tx.amount, price: tx.price, totalValue: tx.totalValue });
      }
    }

    // Split crypto vs stocks
    const cryptoSymbols: string[] = [];
    const stockEntries: Array<{ symbol: string; exchange: string }> = [];

    holdingsMap.forEach((h) => {
      if (h.assetType === "STOCK") {
        stockEntries.push({ symbol: h.symbol, exchange: h.exchange });
      } else {
        cryptoSymbols.push(h.symbol);
      }
    });

    // Fetch USD/THB once, share across both fetchers
    const usdThbRate = await fetchUsdThbRate();

    const [cryptoPrices, stockPrices] = await Promise.all([
      cryptoSymbols.length > 0 ? fetchCryptoPricesTHB(cryptoSymbols, usdThbRate) : Promise.resolve({}),
      stockEntries.length > 0  ? fetchStockPricesTHB(stockEntries, usdThbRate)   : Promise.resolve({}),
    ]);

    const allPrices: Record<string, number> = { ...cryptoPrices, ...stockPrices };

    // Calculate holdings
    const holdings: AssetHolding[] = [];
    let totalPortfolioValue = 0;

    for (const [symbol, data] of holdingsMap.entries()) {
      const totalBought = data.buyTx.reduce((s, t) => s + t.amount, 0);
      const totalSold   = data.sellTx.reduce((s, t) => s + t.amount, 0);
      const netAmount   = totalBought - totalSold;
      if (netAmount <= 0) continue;

      const totalCost    = data.buyTx.reduce((s, t) => s + t.totalValue, 0);
      const avgBuyPrice  = totalBought > 0 ? totalCost / totalBought : 0;
      // สำหรับ US stocks: totalCost อาจเป็น USD → แปลงเป็น THB
      const isUsdAsset = data.txCurrency === "USD";
      const totalCostTHB   = isUsdAsset ? totalCost   * usdThbRate : totalCost;
      const avgBuyPriceTHB = isUsdAsset ? avgBuyPrice * usdThbRate : avgBuyPrice;

      // ใช้ราคาซื้อเป็น fallback ถ้าดึงราคาปัจจุบันไม่ได้
      const fetchedPrice = allPrices[symbol];
      const currentPrice = fetchedPrice != null && fetchedPrice > 0
        ? fetchedPrice
        : avgBuyPriceTHB;

      const currentValue     = netAmount * currentPrice;
      const costBasisForHeld = netAmount * avgBuyPriceTHB;
      const unrealizedPnl   = currentValue - costBasisForHeld;
      const unrealizedPnlPercent = costBasisForHeld > 0
        ? (unrealizedPnl / costBasisForHeld) * 100
        : 0;

      totalPortfolioValue += currentValue;

      holdings.push({
        symbol,
        name: data.name,
        assetType: data.assetType,
        coingeckoId: data.coingeckoId,
        totalBought,
        totalSold,
        netAmount,
        avgBuyPrice: avgBuyPriceTHB,
        totalCost: totalCostTHB,
        currentPrice,
        currentValue,
        unrealizedPnl,
        unrealizedPnlPercent,
        allocation: 0,
        currency: "THB",
      });
    }

    // Allocation %
    holdings.forEach((h) => {
      h.allocation = totalPortfolioValue > 0
        ? (h.currentValue / totalPortfolioValue) * 100
        : 0;
    });

    holdings.sort((a, b) => b.currentValue - a.currentValue);

    // Realized P&L
    let totalRealizedPnl = 0;
    for (const [, data] of holdingsMap.entries()) {
      const totalBought = data.buyTx.reduce((s, t) => s + t.amount, 0);
      const totalCost   = data.buyTx.reduce((s, t) => s + t.totalValue, 0);
      const avgBuyPrice = totalBought > 0 ? totalCost / totalBought : 0;
      const isUsdAsset  = data.txCurrency === "USD";

      for (const sell of data.sellTx) {
        const costBasis = sell.amount * (isUsdAsset ? avgBuyPrice * usdThbRate : avgBuyPrice);
        const sellValueTHB = isUsdAsset ? sell.totalValue * usdThbRate : sell.totalValue;
        totalRealizedPnl += sellValueTHB - costBasis;
      }
    }

    const totalUnrealizedPnl = holdings.reduce((s, h) => s + h.unrealizedPnl, 0);
    const totalInvested       = holdings.reduce((s, h) => s + h.totalCost, 0);

    // ราคา BTC ปัจจุบัน (แสดงบน dashboard เสมอ ไม่ว่าจะถือ BTC หรือไม่)
    const btcPriceThb =
      allPrices["BTC"] ?? (await fetchCryptoPricesTHB(["BTC"], usdThbRate))["BTC"] ?? 0;

    // ทุกค่าด้านบนคำนวณเป็น THB — แปลงเป็นสกุลที่เลือก (USDT/USD ≈ หาร USD/THB rate)
    const isUsdt = currency.toUpperCase() === "USDT" || currency.toUpperCase() === "USD";
    const convert = (thb: number) => (isUsdt ? thb / usdThbRate : thb);

    return NextResponse.json({
      holdings: holdings.map((h) => ({
        ...h,
        avgBuyPrice: convert(h.avgBuyPrice),
        totalCost: convert(h.totalCost),
        currentPrice: convert(h.currentPrice),
        currentValue: convert(h.currentValue),
        unrealizedPnl: convert(h.unrealizedPnl),
        currency,
      })),
      summary: {
        totalPortfolioValue: convert(totalPortfolioValue),
        totalInvested: convert(totalInvested),
        totalUnrealizedPnl: convert(totalUnrealizedPnl),
        totalRealizedPnl: convert(totalRealizedPnl),
        totalPnl: convert(totalUnrealizedPnl + totalRealizedPnl),
        btcPrice: convert(btcPriceThb),
        usdThbRate,
        currency,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Portfolio error:", error);
    return NextResponse.json({ error: "Failed to calculate portfolio" }, { status: 500 });
  }
}
