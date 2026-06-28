import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPlanActive, syncExpiredPlan } from "@/lib/subscription";
import { getPaymentConfig, getPlans, genRefCode } from "@/lib/payments";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user, subscriptions, cfg, plans] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true, planExpiresAt: true, role: true },
    }),
    prisma.subscription.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    getPaymentConfig(),
    getPlans(),
  ]);

  const active = isPlanActive(user?.plan ?? null, user?.planExpiresAt ?? null);

  // sync role/plan ตามอายุ (จ่าย=CUSTOMER, หมดอายุ=CUSTOMER_FREE) — ไม่แตะ transaction
  if (user) {
    await syncExpiredPlan({
      id: session.user.id,
      plan: user.plan,
      planExpiresAt: user.planExpiresAt,
      role: user.role,
    });
  }

  const pending = subscriptions.find((s) => s.status === "pending") ?? null;

  return NextResponse.json({
    currentPlan: active ? "paid" : "free",
    planExpiresAt: user?.planExpiresAt,
    isActive: active,
    subscriptions,
    plans,
    lightningAddress: cfg.lightningAddress,
    pending,
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { planType } = await request.json();
    if (planType !== "monthly" && planType !== "annual") {
      return NextResponse.json({ error: "Invalid plan type" }, { status: 400 });
    }

    const cfg = await getPaymentConfig();
    if (!cfg.lightningAddress) {
      return NextResponse.json(
        { error: "Payment is not configured yet" },
        { status: 503 }
      );
    }
    const amountSats = planType === "annual" ? cfg.annualSats : cfg.monthlySats;

    // มีคำขอ pending ของแผนเดียวกันอยู่แล้ว → ใช้ตัวเดิม (ไม่สร้างซ้ำ)
    const existing = await prisma.subscription.findFirst({
      where: { userId: session.user.id, planType, status: "pending" },
    });
    const sub =
      existing ??
      (await prisma.subscription.create({
        data: {
          userId: session.user.id,
          refCode: genRefCode(),
          planType,
          amountSats,
          status: "pending",
        },
      }));

    return NextResponse.json({
      subscriptionId: sub.id,
      refCode: sub.refCode,
      planType: sub.planType,
      amountSats: sub.amountSats,
      lightningAddress: cfg.lightningAddress,
      status: sub.status,
    });
  } catch (error) {
    console.error("Subscription error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create payment request" },
      { status: 500 }
    );
  }
}
