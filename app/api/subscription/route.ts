import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isBTCPayConfigured, createBTCPayInvoice } from "@/lib/btcpay";
import { isPlanActive } from "@/lib/subscription";

const SUBSCRIPTION_PLANS = {
  monthly: {
    amountSats: 10000,
    label: "Monthly Plan",
    durationDays: 30,
  },
  annual: {
    amountSats: 100000,
    label: "Annual Plan",
    durationDays: 365,
  },
};

// เปิด mock payment ได้เมื่อยังไม่ได้ตั้ง BTCPay และตั้ง ALLOW_DEV_PAYMENTS=true อย่างชัดเจน
const isDevMockAllowed =
  !isBTCPayConfigured() && process.env.ALLOW_DEV_PAYMENTS === "true";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user, subscriptions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true, planExpiresAt: true },
    }),
    prisma.subscription.findMany({
      where: { userId: session.user.id },
      orderBy: { id: "desc" },
      take: 10,
    }),
  ]);

  const active = isPlanActive(user?.plan ?? null, user?.planExpiresAt ?? null);

  // lazy downgrade — เคย paid แต่หมดอายุแล้ว ปรับ plan กลับเป็น free ให้สถานะตรงความจริง
  if (user?.plan === "paid" && !active) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { plan: "free" },
    });
  }

  return NextResponse.json({
    currentPlan: active ? "paid" : "free",
    planExpiresAt: user?.planExpiresAt,
    isActive: active,
    subscriptions,
    plans: SUBSCRIPTION_PLANS,
    paymentMode: isBTCPayConfigured() ? "btcpay" : "dev",
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { planType } = await request.json();

    if (!planType || !SUBSCRIPTION_PLANS[planType as keyof typeof SUBSCRIPTION_PLANS]) {
      return NextResponse.json({ error: "Invalid plan type" }, { status: 400 });
    }

    const plan = SUBSCRIPTION_PLANS[planType as keyof typeof SUBSCRIPTION_PLANS];
    const orderId = `sub_${session.user.id}_${Date.now()}`;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    });

    let invoiceId: string;
    let checkoutLink: string;

    if (isBTCPayConfigured()) {
      const invoice = await createBTCPayInvoice(plan.amountSats, orderId, user!.email);
      invoiceId = invoice.id;
      checkoutLink = invoice.checkoutLink;
    } else if (isDevMockAllowed) {
      // โหมด dev (ไม่มี BTCPay) — สร้าง mock invoice + หน้าจำลองการชำระเงิน
      invoiceId = `mock_${orderId}`;
      checkoutLink =
        `/settings/subscription/pay?invoiceId=${encodeURIComponent(invoiceId)}` +
        `&amount=${plan.amountSats}&label=${encodeURIComponent(plan.label)}`;
    } else {
      return NextResponse.json(
        { error: "BTCPay Server is not configured" },
        { status: 503 }
      );
    }

    // Record pending subscription
    const subscription = await prisma.subscription.create({
      data: {
        userId: session.user.id,
        invoiceId,
        amountSats: plan.amountSats,
        status: "pending",
      },
    });

    return NextResponse.json({
      invoiceId,
      checkoutLink,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    console.error("Subscription error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create subscription" },
      { status: 500 }
    );
  }
}
