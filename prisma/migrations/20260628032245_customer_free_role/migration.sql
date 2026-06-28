-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER_FREE';

-- Seed role CUSTOMER_FREE (สิทธิ์เท่ากับ CUSTOMER — ถูกจำกัดด้วยโควต้า free แทน)
INSERT INTO "Role" ("id", "name", "label", "permissions", "isSystem")
VALUES (
  'role_customer_free',
  'CUSTOMER_FREE',
  'Customer (Free)',
  '{"dashboard":true,"upload":true,"chart":true,"share":true,"subscription":true,"settings":true}',
  true
)
ON CONFLICT ("name") DO NOTHING;

-- Migrate ผู้ใช้เดิมที่เป็น free → CUSTOMER_FREE (ผู้ที่ paid+active คงเป็น CUSTOMER, ADMIN ไม่แตะ)
UPDATE "User"
SET "role" = 'CUSTOMER_FREE'
WHERE "role" = 'CUSTOMER' AND ("plan" IS NULL OR "plan" = 'free');
