"use client";

import { useLocale } from "@/contexts/locale-context";
import { LegalShell, type LegalSection } from "@/components/legal-shell";

const TH: LegalSection[] = [
  { h: "ข้อมูลที่เราเก็บ", p: [
    "ข้อมูลบัญชี: อีเมล, ชื่อที่แสดง, รูปโปรไฟล์ (ถ้าอัปโหลด), รหัสผ่าน (เก็บแบบเข้ารหัส/hash)",
    "ข้อมูลการใช้งาน: รายการซื้อ/ขาย Bitcoin ที่คุณบันทึกหรือดึงเข้ามา",
    "ข้อมูลการเชื่อมต่อ Exchange: API key/secret ของ exchange (เก็บแบบ \"เข้ารหัส\")",
    "ข้อมูลทางเทคนิค: สถานะออนไลน์ (last seen), log การใช้งานทั่วไปเพื่อความปลอดภัยของระบบ",
  ]},
  { h: "วัตถุประสงค์และฐานทางกฎหมาย", p: [
    "เราใช้ข้อมูลเพื่อให้บริการ (แสดงพอร์ต, คำนวณต้นทุน/กำไร), ยืนยันตัวตน, ประมวลผลการชำระเงินสมาชิก และรักษาความปลอดภัยของระบบ",
    "ฐานทางกฎหมายตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล (PDPA): การปฏิบัติตามสัญญาการให้บริการ และความยินยอมของคุณ",
  ]},
  { h: "การเก็บ API Key ของ Exchange", p: [
    "API secret ถูกเข้ารหัสด้วย AES-256-GCM ก่อนจัดเก็บ และจะไม่ถูกแสดงกลับให้เห็นอีก (โชว์เพียง 4 ตัวท้าย)",
    "เราแนะนำให้ใช้ key แบบอ่านอย่างเดียว และเรียกใช้เพียงเพื่อดึงประวัติธุรกรรมของคุณเท่านั้น",
  ]},
  { h: "การเปิดเผยต่อบุคคลที่สาม", p: [
    "เราไม่ขายข้อมูลส่วนบุคคลของคุณ",
    "เราใช้ผู้ประมวลผลข้อมูล (data processor) เท่าที่จำเป็น เช่น ผู้ให้บริการคลาวด์ (AWS), ผู้ให้บริการ OCR และผู้ให้บริการอีเมล ภายใต้ข้อผูกพันด้านความปลอดภัย",
  ]},
  { h: "การจัดเก็บและความปลอดภัย", p: [
    "ข้อมูลจัดเก็บบนโครงสร้างพื้นฐาน AWS (region ประเทศไทย) พร้อมมาตรการ เช่น การเข้ารหัสข้อมูลอ่อนไหว, HTTPS, และการจำกัดสิทธิ์การเข้าถึง",
    "แม้เราใช้มาตรการที่เหมาะสม แต่ไม่มีระบบใดปลอดภัย 100% กรุณาดูแลรหัสผ่านของคุณ",
  ]},
  { h: "ระยะเวลาการเก็บข้อมูล", p: [
    "เราเก็บข้อมูลตราบเท่าที่บัญชีของคุณยังใช้งานอยู่ หรือเท่าที่จำเป็นตามกฎหมาย เมื่อคุณลบบัญชี เราจะลบหรือทำให้ข้อมูลไม่ระบุตัวตนตามความเหมาะสม",
  ]},
  { h: "สิทธิของเจ้าของข้อมูล (PDPA)", p: [
    "คุณมีสิทธิ์ขอเข้าถึง แก้ไข ลบ ระงับการใช้ คัดค้าน โอนย้ายข้อมูล และถอนความยินยอม",
    "ส่วนใหญ่ทำได้เองในแอป (แก้โปรไฟล์/รหัสผ่าน, ลบการเชื่อมต่อ exchange) หรือติดต่อเราเพื่อดำเนินการ",
  ]},
  { h: "คุกกี้", p: [
    "เราใช้คุกกี้/ที่จัดเก็บในเบราว์เซอร์เท่าที่จำเป็นสำหรับการเข้าสู่ระบบ (session) และการจดจำภาษา/ธีม",
  ]},
  { h: "การเปลี่ยนแปลงนโยบายและการติดต่อ", p: [
    "เราอาจปรับปรุงนโยบายนี้เป็นครั้งคราว และจะแจ้งการเปลี่ยนแปลงที่สำคัญตามความเหมาะสม",
    "ติดต่อเรื่องข้อมูลส่วนบุคคล: kebsats@gmail.com",
  ]},
];

const EN: LegalSection[] = [
  { h: "Information We Collect", p: [
    "Account data: email, display name, profile photo (if uploaded), password (stored hashed/encrypted).",
    "Usage data: Bitcoin buy/sell transactions you record or import.",
    "Exchange connection data: exchange API key/secret (stored encrypted).",
    "Technical data: online status (last seen) and general activity logs for system security.",
  ]},
  { h: "Purpose and Legal Basis", p: [
    "We use your data to provide the Service (portfolio, cost/P&L calculations), authenticate you, process subscription payments, and secure the system.",
    "Legal basis under Thailand's PDPA: performance of the service contract and your consent.",
  ]},
  { h: "Storage of Exchange API Keys", p: [
    "API secrets are encrypted with AES-256-GCM before storage and are never shown back (only the last 4 characters are displayed).",
    "We recommend read-only keys and use them solely to fetch your transaction history.",
  ]},
  { h: "Disclosure to Third Parties", p: [
    "We do not sell your personal data.",
    "We use data processors only as necessary, such as cloud hosting (AWS), OCR providers, and email providers, under security obligations.",
  ]},
  { h: "Storage and Security", p: [
    "Data is stored on AWS infrastructure (Thailand region) with measures such as encryption of sensitive data, HTTPS, and access controls.",
    "While we use appropriate measures, no system is 100% secure. Please protect your password.",
  ]},
  { h: "Data Retention", p: [
    "We retain data while your account is active or as required by law. When you delete your account, we delete or anonymize data as appropriate.",
  ]},
  { h: "Your Rights (PDPA)", p: [
    "You have the right to access, rectify, erase, restrict, object to, and port your data, and to withdraw consent.",
    "Most can be done in-app (edit profile/password, remove exchange connections) or by contacting us.",
  ]},
  { h: "Cookies", p: [
    "We use cookies/browser storage only as needed for sign-in (session) and to remember your language/theme.",
  ]},
  { h: "Changes and Contact", p: [
    "We may update this policy from time to time and will notify significant changes as appropriate.",
    "Privacy contact: kebsats@gmail.com",
  ]},
];

export default function PrivacyPage() {
  const { locale } = useLocale();
  const th = locale === "th";
  return (
    <LegalShell
      title={th ? "นโยบายความเป็นส่วนตัว" : "Privacy Policy"}
      updatedLabel={th ? "ปรับปรุงล่าสุด: 1 กรกฎาคม 2026" : "Last updated: 1 July 2026"}
      backLabel={th ? "กลับไปหน้าสมัคร" : "Back to sign up"}
      sections={th ? TH : EN}
    />
  );
}
