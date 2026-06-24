import { prisma } from "@/lib/prisma";

export const PLAN_DURATION_DAYS = {
  monthly: 30,
  annual: 365,
} as const;

// แปลง amountSats → จำนวนวัน (annual ตั้งแต่ 100k sats ขึ้นไป)
function durationFromSats(amountSats: number): number {
  return amountSats >= 100000 ? PLAN_DURATION_DAYS.annual : PLAN_DURATION_DAYS.monthly;
}

// ตรวจว่าแผน paid ยัง active อยู่ไหม (paid + ยังไม่หมดอายุ)
export function isPlanActive(plan: string | null, planExpiresAt: Date | null): boolean {
  return plan === "paid" && !!planExpiresAt && planExpiresAt > new Date();
}

/**
 * เปิดใช้งาน subscription จาก invoiceId (idempotent)
 * — ใช้ร่วมกันระหว่าง webhook ของ BTCPay และ verify endpoint
 * — ถ้าแผนยัง active อยู่จะต่ออายุจากวันหมดอายุเดิม
 */
export async function activateSubscriptionByInvoice(invoiceId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findFirst({ where: { invoiceId } });
  if (!subscription) return false;
  if (subscription.status === "paid") return true; // ทำไปแล้ว

  const user = await prisma.user.findUnique({
    where: { id: subscription.userId },
    select: { planExpiresAt: true },
  });

  // ต่ออายุจากวันหมดอายุเดิมถ้ายัง active ไม่งั้นนับจากวันนี้
  const base =
    user?.planExpiresAt && user.planExpiresAt > new Date()
      ? new Date(user.planExpiresAt)
      : new Date();
  base.setDate(base.getDate() + durationFromSats(subscription.amountSats));

  await prisma.$transaction([
    prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "paid", paidAt: new Date() },
    }),
    prisma.user.update({
      where: { id: subscription.userId },
      data: { plan: "paid", planExpiresAt: base },
    }),
  ]);

  return true;
}
