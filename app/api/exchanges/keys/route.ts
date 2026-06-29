import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPlanActive } from "@/lib/subscription";
import { encrypt, isEncryptionReady } from "@/lib/crypto";
import { getConnector, supportedExchanges } from "@/lib/exchanges";

async function getPaidUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, planExpiresAt: true },
  });
  return { user, isPaid: isPlanActive(user?.plan ?? null, user?.planExpiresAt ?? null) };
}

// GET — รายการ key ของ user (ปิดบัง secret) + exchange ที่รองรับ + สถานะ plan
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { isPaid } = await getPaidUser(session.user.id);
  const keys = await prisma.exchangeApiKey.findMany({
    where: { userId: session.user.id },
    select: {
      exchange: true,
      keyHint: true,
      label: true,
      lastSyncAt: true,
      lastSyncStatus: true,
      lastSyncError: true,
      lastSyncCount: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    isPaid,
    encryptionReady: isEncryptionReady(),
    supported: supportedExchanges(),
    keys,
  });
}

// POST — เพิ่ม/อัปเดต key (ทดสอบก่อนบันทึก) — PRO เท่านั้น
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isEncryptionReady()) {
    return NextResponse.json({ error: "Encryption not configured" }, { status: 503 });
  }

  const { isPaid } = await getPaidUser(session.user.id);
  if (!isPaid) {
    return NextResponse.json(
      { error: "Exchange sync is a Pro feature", code: "PRO_ONLY" },
      { status: 403 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    exchange?: string;
    apiKey?: string;
    apiSecret?: string;
    label?: string;
  };
  const exchange = (body.exchange || "").trim().toLowerCase();
  const apiKey = (body.apiKey || "").trim();
  const apiSecret = (body.apiSecret || "").trim();

  const conn = getConnector(exchange);
  if (!conn) {
    return NextResponse.json({ error: "Exchange not supported" }, { status: 400 });
  }
  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: "API key and secret required" }, { status: 400 });
  }

  // ทดสอบ key ก่อนเก็บ
  const test = await conn.testConnection(apiKey, apiSecret);
  if (!test.ok) {
    return NextResponse.json(
      { error: test.error || "Connection test failed", code: "TEST_FAILED" },
      { status: 400 }
    );
  }

  await prisma.exchangeApiKey.upsert({
    where: { userId_exchange: { userId: session.user.id, exchange } },
    update: {
      apiKeyEnc: encrypt(apiKey),
      apiSecretEnc: encrypt(apiSecret),
      keyHint: apiKey.slice(-4),
      label: body.label?.trim() || null,
      lastSyncStatus: null,
      lastSyncError: null,
    },
    create: {
      userId: session.user.id,
      exchange,
      apiKeyEnc: encrypt(apiKey),
      apiSecretEnc: encrypt(apiSecret),
      keyHint: apiKey.slice(-4),
      label: body.label?.trim() || null,
    },
  });

  return NextResponse.json({ ok: true, exchange, keyHint: apiKey.slice(-4) });
}
