import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const role = await prisma.role.findUnique({ where: { id: params.id } });
  if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { label, permissions } = body as { label?: string; permissions?: Record<string, boolean> };

  const updated = await prisma.role.update({
    where: { id: params.id },
    data: {
      ...(label ? { label } : {}),
      ...(permissions ? { permissions } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const role = await prisma.role.findUnique({ where: { id: params.id } });
  if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (role.isSystem) return NextResponse.json({ error: "Cannot delete system role" }, { status: 400 });

  const usersWithRole = await prisma.user.count({ where: { role: role.name } });
  if (usersWithRole > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${usersWithRole} user(s) are using this role` },
      { status: 400 }
    );
  }

  await prisma.role.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
