import { prisma } from "@/lib/prisma";

export const PLAN_DURATION_DAYS = {
  monthly: 30,
  annual: 365,
} as const;

// ตรวจว่าแผน paid ยัง active อยู่ไหม (paid + ยังไม่หมดอายุ)
export function isPlanActive(plan: string | null, planExpiresAt: Date | null): boolean {
  return plan === "paid" && !!planExpiresAt && planExpiresAt > new Date();
}

/**
 * ปรับสถานะให้ตรงความจริงตามอายุแผน (idempotent) — คืน role ที่ถูกต้อง
 * - active (paid + ยังไม่หมด) → CUSTOMER
 * - หมดอายุ → plan free + role CUSTOMER_FREE
 * - ADMIN คงเดิมเสมอ · ไม่แตะข้อมูล transaction
 */
export async function syncExpiredPlan(user: {
  id: string;
  plan: string | null;
  planExpiresAt: Date | null;
  role: string | null;
}): Promise<string> {
  const currentRole = user.role ?? "CUSTOMER_FREE";
  if (currentRole === "ADMIN") return "ADMIN";

  if (isPlanActive(user.plan, user.planExpiresAt)) {
    if (currentRole !== "CUSTOMER") {
      await prisma.user.update({ where: { id: user.id }, data: { role: "CUSTOMER" } });
    }
    return "CUSTOMER";
  }

  // free หรือหมดอายุ → CUSTOMER_FREE (ถ้าเคย paid ให้ปรับ plan เป็น free ด้วย)
  const wasPaid = user.plan === "paid";
  if (currentRole !== "CUSTOMER_FREE" || wasPaid) {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "CUSTOMER_FREE", ...(wasPaid ? { plan: "free" } : {}) },
    });
  }
  return "CUSTOMER_FREE";
}
