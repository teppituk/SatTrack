import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_PERMISSIONS = {
  dashboard: true,
  upload: true,
  chart: true,
  share: true,
  subscription: true,
  settings: true,
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const roles = await prisma.role.findMany({
    orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ roles });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, label, permissions } = body as {
    name: string;
    label: string;
    permissions?: Record<string, boolean>;
  };

  if (!name || !label) {
    return NextResponse.json({ error: "name and label are required" }, { status: 400 });
  }

  const roleName = name.toUpperCase().replace(/\s+/g, "_");

  const existing = await prisma.role.findUnique({ where: { name: roleName } });
  if (existing) {
    return NextResponse.json({ error: "Role name already exists" }, { status: 409 });
  }

  const role = await prisma.role.create({
    data: {
      name: roleName,
      label,
      permissions: { ...DEFAULT_PERMISSIONS, ...permissions },
    },
  });

  return NextResponse.json(role, { status: 201 });
}
