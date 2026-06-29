-- Transaction: เพิ่มฟิลด์สำหรับ sync จาก exchange + กันซ้ำ
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'manual';

-- กันบันทึกซ้ำตอน sync (NULL externalId ถือว่าไม่ซ้ำกันใน Postgres → manual/import ไม่กระทบ)
CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_userId_exchange_externalId_key"
  ON "Transaction" ("userId", "exchange", "externalId");

-- เก็บ API key ของ user ต่อ exchange (secret เข้ารหัส)
CREATE TABLE IF NOT EXISTS "ExchangeApiKey" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "exchange" TEXT NOT NULL,
  "apiKeyEnc" TEXT NOT NULL,
  "apiSecretEnc" TEXT NOT NULL,
  "keyHint" TEXT,
  "label" TEXT,
  "lastSyncAt" TIMESTAMP(3),
  "lastSyncStatus" TEXT,
  "lastSyncError" TEXT,
  "lastSyncCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExchangeApiKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ExchangeApiKey_userId_exchange_key"
  ON "ExchangeApiKey" ("userId", "exchange");

ALTER TABLE "ExchangeApiKey" ADD CONSTRAINT "ExchangeApiKey_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
