import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get("limit") ?? "10", 10)
  const page = parseInt(searchParams.get("page") ?? "1", 10)

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true } },
        coin: { select: { symbol: true } },
      },
    }),
    prisma.transaction.count(),
  ])

  return NextResponse.json({ transactions, total, page })
}
