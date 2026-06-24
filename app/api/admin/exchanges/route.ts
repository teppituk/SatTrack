import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — รายการ exchange ทั้งหมด (admin)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const exchanges = await prisma.exchange.findMany({
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ exchanges });
}

// POST — เพิ่ม exchange ใหม่ (admin)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { code, name } = body as { code?: string; name?: string };

  if (!code || !name) {
    return NextResponse.json({ error: "code and name are required" }, { status: 400 });
  }

  // normalize code: ตัวพิมพ์เล็ก ไม่มีช่องว่าง
  const exchangeCode = code.toLowerCase().trim().replace(/\s+/g, "");

  const existing = await prisma.exchange.findUnique({ where: { code: exchangeCode } });
  if (existing) {
    return NextResponse.json({ error: "Exchange code already exists" }, { status: 409 });
  }

  const exchange = await prisma.exchange.create({
    data: { code: exchangeCode, name: name.trim() },
  });

  return NextResponse.json(exchange, { status: 201 });
}
