import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { getConnector } from "./index";

export interface SyncResult {
  ok: boolean;
  imported: number;
  fetched: number;
  error?: string;
}

// ดึงเทรดจาก exchange ของ user แล้วบันทึกเป็น Transaction (กันซ้ำด้วย unique index)
export async function syncExchange(userId: string, exchange: string): Promise<SyncResult> {
  const conn = getConnector(exchange);
  if (!conn) return { ok: false, imported: 0, fetched: 0, error: "Exchange not supported" };

  const keyRow = await prisma.exchangeApiKey.findUnique({
    where: { userId_exchange: { userId, exchange } },
  });
  if (!keyRow) return { ok: false, imported: 0, fetched: 0, error: "No API key configured" };

  await prisma.exchangeApiKey.update({
    where: { id: keyRow.id },
    data: { lastSyncStatus: "running", lastSyncError: null },
  });

  try {
    const apiKey = decrypt(keyRow.apiKeyEnc);
    const apiSecret = decrypt(keyRow.apiSecretEnc);

    const trades = await conn.fetchBtcTrades(apiKey, apiSecret);

    const coin = await prisma.coin.upsert({
      where: { symbol: "BTC" },
      update: {},
      create: { symbol: "BTC", name: "Bitcoin", assetType: "CRYPTO" },
    });

    let imported = 0;
    if (trades.length > 0) {
      const res = await prisma.transaction.createMany({
        data: trades.map((t) => ({
          userId,
          coinId: coin.id,
          type: t.type,
          amount: t.amount,
          price: t.price,
          totalValue: t.totalValue,
          currency: t.currency,
          exchange,
          txDate: t.txDate,
          externalId: t.externalId,
          source: "sync",
        })),
        skipDuplicates: true, // กันซ้ำตาม unique (userId, exchange, externalId)
      });
      imported = res.count;
    }

    await prisma.exchangeApiKey.update({
      where: { id: keyRow.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: "ok",
        lastSyncError: null,
        lastSyncCount: imported,
      },
    });

    return { ok: true, imported, fetched: trades.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sync failed";
    await prisma.exchangeApiKey.update({
      where: { id: keyRow.id },
      data: { lastSyncStatus: "error", lastSyncError: msg },
    });
    return { ok: false, imported: 0, fetched: 0, error: msg };
  }
}
