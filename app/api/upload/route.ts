import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";
import path from "path";
import fs from "fs/promises";
import type { ConnectionOptions } from "bullmq";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const hasS3Credentials =
  !!process.env.AWS_ACCESS_KEY_ID &&
  !!process.env.AWS_SECRET_ACCESS_KEY &&
  !!process.env.S3_BUCKET_NAME;

async function saveLocally(buffer: Buffer, fileName: string, contentType: string): Promise<string> {
  const ext = contentType === "application/pdf" ? "pdf" : contentType.split("/")[1];
  const uniqueName = `${crypto.randomUUID()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "slips");
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, uniqueName), buffer);
  // serve ผ่าน API route (ทำงานทั้ง next dev และ next start)
  return `/api/slips/${uniqueName}`;
}

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
        { error: "Invalid file type. Please upload JPG, PNG, WebP, or PDF." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let imageUrl: string;

    if (hasS3Credentials) {
      const { uploadToS3 } = await import("@/lib/s3");
      const ext = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1];
      const key = `slips/${session.user.id}/${crypto.randomUUID()}.${ext}`;
      imageUrl = await uploadToS3(buffer, key, file.type);

      // Queue OCR job only when using S3
      try {
        const { Queue } = await import("bullmq");
        const IORedis = (await import("ioredis")).default;
        const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
          maxRetriesPerRequest: null,
        });
        const ocrQueue = new Queue("ocr-jobs", { connection: connection as unknown as ConnectionOptions });
        await ocrQueue.add("process-slip", { imageUrl, userId: session.user.id, key, contentType: file.type }, {
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
        });
      } catch {
        // Queue failure is non-fatal — OCR is called directly from the client
      }
    } else {
      // Local development fallback: save to public/uploads/slips/
      imageUrl = await saveLocally(buffer, file.name, file.type);
    }

    return NextResponse.json({
      imageUrl,
      message: "File uploaded successfully.",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
