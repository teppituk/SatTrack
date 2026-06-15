import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

async function createBTCPayInvoice(amountSats: number, orderId: string, buyerEmail: string) {
  const btcPayUrl = process.env.BTCPAY_URL;
  const apiKey = process.env.BTCPAY_API_KEY;
  const storeId = process.env.BTCPAY_STORE_ID;

  if (!btcPayUrl || !apiKey || !storeId) {
    throw new Error("BTCPay Server is not configured");
  }

  const response = await fetch(`${btcPayUrl}/api/v1/stores/${storeId}/invoices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `token ${apiKey}`,
    },
    body: JSON.stringify({
      amount: amountSats,
      currency: "SATS",
      orderId,
      buyer: { email: buyerEmail },
      checkout: {
        paymentMethods: ["BTC-LightningNetwork", "BTC"],
        expirationMinutes: 60,
        redirectURL: `${process.env.NEXTAUTH_URL}/settings/subscription?status=success`,
        redirectAutomatically: true,
      },
      metadata: {
        orderId,
        buyerEmail,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`BTCPay API error: ${error}`);
  }

  return response.json();
}

export async function GET(request: NextRequest) {
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

  return NextResponse.json({
    currentPlan: user?.plan || "free",
    planExpiresAt: user?.planExpiresAt,
    isActive: user?.plan === "paid" && user?.planExpiresAt && user.planExpiresAt > new Date(),
    subscriptions,
    plans: SUBSCRIPTION_PLANS,
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

    const invoice = await createBTCPayInvoice(
      plan.amountSats,
      orderId,
      user!.email
    );

    // Record pending subscription
    const subscription = await prisma.subscription.create({
      data: {
        userId: session.user.id,
        invoiceId: invoice.id,
        amountSats: plan.amountSats,
        status: "pending",
      },
    });

    return NextResponse.json({
      invoiceId: invoice.id,
      checkoutLink: invoice.checkoutLink,
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
