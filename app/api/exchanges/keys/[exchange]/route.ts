import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE — ลบ key ของ exchange (ไม่แตะ transaction ที่ sync มาแล้ว)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ exchange: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { exchange } = await params;

  await prisma.exchangeApiKey.deleteMany({
    where: { userId: session.user.id, exchange: exchange.toLowerCase() },
  });

  return NextResponse.json({ ok: true });
}
