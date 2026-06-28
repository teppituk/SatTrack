import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { approvePaymentRequest, rejectPaymentRequest } from "@/lib/payments";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

// GET — คำขอชำระเงิน (pending ก่อน แล้วตามด้วยล่าสุด)
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const subs = await prisma.subscription.findMany({
    where: { refCode: { not: null } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: { user: { select: { email: true, name: true } } },
  });
  return NextResponse.json({ payments: subs });
}

// POST — { id, action: "approve" | "reject", reason? }
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id, action, reason } = (await req.json().catch(() => ({}))) as {
    id?: string;
    action?: string;
    reason?: string;
  };
  if (!id || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const ok =
    action === "approve"
      ? await approvePaymentRequest(id, session.user.id)
      : await rejectPaymentRequest(id, session.user.id, reason);

  if (!ok) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
