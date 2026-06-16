import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parseSlipImage as parseSlipImageGemini } from "@/lib/gemini";
import { parseSlipImage as parseSlipImageClaude } from "@/lib/anthropic";

function isQuotaError(message: string) {
  return message.includes("429") || message.toLowerCase().includes("quota") || message.toLowerCase().includes("too many requests");
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const geminiKey = process.env.GEMINI_API_KEY ?? "";
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? "";
  const hasGemini = geminiKey && !geminiKey.includes("ใส่") && geminiKey !== "YOUR_API_KEY";
  const hasAnthropic = anthropicKey && !anthropicKey.includes("ใส่") && anthropicKey !== "YOUR_API_KEY";

  if (!hasGemini && !hasAnthropic) {
    return NextResponse.json(
      { error: "NO_API_KEY", message: "ยังไม่ได้ตั้งค่า GEMINI_API_KEY หรือ ANTHROPIC_API_KEY ใน .env.local" },
      { status: 503 }
    );
  }

  try {
    const contentType = request.headers.get("content-type") || "";

    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "PDF ไม่รองรับ OCR โดยตรง กรุณากรอกข้อมูลด้วยตนเอง" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mediaType = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    // Try Gemini first; fallback to Claude on quota errors
    if (hasGemini) {
      try {
        const parsedData = await parseSlipImageGemini(base64, mediaType);
        return NextResponse.json({ data: parsedData, provider: "gemini" });
      } catch (geminiError) {
        const geminiMsg = geminiError instanceof Error ? geminiError.message : "";
        if (!isQuotaError(geminiMsg) || !hasAnthropic) throw geminiError;
        console.warn("Gemini quota exceeded, falling back to Claude");
      }
    }

    const parsedData = await parseSlipImageClaude(base64, mediaType);
    // Claude doesn't return assetType; default to CRYPTO for backward compatibility
    const result = { assetType: "CRYPTO" as const, ...parsedData };
    return NextResponse.json({ data: result, provider: "claude" });
  } catch (error) {
    console.error("OCR error:", error);
    const message = error instanceof Error ? error.message : "OCR processing failed";

    if (message.includes("401") || message.includes("API_KEY_INVALID") || message.toLowerCase().includes("api key not valid")) {
      return NextResponse.json(
        { error: "INVALID_API_KEY", message: "API Key ไม่ถูกต้อง กรุณาตรวจสอบ GEMINI_API_KEY หรือ ANTHROPIC_API_KEY" },
        { status: 503 }
      );
    }
    if (isQuotaError(message)) {
      return NextResponse.json(
        { error: "QUOTA_EXCEEDED", message: "API quota หมด และไม่มี provider สำรอง กรุณาตั้งค่า ANTHROPIC_API_KEY ใน .env.local" },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: "OCR_FAILED", message }, { status: 500 });
  }
}
