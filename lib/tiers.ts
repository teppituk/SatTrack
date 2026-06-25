// ระดับการสะสม Bitcoin (holder tier) ตามจำนวน BTC ที่ถือ
export interface BtcTier {
  key: string;
  emoji: string;
  name: string; // EN label
  min: number; // inclusive (BTC)
  max: number | null; // exclusive; null = ไม่มีเพดาน
  rangeLabel: string;
  descTh: string;
  descEn: string;
  color: string; // tailwind text color
}

// เรียงจากน้อยไปมาก
// หมายเหตุ: ผู้ใช้ระบุ Shark 100–500 แต่ Whale เริ่ม 1,000 จึงขยาย Shark เป็น 100–1,000
// เพื่อไม่ให้มีช่วงที่ไม่เข้าระดับใด
export const BTC_TIERS: BtcTier[] = [
  {
    key: "shrimp",
    emoji: "🦐",
    name: "Shrimp",
    min: 0,
    max: 1,
    rangeLabel: "< 1 BTC",
    descTh: "เริ่มต้นสะสม มักเป็นนักลงทุนรายย่อย ซื้อ DCA ทีละนิด",
    descEn: "Just starting out — typically a retail stacker DCAing little by little.",
    color: "text-pink-400",
  },
  {
    key: "crab",
    emoji: "🦀",
    name: "Crab",
    min: 1,
    max: 10,
    rangeLabel: "1–10 BTC",
    descTh: "เริ่มจริงจังแล้ว มีมูลค่าพอสมควร ต้องใช้เวลาและวินัยในการสะสม",
    descEn: "Getting serious — a meaningful stack that takes time and discipline.",
    color: "text-orange-400",
  },
  {
    key: "octopus",
    emoji: "🦑",
    name: "Octopus",
    min: 10,
    max: 50,
    rangeLabel: "10–50 BTC",
    descTh: "นักลงทุนที่มีความมั่งคั่งระดับกลาง เข้าใจ Bitcoin อย่างลึกซึ้ง",
    descEn: "Mid-tier wealth with a deep understanding of Bitcoin.",
    color: "text-purple-400",
  },
  {
    key: "fish",
    emoji: "🐟",
    name: "Fish",
    min: 50,
    max: 100,
    rangeLabel: "50–100 BTC",
    descTh: "เริ่มมีอิทธิพลต่อตลาดได้บ้าง มูลค่าระดับหลายล้านดอลลาร์",
    descEn: "Some market influence — worth several million dollars.",
    color: "text-cyan-400",
  },
  {
    key: "shark",
    emoji: "🦈",
    name: "Shark",
    min: 100,
    max: 1000,
    rangeLabel: "100–1,000 BTC",
    descTh: "นักลงทุนสถาบันขนาดเล็ก หรือ HNWI (High Net Worth Individual)",
    descEn: "A small institution or High Net Worth Individual (HNWI).",
    color: "text-blue-400",
  },
  {
    key: "whale",
    emoji: "🐋",
    name: "Whale",
    min: 1000,
    max: 5000,
    rangeLabel: "1,000–5,000 BTC",
    descTh: "มีอำนาจขยับตลาดได้จริง การเคลื่อนไหว on-chain ถูกจับตามอง",
    descEn: "Can genuinely move the market — on-chain moves are watched closely.",
    color: "text-indigo-400",
  },
  {
    key: "humpback",
    emoji: "🐳",
    name: "Humpback",
    min: 5000,
    max: null,
    rangeLabel: "5,000+ BTC",
    descTh: "ระดับ exchange, กองทุน, หรือ early adopter ที่ถือมาตั้งแต่ต้น",
    descEn: "Exchange, fund, or early adopter holding since the beginning.",
    color: "text-teal-300",
  },
];

// ระดับปัจจุบันจากจำนวน BTC
export function getBtcTier(btc: number): BtcTier {
  const amount = Math.max(0, btc || 0);
  // หา tier สูงสุดที่ amount >= min
  for (let i = BTC_TIERS.length - 1; i >= 0; i--) {
    if (amount >= BTC_TIERS[i].min) return BTC_TIERS[i];
  }
  return BTC_TIERS[0];
}

// ระดับถัดไป (null ถ้าสูงสุดแล้ว)
export function getNextTier(btc: number): BtcTier | null {
  const current = getBtcTier(btc);
  const idx = BTC_TIERS.findIndex((t) => t.key === current.key);
  return idx >= 0 && idx < BTC_TIERS.length - 1 ? BTC_TIERS[idx + 1] : null;
}

// ความคืบหน้าภายใน tier ปัจจุบันไปยัง tier ถัดไป (0–100)
export function tierProgress(btc: number): number {
  const amount = Math.max(0, btc || 0);
  const current = getBtcTier(btc);
  if (current.max === null) return 100;
  const span = current.max - current.min;
  if (span <= 0) return 100;
  return Math.min(100, Math.max(0, ((amount - current.min) / span) * 100));
}
