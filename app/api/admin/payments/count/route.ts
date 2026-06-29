import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — จำนวนคำขอชำระเงินที่รออนุมัติ (สำหรับ badge บนเมนู)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const pending = await prisma.subscription.count({
    where: { status: "pending", refCode: { not: null } },
  });
  return NextResponse.json({ pending });
}
