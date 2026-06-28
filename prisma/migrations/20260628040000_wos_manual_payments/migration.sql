-- Manual Wallet of Satoshi payments: extend Subscription
ALTER TABLE "Subscription" ALTER COLUMN "invoiceId" DROP NOT NULL;
ALTER TABLE "Subscription" ADD COLUMN "refCode" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "planType" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "note" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "reviewedBy" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "reviewedAt" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX "Subscription_refCode_key" ON "Subscription"("refCode");
