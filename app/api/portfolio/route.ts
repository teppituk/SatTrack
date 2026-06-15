import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface CoinHolding {
  symbol: string;
  name: string;
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
}

async function fetchCoinPrices(symbols: string[]): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};

  try {
    // Map common symbols to CoinGecko IDs
    const symbolToId: Record<string, string> = {
      BTC: "bitcoin",
      ETH: "ethereum",
      BNB: "binancecoin",
      SOL: "solana",
      ADA: "cardano",
      DOT: "polkadot",
      MATIC: "matic-network",
      LINK: "chainlink",
      UNI: "uniswap",
      AVAX: "avalanche-2",
      XRP: "ripple",
      LTC: "litecoin",
      DOGE: "dogecoin",
    };

    const coinGeckoIds = symbols
      .map((s) => symbolToId[s.toUpperCase()])
      .filter(Boolean);

    if (coinGeckoIds.length === 0) return prices;

    const apiKey = process.env.COINGECKO_API_KEY;
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoIds.join(",")}&vs_currencies=thb,usd${apiKey ? `&x_cg_demo_api_key=${apiKey}` : ""}`;

    const response = await fetch(url, {
      next: { revalidate: 60 }, // cache for 60s
    });

    if (response.ok) {
      const data = await response.json();
      symbols.forEach((symbol) => {
        const id = symbolToId[symbol.toUpperCase()];
        if (id && data[id]) {
          prices[symbol] = data[id].thb || 0;
        }
      });
    }
  } catch (error) {
    console.error("Price fetch error:", error);
  }

  return prices;
}

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

    // Group by coin and calculate holdings
    const holdingsMap = new Map<string, {
      symbol: string;
      name: string;
      coingeckoId: string | null;
      buyTransactions: Array<{ amount: number; price: number; totalValue: number }>;
      sellTransactions: Array<{ amount: number; price: number; totalValue: number }>;
    }>();

    for (const tx of transactions) {
      const symbol = tx.coin.symbol;
      if (!holdingsMap.has(symbol)) {
        holdingsMap.set(symbol, {
          symbol,
          name: tx.coin.name,
          coingeckoId: tx.coin.coingeckoId,
          buyTransactions: [],
          sellTransactions: [],
        });
      }
      const holding = holdingsMap.get(symbol)!;
      if (tx.type === "BUY") {
        holding.buyTransactions.push({
          amount: tx.amount,
          price: tx.price,
          totalValue: tx.totalValue,
        });
      } else {
        holding.sellTransactions.push({
          amount: tx.amount,
          price: tx.price,
          totalValue: tx.totalValue,
        });
      }
    }

    // Fetch current prices
    const symbols = Array.from(holdingsMap.keys());
    const prices = await fetchCoinPrices(symbols);

    const holdings: CoinHolding[] = [];
    let totalPortfolioValue = 0;

    for (const [symbol, data] of holdingsMap.entries()) {
      const totalBought = data.buyTransactions.reduce((sum, t) => sum + t.amount, 0);
      const totalSold = data.sellTransactions.reduce((sum, t) => sum + t.amount, 0);
      const netAmount = totalBought - totalSold;

      if (netAmount <= 0) continue; // Skip fully sold positions

      const totalCost = data.buyTransactions.reduce((sum, t) => sum + t.totalValue, 0);
      const avgBuyPrice = totalBought > 0 ? totalCost / totalBought : 0;

      const currentPrice = prices[symbol] || 0;
      const currentValue = netAmount * currentPrice;
      const costBasisForHeld = netAmount * avgBuyPrice;
      const unrealizedPnl = currentValue - costBasisForHeld;
      const unrealizedPnlPercent = costBasisForHeld > 0
        ? (unrealizedPnl / costBasisForHeld) * 100
        : 0;

      totalPortfolioValue += currentValue;

      holdings.push({
        symbol,
        name: data.name,
        coingeckoId: data.coingeckoId,
        totalBought,
        totalSold,
        netAmount,
        avgBuyPrice,
        totalCost,
        currentPrice,
        currentValue,
        unrealizedPnl,
        unrealizedPnlPercent,
        allocation: 0, // calculated after
      });
    }

    // Calculate allocations
    holdings.forEach((h) => {
      h.allocation = totalPortfolioValue > 0
        ? (h.currentValue / totalPortfolioValue) * 100
        : 0;
    });

    // Sort by value descending
    holdings.sort((a, b) => b.currentValue - a.currentValue);

    // Calculate realized P&L
    let totalRealizedPnl = 0;
    for (const [, data] of holdingsMap.entries()) {
      const avgBuyPrice = data.buyTransactions.reduce((sum, t) => sum + t.totalValue, 0) /
        Math.max(data.buyTransactions.reduce((sum, t) => sum + t.amount, 0), 0.000001);

      for (const sell of data.sellTransactions) {
        const costBasis = sell.amount * avgBuyPrice;
        totalRealizedPnl += sell.totalValue - costBasis;
      }
    }

    const totalUnrealizedPnl = holdings.reduce((sum, h) => sum + h.unrealizedPnl, 0);
    const totalInvested = holdings.reduce((sum, h) => sum + h.totalCost, 0);

    return NextResponse.json({
      holdings,
      summary: {
        totalPortfolioValue,
        totalInvested,
        totalUnrealizedPnl,
        totalRealizedPnl,
        totalPnl: totalUnrealizedPnl + totalRealizedPnl,
        currency,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Portfolio error:", error);
    return NextResponse.json(
      { error: "Failed to calculate portfolio" },
      { status: 500 }
    );
  }
}
