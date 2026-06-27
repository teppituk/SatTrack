import { NextRequest, NextResponse } from "next/server";

// ราคา BTC ย้อนหลัง (รายวัน) จาก CoinGecko สำหรับกราฟ Bitcoin Reserve
export const revalidate = 3600; // cache 1 ชม.

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const vs =
    (searchParams.get("vs") || "usd").toLowerCase() === "thb" ? "thb" : "usd";

  let days = searchParams.get("days") || "365";
  if (days !== "max") {
    const n = parseInt(days, 10);
    days = isNaN(n) ? "365" : String(Math.min(Math.max(n, 1), 3650));
  }

  try {
    const apiKey = process.env.COINGECKO_API_KEY;
    const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=${vs}&days=${days}${
      apiKey ? `&x_cg_demo_api_key=${apiKey}` : ""
    }`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);

    const data = await res.json();
    const prices: Array<{ t: number; p: number }> = (data.prices || []).map(
      (pt: [number, number]) => ({ t: pt[0], p: pt[1] })
    );
    return NextResponse.json({ vs, prices });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch BTC price history" },
      { status: 502 }
    );
  }
}
