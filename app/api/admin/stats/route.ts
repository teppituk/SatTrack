import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    totalUsers,
    activeUsers,
    adminCount,
    totalTransactions,
    volumeResult,
    newUsersThisMonth,
    transactionsThisMonth,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.transaction.count(),
    prisma.transaction.aggregate({
      _sum: { totalValue: true },
      where: { currency: "THB" },
    }),
    prisma.user.count({
      where: { createdAt: { gte: startOfMonth } },
    }),
    prisma.transaction.count({
      where: { createdAt: { gte: startOfMonth } },
    }),
  ])

  return NextResponse.json({
    totalUsers,
    activeUsers,
    adminCount,
    totalTransactions,
    totalVolumeTHB: volumeResult._sum.totalValue ?? 0,
    newUsersThisMonth,
    transactionsThisMonth,
  })
}
