import { prisma } from "@/lib/prisma";

// แผน manual payment ผ่าน Wallet of Satoshi (Lightning address) — admin approve เอง
export const PLAN_DURATION_DAYS = { monthly: 30, annual: 365 } as const;
const DEFAULTS = { monthlySats: 10000, annualSats: 100000 };

const CFG_KEYS = ["WOS_LIGHTNING_ADDRESS", "PLAN_MONTHLY_SATS", "PLAN_ANNUAL_SATS"];

export interface PaymentConfig {
  lightningAddress: string;
  monthlySats: number;
  annualSats: number;
}

export async function getPaymentConfig(): Promise<PaymentConfig> {
  let m: Record<string, string> = {};
  try {
    const rows = await prisma.appSetting.findMany({ where: { key: { in: CFG_KEYS } } });
    m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  } catch {
    /* table not ready */
  }
  const num = (k: string, d: number) => {
    const v = parseInt(m[k] || "", 10);
    return isNaN(v) || v <= 0 ? d : v;
  };
  return {
    lightningAddress: (m["WOS_LIGHTNING_ADDRESS"] || "").trim(),
    monthlySats: num("PLAN_MONTHLY_SATS", DEFAULTS.monthlySats),
    annualSats: num("PLAN_ANNUAL_SATS", DEFAULTS.annualSats),
  };
}

export async function getPlans() {
  const c = await getPaymentConfig();
  return {
    monthly: { amountSats: c.monthlySats, durationDays: PLAN_DURATION_DAYS.monthly, label: "Monthly Plan" },
    annual: { amountSats: c.annualSats, durationDays: PLAN_DURATION_DAYS.annual, label: "Annual Plan" },
  };
}

// รหัสอ้างอิงต่อรายการ (ใส่ใน memo) — เลี่ยงตัวอักษรที่สับสน
export function genRefCode(): string {
  const ab = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += ab[Math.floor(Math.random() * ab.length)];
  return `PAY-${s}`;
}

// อนุมัติ → เปิด subscription (plan paid + ต่ออายุ + role CUSTOMER, คง ADMIN) — ไม่แตะ transaction
export async function approvePaymentRequest(id: string, adminId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({ where: { id } });
  if (!sub) return false;
  if (sub.status === "paid") return true;

  const user = await prisma.user.findUnique({
    where: { id: sub.userId },
    select: { planExpiresAt: true, role: true },
  });
  const days = sub.planType === "annual" ? PLAN_DURATION_DAYS.annual : PLAN_DURATION_DAYS.monthly;
  const base =
    user?.planExpiresAt && user.planExpiresAt > new Date()
      ? new Date(user.planExpiresAt)
      : new Date();
  base.setDate(base.getDate() + days);
  const paidRole = user?.role === "ADMIN" ? "ADMIN" : "CUSTOMER";

  await prisma.$transaction([
    prisma.subscription.update({
      where: { id },
      data: { status: "paid", paidAt: new Date(), reviewedBy: adminId, reviewedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: sub.userId },
      data: { plan: "paid", planExpiresAt: base, role: paidRole },
    }),
  ]);
  return true;
}

export async function rejectPaymentRequest(
  id: string,
  adminId: string,
  reason?: string
): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({ where: { id } });
  if (!sub) return false;
  await prisma.subscription.update({
    where: { id },
    data: {
      status: "rejected",
      reviewedBy: adminId,
      reviewedAt: new Date(),
      note: reason?.trim() || sub.note,
    },
  });
  return true;
}
