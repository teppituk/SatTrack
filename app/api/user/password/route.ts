import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// POST — เปลี่ยนรหัสผ่าน (ต้องยืนยันรหัสเดิม)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    currentPassword?: string;
    newPassword?: string;
  };
  const currentPassword = body.currentPassword ?? "";
  const newPassword = body.newPassword ?? "";

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters", code: "WEAK" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // บัญชีที่ไม่มีรหัสผ่าน (เช่น login ผ่าน provider อื่น) เปลี่ยนรหัสไม่ได้
  if (!user.password) {
    return NextResponse.json(
      { error: "This account has no password set", code: "NO_PASSWORD" },
      { status: 400 }
    );
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    return NextResponse.json(
      { error: "Current password is incorrect", code: "WRONG_CURRENT" },
      { status: 400 }
    );
  }

  // กันตั้งรหัสเดิมซ้ำ
  const same = await bcrypt.compare(newPassword, user.password);
  if (same) {
    return NextResponse.json(
      { error: "New password must be different", code: "SAME" },
      { status: 400 }
    );
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashed },
  });

  return NextResponse.json({ ok: true });
}
