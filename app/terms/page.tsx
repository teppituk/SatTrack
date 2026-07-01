"use client";

import { useLocale } from "@/contexts/locale-context";
import { LegalShell, type LegalSection } from "@/components/legal-shell";

const TH: LegalSection[] = [
  { h: "การยอมรับข้อกำหนด", p: [
    "การสมัครและใช้งาน KebSats (\"บริการ\") ถือว่าคุณได้อ่าน เข้าใจ และยอมรับข้อกำหนดการใช้งานนี้ หากไม่ยอมรับ กรุณางดใช้บริการ",
  ]},
  { h: "ลักษณะของบริการ", p: [
    "KebSats เป็นเครื่องมือสำหรับบันทึกและติดตามการสะสม Bitcoin ของผู้ใช้ (portfolio tracker) เท่านั้น",
    "KebSats ไม่ใช่ตลาดซื้อขาย ไม่ใช่นายหน้า/ผู้ค้า และไม่รับฝาก/ถือครองสินทรัพย์ดิจิทัลหรือเงินของผู้ใช้ เราไม่ดำเนินการซื้อ-ขายแทนคุณ",
    "ข้อมูลและสถิติในบริการ (เช่น ต้นทุนเฉลี่ย กำไร/ขาดทุน) มีไว้เพื่อการติดตามส่วนบุคคล ไม่ถือเป็นคำแนะนำการลงทุน",
  ]},
  { h: "บัญชีผู้ใช้", p: [
    "คุณต้องให้ข้อมูลที่ถูกต้องและเป็นปัจจุบัน และรับผิดชอบในการรักษารหัสผ่านของคุณเป็นความลับ",
    "คุณรับผิดชอบต่อกิจกรรมทั้งหมดที่เกิดขึ้นภายใต้บัญชีของคุณ",
  ]},
  { h: "การเชื่อมต่อ Exchange (API Key)", p: [
    "หากคุณเชื่อมต่อบัญชี exchange คุณควรใช้ API key แบบ \"อ่านอย่างเดียว\" (ปิดสิทธิ์ถอนเงินและเทรด)",
    "คุณเป็นผู้รับผิดชอบต่อ API key ของคุณเอง เราเก็บ API secret แบบเข้ารหัสและใช้เพียงเพื่อดึงประวัติธุรกรรมมาแสดงเท่านั้น",
  ]},
  { h: "การเป็นสมาชิกและการชำระเงิน", p: [
    "แผน Pro ชำระผ่าน Lightning Network (Wallet of Satoshi) และมีผลตามระยะเวลาที่ระบุ (รายเดือน/รายปี)",
    "เมื่อสมาชิกหมดอายุ ฟีเจอร์ Pro จะถูกปิด แต่ข้อมูลธุรกรรมของคุณจะยังคงอยู่ และจะแสดงเหมือนเดิมเมื่อคุณต่ออายุ",
    "เนื่องจากเป็นสินค้าดิจิทัลที่เปิดใช้งานทันที การชำระเงินโดยทั่วไปไม่สามารถขอคืนได้ เว้นแต่กฎหมายกำหนด",
  ]},
  { h: "ข้อจำกัดความรับผิด", p: [
    "บริการให้ \"ตามสภาพ\" (as is) เราไม่รับประกันความถูกต้องครบถ้วนของข้อมูลราคาหรือข้อมูลที่ดึงจากบุคคลที่สาม (exchange, ผู้ให้ราคา)",
    "คุณรับความเสี่ยงในการตัดสินใจลงทุนด้วยตนเอง KebSats ไม่รับผิดต่อความเสียหายใด ๆ ที่เกิดจากการใช้ข้อมูลในบริการ",
  ]},
  { h: "การใช้งานที่ยอมรับได้", p: [
    "ห้ามใช้บริการเพื่อการผิดกฎหมาย ห้ามพยายามเข้าถึงระบบโดยไม่ได้รับอนุญาต แทรกแซง หรือทำให้บริการเสียหาย",
  ]},
  { h: "ทรัพย์สินทางปัญญา", p: [
    "ซอฟต์แวร์ เครื่องหมาย และเนื้อหาของ KebSats เป็นกรรมสิทธิ์ของเรา ข้อมูลที่คุณป้อนยังเป็นของคุณ",
  ]},
  { h: "การระงับ/ยกเลิกบัญชี", p: [
    "เราสงวนสิทธิ์ในการระงับหรือยกเลิกบัญชีที่ละเมิดข้อกำหนดนี้ คุณสามารถขอลบบัญชีได้ตลอดเวลา",
  ]},
  { h: "การเปลี่ยนแปลงข้อกำหนด", p: [
    "เราอาจปรับปรุงข้อกำหนดนี้เป็นครั้งคราว การใช้บริการต่อหลังการเปลี่ยนแปลงถือว่ายอมรับข้อกำหนดฉบับใหม่",
  ]},
  { h: "กฎหมายที่ใช้บังคับและการติดต่อ", p: [
    "ข้อกำหนดนี้อยู่ภายใต้กฎหมายแห่งราชอาณาจักรไทย",
    "ติดต่อ: kebsats@gmail.com",
  ]},
];

