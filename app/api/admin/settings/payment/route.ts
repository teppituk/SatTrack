import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPaymentConfig } from "@/lib/payments";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

// GET — config การชำระเงิน (Wallet of Satoshi)
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const c = await getPaymentConfig();
  return NextResponse.json({
    lightningAddress: c.lightningAddress,
    monthlySats: c.monthlySats,
    annualSats: c.annualSats,
    configured: !!c.lightningAddress,
  });
}

// POST — บันทึก config
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    lightningAddress?: string;
    monthlySats?: number | string;
    annualSats?: number | string;
  };

  const set = (key: string, value: string) =>
    prisma.appSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

  const toPosInt = (v: unknown, fallback: number) => {
    const n = parseInt(String(v ?? ""), 10);
    return isNaN(n) || n <= 0 ? fallback : n;
  };

  await set("WOS_LIGHTNING_ADDRESS", (body.lightningAddress ?? "").trim());
  await set("PLAN_MONTHLY_SATS", String(toPosInt(body.monthlySats, 10000)));
  await set("PLAN_ANNUAL_SATS", String(toPosInt(body.annualSats, 100000)));

  return NextResponse.json({ ok: true, configured: !!(body.lightningAddress ?? "").trim() });
}
