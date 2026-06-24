import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()

  if (id === session.user.id && body.isActive === false) {
    return NextResponse.json(
      { error: "Cannot deactivate your own account" },
      { status: 400 }
    )
  }

  const data: { role?: string; isActive?: boolean } = {}

  if (typeof body.role === "string") {
    const roleExists = await prisma.role.findUnique({ where: { name: body.role } })
    if (!roleExists) {
      return NextResponse.json({ error: `Role "${body.role}" not found` }, { status: 400 })
    }
    data.role = body.role
  }

  if (typeof body.isActive === "boolean") {
    data.isActive = body.isActive
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      plan: true,
    },
  })

  return NextResponse.json(updatedUser)
}
