import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import path from "path";
import fs from "fs/promises";

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const hasS3Credentials =
  !!process.env.AWS_ACCESS_KEY_ID &&
  !!process.env.AWS_SECRET_ACCESS_KEY &&
  !!process.env.S3_BUCKET_NAME;

// GET — serve รูปโปรไฟล์ (auth-gated) จาก S3 private bucket หรือ local storage
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await params;
  const safeName = path.basename(name); // กัน path traversal
  const ext = path.extname(safeName).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  if (hasS3Credentials) {
    const { getObjectFromS3 } = await import("@/lib/s3");
    const obj = await getObjectFromS3(`avatars/${safeName}`);
    if (!obj) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return new NextResponse(new Uint8Array(obj.body), {
      headers: {
        "Content-Type": obj.contentType || contentType,
        "Cache-Control": "private, max-age=86400",
      },
    });
  }

  const filePath = path.join(process.cwd(), "public", "uploads", "avatars", safeName);
  try {
    const file = await fs.readFile(filePath);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
