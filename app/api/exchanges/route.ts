import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — รายการ exchange ที่เปิดใช้งาน (สำหรับผู้ใช้ทั่วไป เช่น หน้า Stack Bitcoin)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const exchanges = await prisma.exchange.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { code: true, name: true },
  });

  return NextResponse.json({ exchanges });
}
