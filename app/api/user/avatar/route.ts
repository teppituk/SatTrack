import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import path from "path";
import fs from "fs/promises";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const hasS3Credentials =
  !!process.env.AWS_ACCESS_KEY_ID &&
  !!process.env.AWS_SECRET_ACCESS_KEY &&
  !!process.env.S3_BUCKET_NAME;

async function saveLocally(buffer: Buffer, contentType: string): Promise<string> {
  const ext = contentType.split("/")[1];
  const uniqueName = `${crypto.randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "avatars");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, uniqueName), buffer);
  return `/api/avatars/${uniqueName}`;
}

// POST — อัพโหลด/เปลี่ยนรูปโปรไฟล์
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload JPG, PNG or WebP." },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // ลบรูปเดิม (ถ้ามี) ก่อนเก็บรูปใหม่
    const prev = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true },
    });

    let imageUrl: string;
    if (hasS3Credentials) {
      const { uploadToS3 } = await import("@/lib/s3");
      const ext = file.type.split("/")[1];
      const fileName = `${crypto.randomUUID()}.${ext}`;
      await uploadToS3(buffer, `avatars/${fileName}`, file.type);
      imageUrl = `/api/avatars/${fileName}`;
    } else {
      imageUrl = await saveLocally(buffer, file.type);
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: imageUrl },
    });

    // best-effort cleanup รูปเก่า
    if (prev?.image && hasS3Credentials) {
      try {
        const old = prev.image.replace("/api/avatars/", "");
        if (old && !old.includes("/")) {
          const { deleteFromS3 } = await import("@/lib/s3");
          await deleteFromS3(`avatars/${old}`);
        }
      } catch {
        // ไม่ critical
      }
    }

    return NextResponse.json({ image: imageUrl });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}

// DELETE — ลบรูปโปรไฟล์
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prev = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { image: true },
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { image: null },
  });

  if (prev?.image && hasS3Credentials) {
    try {
      const old = prev.image.replace("/api/avatars/", "");
      if (old && !old.includes("/")) {
        const { deleteFromS3 } = await import("@/lib/s3");
        await deleteFromS3(`avatars/${old}`);
      }
    } catch {
      // ไม่ critical
    }
  }

  return NextResponse.json({ image: null });
}
