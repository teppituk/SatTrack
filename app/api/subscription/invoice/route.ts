import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPaymentConfig } from "@/lib/payments";
import { fetchLightningInvoice, getInvoiceExpiry } from "@/lib/lnurl";

// POST { subscriptionId } — สร้าง Lightning invoice (bolt11) ฝังจำนวน + memo(refCode)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subscriptionId } = (await req.json().catch(() => ({}))) as {
    subscriptionId?: string;
  };
  if (!subscriptionId) {
    return NextResponse.json({ error: "subscriptionId required" }, { status: 400 });
  }

  const sub = await prisma.subscription.findFirst({
    where: { id: subscriptionId, userId: session.user.id, status: "pending" },
  });
  if (!sub || !sub.refCode) {
    return NextResponse.json({ error: "Pending payment not found" }, { status: 404 });
  }

  const cfg = await getPaymentConfig();
  if (!cfg.lightningAddress) {
    return NextResponse.json({ error: "Payment not configured" }, { status: 503 });
  }

  try {
    const invoice = await fetchLightningInvoice(
      cfg.lightningAddress,
      sub.amountSats,
      sub.refCode
    );
    return NextResponse.json({ invoice, expiresAt: getInvoiceExpiry(invoice) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create invoice" },
      { status: 502 }
    );
  }
}
