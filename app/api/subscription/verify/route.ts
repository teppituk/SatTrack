import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isBTCPayConfigured, getBTCPayInvoice, SETTLED_STATUSES } from "@/lib/btcpay";
import { activateSubscriptionByInvoice } from "@/lib/subscription";

const isDevMockAllowed =
  !isBTCPayConfigured() && process.env.ALLOW_DEV_PAYMENTS === "true";

/**
 * POST { invoiceId } — ตรวจสถานะการชำระเงินแล้วเปิดใช้งานถ้าจ่ายแล้ว
 * - production (BTCPay): query สถานะ invoice จริง
 * - dev (ไม่มี BTCPay): จำลองการชำระเงินสำเร็จ
 * ใช้ตอน redirect กลับจากหน้าชำระเงิน เพื่อ reconcile โดยไม่ต้องรอ webhook
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { invoiceId } = await request.json();
  if (!invoiceId) {
    return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
  }

  // ต้องเป็น subscription ของ user คนนี้เท่านั้น
  const subscription = await prisma.subscription.findFirst({
    where: { invoiceId, userId: session.user.id },
  });
  if (!subscription) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  if (subscription.status === "paid") {
    return NextResponse.json({ status: "paid", alreadyActive: true });
  }

  if (isBTCPayConfigured()) {
    const invoice = await getBTCPayInvoice(invoiceId);
    if (invoice && SETTLED_STATUSES.includes(invoice.status)) {
      await activateSubscriptionByInvoice(invoiceId);
      return NextResponse.json({ status: "paid" });
    }
    return NextResponse.json({ status: subscription.status, btcpayStatus: invoice?.status ?? null });
  }

  if (isDevMockAllowed) {
    // จำลองการชำระเงินสำเร็จ (เฉพาะ dev)
    await activateSubscriptionByInvoice(invoiceId);
    return NextResponse.json({ status: "paid", simulated: true });
  }

  return NextResponse.json({ error: "Payment provider not configured" }, { status: 503 });
}