const EN: LegalSection[] = [
  { h: "Acceptance of Terms", p: [
    "By creating an account and using KebSats (the \"Service\"), you confirm that you have read, understood, and agree to these Terms of Service. If you do not agree, please do not use the Service.",
  ]},
  { h: "Nature of the Service", p: [
    "KebSats is a personal Bitcoin portfolio tracker only.",
    "KebSats is not an exchange, broker, or dealer, and does not custody or hold any digital assets or funds on your behalf. We do not execute trades for you.",
    "Data and statistics in the Service (e.g. average cost, P&L) are for personal tracking and do not constitute investment advice.",
  ]},
  { h: "User Accounts", p: [
    "You must provide accurate, current information and keep your password confidential.",
    "You are responsible for all activity that occurs under your account.",
  ]},
  { h: "Exchange Connections (API Keys)", p: [
    "If you connect an exchange account, you should use a read-only API key (withdrawals and trading disabled).",
    "You are responsible for your own API keys. We store API secrets encrypted and use them solely to fetch your transaction history for display.",
  ]},
  { h: "Subscription and Payments", p: [
    "The Pro plan is paid via the Lightning Network (Wallet of Satoshi) and is valid for the stated period (monthly/annual).",
    "When a subscription expires, Pro features are disabled, but your transaction data is retained and shown as before when you renew.",
    "As this is a digital product activated immediately, payments are generally non-refundable unless required by law.",
  ]},
  { h: "Disclaimer / Limitation of Liability", p: [
    "The Service is provided \"as is\". We do not warrant the accuracy or completeness of price data or data fetched from third parties (exchanges, price providers).",
    "You bear the risk of your own investment decisions. KebSats is not liable for any damages arising from use of the Service.",
  ]},
  { h: "Acceptable Use", p: [
    "You may not use the Service for any unlawful purpose, attempt unauthorized access, interfere with, or disrupt the Service.",
  ]},
  { h: "Intellectual Property", p: [
    "The KebSats software, marks, and content are our property. Data you enter remains yours.",
  ]},
  { h: "Suspension / Termination", p: [
    "We may suspend or terminate accounts that violate these Terms. You may request account deletion at any time.",
  ]},
  { h: "Changes to Terms", p: [
    "We may update these Terms from time to time. Continued use after changes constitutes acceptance of the updated Terms.",
  ]},
  { h: "Governing Law and Contact", p: [
    "These Terms are governed by the laws of the Kingdom of Thailand.",
    "Contact: kebsats@gmail.com",
  ]},
];

export default function TermsPage() {
  const { locale } = useLocale();
  const th = locale === "th";
  return (
    <LegalShell
      title={th ? "ข้อกำหนดการใช้งาน" : "Terms of Service"}
      updatedLabel={th ? "ปรับปรุงล่าสุด: 1 กรกฎาคม 2026" : "Last updated: 1 July 2026"}
      backLabel={th ? "กลับไปหน้าสมัคร" : "Back to sign up"}
      sections={th ? TH : EN}
    />
  );
}
