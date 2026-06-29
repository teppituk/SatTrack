import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — ข้อมูลโปรไฟล์ของผู้ใช้ปัจจุบัน
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, image: true, createdAt: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(user);
}

// PATCH — แก้ไขข้อมูลส่วนตัว (ตอนนี้รองรับชื่อที่แสดง)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const name = typeof body.name === "string" ? body.name.trim() : undefined;

  if (name !== undefined) {
    if (name.length < 1 || name.length > 60) {
      return NextResponse.json(
        { error: "Name must be 1-60 characters" },
        { status: 400 }
      );
    }
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { ...(name !== undefined ? { name } : {}) },
    select: { name: true, email: true, image: true },
  });

  return NextResponse.json(user);
}
