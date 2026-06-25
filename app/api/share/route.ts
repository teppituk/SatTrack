import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createShareSchema = z.object({
  showCostBasis: z.boolean().default(true),
  showPnl: z.boolean().default(true),
  showTransactions: z.boolean().default(false),
  privacyMode: z.boolean().default(false),
  expiresIn: z.enum(["never", "24h", "7d", "30d"]).default("never"),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shareLinks = await prisma.shareLink.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ shareLinks });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createShareSchema.parse(body);

    let expiresAt: Date | null = null;
    if (data.expiresIn !== "never") {
      const ms: Record<string, number> = {
        "24h": 24 * 60 * 60 * 1000,
        "7d": 7 * 24 * 60 * 60 * 1000,
        "30d": 30 * 24 * 60 * 60 * 1000,
      };
      expiresAt = new Date(Date.now() + ms[data.expiresIn]);
    }

    const shareLink = await prisma.shareLink.create({
      data: {
        userId: session.user.id,
        config: {
          showCostBasis: data.showCostBasis,
          showPnl: data.showPnl,
          showTransactions: data.showTransactions,
          privacyMode: data.privacyMode,
        },
        expiresAt,
      },
    });

    const shareUrl = `${process.env.NEXTAUTH_URL}/share/${shareLink.token}`;

    return NextResponse.json({ shareLink, shareUrl }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Share link creation error:", error);
    return NextResponse.json(
      { error: "Failed to create share link" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Share link ID required" }, { status: 400 });
  }

  const shareLink = await prisma.shareLink.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!shareLink) {
    return NextResponse.json({ error: "Share link not found" }, { status: 404 });
  }

  await prisma.shareLink.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
