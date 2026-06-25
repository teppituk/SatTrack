import { NextResponse } from "next/server";

// Current BTC price in THB and USD, for pre-filling the Stack form.
// Cached for 60s to stay within CoinGecko rate limits.
export const revalidate = 60;

export async function GET() {
  try {
    const apiKey = process.env.COINGECKO_API_KEY;
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=thb,usd${
      apiKey ? `&x_cg_demo_api_key=${apiKey}` : ""
    }`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);

    const data = await res.json();
    const thb = Number(data?.bitcoin?.thb) || 0;
    const usd = Number(data?.bitcoin?.usd) || 0;
    if (!thb && !usd) throw new Error("empty price");

    return NextResponse.json({ thb, usd, updatedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch BTC price" },
      { status: 502 }
    );
  }
}
