import { NextResponse } from "next/server";

// ราคา BTC ปัจจุบัน (THB + USD) สำหรับ pre-fill ฟอร์ม Stack
// แหล่งหลัก: Bitkub (THB) + Binance (USD) — เสถียร ไม่ต้องใช้ key
// แหล่งสำรอง: CoinGecko, และค่าล่าสุดที่ cache ไว้ (กัน rate-limit)
export const revalidate = 60;

let lastGood: { thb: number; usd: number; updatedAt: string } | null = null;

async function tryJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const r = await fetch(url, { next: { revalidate: 60 } });
    if (!r.ok) return null;
    return (await r.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function GET() {
  // ── แหล่งหลัก: Bitkub (THB) + Binance (USD) ──
  const [bk, bn] = await Promise.all([
    tryJson("https://api.bitkub.com/api/market/ticker"),
    tryJson("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT"),
  ]);
  let thb = Number((bk?.THB_BTC as { last?: number } | undefined)?.last) || 0;
  let usd = Number((bn as { price?: string } | null)?.price) || 0;

  // ── สำรอง: CoinGecko เติมส่วนที่ขาด ──
  if (!thb || !usd) {
    const key = process.env.COINGECKO_API_KEY;
    const cg = await tryJson(
      `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=thb,usd${
        key ? `&x_cg_demo_api_key=${key}` : ""
      }`
    );
    const b = cg?.bitcoin as { thb?: number; usd?: number } | undefined;
    if (!thb) thb = Number(b?.thb) || 0;
    if (!usd) usd = Number(b?.usd) || 0;
  }

  // ครบทั้งคู่ → cache + คืนค่า
  if (thb && usd) {
    lastGood = { thb, usd, updatedAt: new Date().toISOString() };
    return NextResponse.json(lastGood);
  }

  // ได้บางส่วน + มีค่าเก่า → เติมจากค่าเก่า
  if ((thb || usd) && lastGood) {
    return NextResponse.json({
      thb: thb || lastGood.thb,
      usd: usd || lastGood.usd,
      updatedAt: new Date().toISOString(),
      partial: true,
    });
  }

  // ล่มหมด → คืนค่าล่าสุดที่เคยได้ (stale) แทน fail
  if (lastGood) {
    return NextResponse.json({ ...lastGood, stale: true });
  }

  return NextResponse.json({ error: "Failed to fetch BTC price" }, { status: 502 });
}
