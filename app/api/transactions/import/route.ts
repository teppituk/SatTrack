import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export const runtime = "nodejs";

const FREE_PLAN_LIMIT = 50;

// map header (รองรับทั้งไทย/อังกฤษ) → field key
function mapHeader(h: string): string | null {
  const s = String(h).trim().toLowerCase();
  const m: Record<string, string[]> = {
    exchange: ["exchange", "เอ็กซ์เชนจ์"],
    type: ["type", "ประเภท"],
    coin: ["coin", "เหรียญ", "symbol"],
    currency: ["currency", "สกุลเงิน"],
    amount: ["จำนวน btc", "amount", "จำนวน", "qty", "quantity"],
    price: ["ราคาต่อหน่วย", "price", "ราคา"],
    total: ["มูลค่ารวม", "total", "totalvalue", "มูลค่า"],
    date: ["วันที่ทำธุรกรรม", "date", "txdate", "วันที่"],
  };
  for (const [k, vals] of Object.entries(m)) if (vals.includes(s)) return k;
  return null;
}

function toNum(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/,/g, ""));
    return isNaN(n) ? null : n;
  }
  if (v && typeof v === "object" && "result" in (v as Record<string, unknown>)) {
    const r = (v as Record<string, unknown>).result;
    return typeof r === "number" ? r : null;
  }
  return null;
}

function toDate(v: unknown): Date | null {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "ไม่พบไฟล์" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "ไฟล์ใหญ่เกิน 5MB" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const wb = new ExcelJS.Workbook();
    // cast: ExcelJS types ระบุ Buffer ตัวเก่า แต่รับ Buffer/ArrayBuffer ได้ตอน runtime
    await wb.xlsx.load(buf as never);
    const ws = wb.worksheets[0];
    if (!ws) {
      return NextResponse.json({ error: "ไม่พบชีตในไฟล์" }, { status: 400 });
    }

    // หา column จาก header แถวแรก
    const colMap: Record<string, number> = {};
    ws.getRow(1).eachCell((cell, col) => {
      const f = mapHeader(String(cell.value ?? ""));
      if (f) colMap[f] = col;
    });
    for (const need of ["type", "amount", "price", "date"]) {
      if (!colMap[need]) {
        return NextResponse.json(
          { error: `ไม่พบคอลัมน์ที่จำเป็น: ${need}` },
          { status: 400 }
        );
      }
    }

    type Row = {
      type: "BUY" | "SELL";
      amount: number;
      price: number;
      totalValue: number;
      currency: string;
      exchange: string;
      txDate: Date;
    };
    const rows: Row[] = [];
    const errors: string[] = [];

    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const get = (f: string) => (colMap[f] ? row.getCell(colMap[f]).value : null);

      const typeRaw = String(get("type") ?? "").trim().toUpperCase();
      const amount = toNum(get("amount"));
      const price = toNum(get("price"));
      const totalRaw = toNum(get("total"));
      const date = toDate(get("date"));
      const coin = (String(get("coin") ?? "BTC").trim().toUpperCase()) || "BTC";
      const currencyRaw = String(get("currency") ?? "THB").trim().toUpperCase();
      const exchange = (String(get("exchange") ?? "").trim()) || "import";

      // ข้ามแถวว่าง
      if (!typeRaw && amount == null && price == null && totalRaw == null && !date) {
        continue;
      }

      if (coin !== "BTC") {
        errors.push(`แถว ${r}: รองรับเฉพาะ BTC (พบ ${coin})`);
        continue;
      }
      if (typeRaw !== "BUY" && typeRaw !== "SELL") {
        errors.push(`แถว ${r}: ประเภทไม่ถูกต้อง (ต้องเป็น BUY/SELL)`);
        continue;
      }
      if (amount == null || amount <= 0) {
        errors.push(`แถว ${r}: จำนวน BTC ไม่ถูกต้อง`);
        continue;
      }
      if (price == null || price < 0) {
        errors.push(`แถว ${r}: ราคาไม่ถูกต้อง`);
        continue;
      }
      if (!date) {
        errors.push(`แถว ${r}: วันที่ไม่ถูกต้อง`);
        continue;
      }
      const totalValue =
        totalRaw != null && totalRaw > 0 ? totalRaw : amount * price;
      const currency = ["THB", "USD", "USDT"].includes(currencyRaw)
        ? currencyRaw
        : "THB";

      rows.push({ type: typeRaw, amount, price, totalValue, currency, exchange, txDate: date });
    }

    if (rows.length === 0) {
      return NextResponse.json({ imported: 0, skipped: errors.length, errors });
    }

    // ตรวจ plan limit (free = 50/เดือน) — import ได้ตามโควต้าที่เหลือ
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true, planExpiresAt: true },
    });
    const isPaid =
      user?.plan === "paid" && !!user.planExpiresAt && user.planExpiresAt > new Date();

    let allowed = rows;
    let limitSkipped = 0;
    if (!isPaid) {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthlyCount = await prisma.transaction.count({
        where: { userId: session.user.id, createdAt: { gte: monthStart } },
      });
      const remaining = Math.max(0, FREE_PLAN_LIMIT - monthlyCount);
      if (rows.length > remaining) {
        allowed = rows.slice(0, remaining);
        limitSkipped = rows.length - remaining;
      }
    }

    const coin = await prisma.coin.upsert({
      where: { symbol: "BTC" },
      update: {},
      create: { symbol: "BTC", name: "Bitcoin", assetType: "CRYPTO" },
    });

    if (allowed.length > 0) {
      await prisma.transaction.createMany({
        data: allowed.map((r) => ({
          userId: session.user!.id,
          coinId: coin.id,
          type: r.type,
          amount: r.amount,
          price: r.price,
          totalValue: r.totalValue,
          currency: r.currency,
          exchange: r.exchange,
          txDate: r.txDate,
        })),
      });
    }

    return NextResponse.json({
      imported: allowed.length,
      skipped: errors.length + limitSkipped,
      limitReached: limitSkipped > 0,
      errors: errors.slice(0, 20),
    });
  } catch {
    return NextResponse.json({ error: "นำเข้าไฟล์ไม่สำเร็จ" }, { status: 500 });
  }
}
