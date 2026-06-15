import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadToS3 } from "@/lib/s3";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import crypto from "crypto";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const ocrQueue = new Queue("ocr-jobs", { connection });

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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

    const fileExt = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1];
    const fileName = `slips/${session.user.id}/${crypto.randomUUID()}.${fileExt}`;

    const imageUrl = await uploadToS3(buffer, fileName, file.type);

    // Queue OCR job
    const job = await ocrQueue.add(
      "process-slip",
      {
        imageUrl,
        userId: session.user.id,
        fileName,
        contentType: file.type,
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
      }
    );

    return NextResponse.json({
      imageUrl,
      jobId: job.id,
      message: "File uploaded. OCR processing started.",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
