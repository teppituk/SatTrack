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
  const page = parseInt(searchParams.get("page") ?? "1", 10)
  const limit = parseInt(searchParams.get("limit") ?? "20", 10)
  const search = searchParams.get("search") ?? ""
  const role = searchParams.get("role") ?? ""
  const status = searchParams.get("status") ?? ""

  const where: Record<string, unknown> = {}

  if (search) {
    where.email = { contains: search, mode: "insensitive" }
  }

  if (role && role !== "ALL") {
    where.role = role
  }

  if (status === "ACTIVE") {
    where.isActive = true
  } else if (status === "INACTIVE") {
    where.isActive = false
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        plan: true,
        createdAt: true,
        _count: {
          select: { transactions: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({
    users,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  })
}
