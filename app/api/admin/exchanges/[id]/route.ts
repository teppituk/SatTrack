import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH — เปิด/ปิดการใช้งาน หรือแก้ชื่อ (admin)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const exchange = await prisma.exchange.findUnique({ where: { id } });
  if (!exchange) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name, isActive } = body as { name?: string; isActive?: boolean };

  const updated = await prisma.exchange.update({
    where: { id },
    data: {
      ...(typeof name === "string" ? { name: name.trim() } : {}),
      ...(typeof isActive === "boolean" ? { isActive } : {}),
    },
  });

  return NextResponse.json(updated);
}

// DELETE — ลบ exchange (admin)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const exchange = await prisma.exchange.findUnique({ where: { id } });
  if (!exchange) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // กันลบถ้ามีธุรกรรมใช้ exchange นี้อยู่
  const used = await prisma.transaction.count({ where: { exchange: exchange.code } });
  if (used > 0) {
    return NextResponse.json(
      { error: `ลบไม่ได้: มี ${used} ธุรกรรมที่ใช้ exchange นี้อยู่ (ปิดการใช้งานแทนได้)` },
      { status: 400 }
    );
  }

  await prisma.exchange.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
