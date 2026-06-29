import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPlanActive } from "@/lib/subscription";
import { syncExchange } from "@/lib/exchanges/sync";

export const maxDuration = 60; // เผื่อดึงหลายหน้า

// POST { exchange } — sync ประวัติเทรดจาก exchange (PRO เท่านั้น)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true, planExpiresAt: true },
  });
  if (!isPlanActive(user?.plan ?? null, user?.planExpiresAt ?? null)) {
    return NextResponse.json(
      { error: "Exchange sync is a Pro feature", code: "PRO_ONLY" },
      { status: 403 }
    );
  }

  const { exchange } = (await req.json().catch(() => ({}))) as { exchange?: string };
  if (!exchange) {
    return NextResponse.json({ error: "exchange required" }, { status: 400 });
  }

  const result = await syncExchange(session.user.id, exchange.toLowerCase());
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json(result);
}
