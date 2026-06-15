import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const FREE_PLAN_LIMIT = 50;

const transactionSchema = z.object({
  coinSymbol: z.string().min(1).max(20).toUpperCase(),
  coinName: z.string().optional(),
  type: z.enum(["BUY", "SELL"]),
  amount: z.number().nonnegative(),
  price: z.number().nonnegative(),
  totalValue: z.number().nonnegative(),
  currency: z.enum(["THB", "USDT", "USD"]),
  exchange: z.enum(["bitkub", "binanceth", "binance"]),
  txDate: z.string().datetime(),
  slipImageUrl: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const coinSymbol = searchParams.get("coin");
  const exchange = searchParams.get("exchange");
  const type = searchParams.get("type");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    userId: session.user.id,
  };

  if (coinSymbol) {
    where.coin = { symbol: coinSymbol };
  }
  if (exchange) {
    where.exchange = exchange;
  }
  if (type) {
    where.type = type;
  }
  if (from || to) {
    where.txDate = {};
    if (from) (where.txDate as Record<string, unknown>).gte = new Date(from);
    if (to) (where.txDate as Record<string, unknown>).lte = new Date(to);
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        coin: { select: { symbol: true, name: true, coingeckoId: true } },
      },
      orderBy: { txDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  return NextResponse.json({
    transactions,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = transactionSchema.parse(body);

    // Check plan limits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true, planExpiresAt: true },
    });

    const isPaidPlan =
      user?.plan === "paid" &&
      user?.planExpiresAt &&
      user.planExpiresAt > new Date();

    if (!isPaidPlan) {
      const currentMonthStart = new Date();
      currentMonthStart.setDate(1);
      currentMonthStart.setHours(0, 0, 0, 0);

      const monthlyCount = await prisma.transaction.count({
        where: {
          userId: session.user.id,
          createdAt: { gte: currentMonthStart },
        },
      });

      if (monthlyCount >= FREE_PLAN_LIMIT) {
        return NextResponse.json(
          {
            error: `Free plan limit reached (${FREE_PLAN_LIMIT} transactions/month). Upgrade to continue.`,
            code: "LIMIT_REACHED",
          },
          { status: 403 }
        );
      }
    }

    // Get or create coin
    const coin = await prisma.coin.upsert({
      where: { symbol: data.coinSymbol },
      update: {},
      create: {
        symbol: data.coinSymbol,
        name: data.coinName || data.coinSymbol,
      },
    });

    const transaction = await prisma.transaction.create({
      data: {
        userId: session.user.id,
        coinId: coin.id,
        type: data.type,
        amount: data.amount,
        price: data.price,
        totalValue: data.totalValue,
        currency: data.currency,
        exchange: data.exchange,
        txDate: new Date(data.txDate),
        slipImageUrl: data.slipImageUrl,
      },
      include: {
        coin: { select: { symbol: true, name: true } },
      },
    });

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Transaction creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Transaction ID required" }, { status: 400 });
  }

  const transaction = await prisma.transaction.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!transaction) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  await prisma.transaction.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
