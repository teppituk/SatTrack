import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parseSlipImage, parseSlipFromUrl } from "@/lib/anthropic";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") || "";

    let parsedData;

    if (contentType.includes("multipart/form-data")) {
      // Handle direct file upload for immediate OCR (no queue)
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: "Only image files can be processed for OCR directly. PDF files are queued for processing." },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const mediaType = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

      parsedData = await parseSlipImage(base64, mediaType);
    } else {
      // Handle URL-based OCR
      const body = await request.json();
      const { imageUrl } = body;

      if (!imageUrl) {
        return NextResponse.json(
          { error: "imageUrl is required" },
          { status: 400 }
        );
      }

      parsedData = await parseSlipFromUrl(imageUrl);
    }

    return NextResponse.json({ data: parsedData });
  } catch (error) {
    console.error("OCR error:", error);
    if (error instanceof Error && error.message.includes("Could not extract JSON")) {
      return NextResponse.json(
        { error: "Could not read slip data. Please enter manually." },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { error: "OCR processing failed" },
      { status: 500 }
    );
  }
}
