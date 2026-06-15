import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parseSlipImage } from "@/lib/anthropic";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "NO_API_KEY", message: "ANTHROPIC_API_KEY ยังไม่ได้ตั้งค่าใน .env.local" },
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

    const parsedData = await parseSlipImage(base64, mediaType);

    return NextResponse.json({ data: parsedData });
  } catch (error) {
    console.error("OCR error:", error);
    const message = error instanceof Error ? error.message : "OCR processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
