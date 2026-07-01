# KebSats — Bitcoin Stack Tracker

Web application สำหรับนักสะสม Bitcoin ชาวไทย — ติดตามการสะสม BTC จากหลายเอ็กซ์เชนจ์ (Bitkub, Binance) ดูต้นทุนเฉลี่ย/กำไร-ขาดทุน แชร์พอร์ต และสมัครสมาชิกชำระผ่าน Lightning Network

> เดิมชื่อ SlipFolio → StackSats → KeepSats — ปัจจุบันคือ **KebSats**

---

## Features

### Admin Panel
- แยก Admin / Customer ใช้หน้า Login เดียวกัน, เข้า `/admin` ได้เฉพาะ ADMIN
- **Overview** — ภาพรวมระบบ (จำนวน user, transaction ฯลฯ)
- **User Management** — เปิด/ปิดบัญชี, กำหนด Role, เห็น Online/Offline แบบ real-time (heartbeat ทุก 30 วิ)
  - ตั้ง Role เป็น `CUSTOMER_FREE` → ดึง user กลับเป็นแผนฟรีทันที (รีเซ็ต `plan=free`, ปิด PRO — **ไม่ลบ transaction**)
- **Role Management** — สร้าง/แก้ Role + permissions รายเมนู (แก้ได้ทุก Role รวม System Role แต่ลบ System Role ไม่ได้)
- **Exchange Management** — จัดการรายชื่อเอ็กซ์เชนจ์
- **Payments** — อนุมัติ/ปฏิเสธคำขอชำระเงิน (Wallet of Satoshi) + badge แจ้งจำนวนรายการ pending บนเมนู
- **Payment Settings** — ตั้งค่า Lightning address + ราคาแพ็คเกจ (sats)

### Authentication
- สมัคร/เข้าสู่ระบบด้วย Email + Password (NextAuth.js, JWT strategy)
- Role + permissions ฝังใน JWT (ดึงสด role จาก DB ทุก request)
- รีเซ็ตรหัสผ่านผ่าน Email Link (หมดอายุ 15 นาที)

### Portfolio Dashboard
- พอร์ตแยกรายเหรียญ + รวม, สกุล THB / USD
- Unrealized & Realized P&L, ต้นทุนเฉลี่ย (cost basis), Allocation
- ราคา BTC สด (Bitkub + Binance + CoinGecko, มี cache + last-good fallback) พร้อมเวลาอัปเดตล่าสุด
- แสดงระดับนักสะสม (Holder Tier 🦐 → 🐳)

### Stack Bitcoin (บันทึกการซื้อ/ขาย)
- กรอกเอง — เติมราคา BTC สดอัตโนมัติ (แก้ได้), กรอกมูลค่ารวมแล้วคำนวณจำนวนให้, แนบรูปสลิป
- **Slip OCR** — Gemini 2.0 Flash (หลัก) → fallback Claude เมื่อ quota หมด, แก้ก่อนยืนยันได้
- **นำเข้า Excel (.xlsx)** — import ประวัติเทรดย้อนหลัง (รองรับ header ไทย/อังกฤษ)

### Exchange Sync (เชื่อมต่อ Exchange) — **PRO เท่านั้น**
- เชื่อม **Bitkub** และ **Binance (global)** ด้วย API key แบบ **อ่านอย่างเดียว** ของผู้ใช้เอง
- ดึงประวัติเทรด BTC อัตโนมัติ → บันทึกเป็น Transaction (กดปุ่ม Sync now)
- กันข้อมูลซ้ำด้วย unique `(userId, exchange, externalId)` + `skipDuplicates`
- เก็บ API secret แบบ **เข้ารหัส AES-256-GCM** (ไม่โชว์กลับ client), ทดสอบ key ก่อนบันทึก

### Buy/Sell Chart
- กราฟจุดซื้อ/ขายบนเส้นราคา สไตล์ Bitcoin Reserve (recharts): area price, stepped avg cost basis, bubble ตามจำนวน BTC
- ปุ่มเลือกช่วงเวลา + brush, กรองตามเอ็กซ์เชนจ์, tooltip โชว์ราคาซื้อจริง

### Share Portfolio
- Share Link ส่วนตัว (token) — แชร์ผ่าน LINE / X / Facebook / QR
- OG card สวยสำหรับ social, **Privacy Mode** (โชว์แค่ % กำไร + badge), เลือกข้อมูลที่แสดง, ตั้งวันหมดอายุ

### Profile
- แก้ชื่อที่แสดง, อัปโหลด/เปลี่ยน/ลบ **รูปโปรไฟล์**, **เปลี่ยนรหัสผ่าน** (ยืนยันรหัสเดิม)

### Subscription
- **Free**: จำกัด 50 transaction / เดือน
- **PRO**: ไม่จำกัด transaction + **เชื่อมต่อ Exchange** + ฟีเจอร์เต็ม
- ชำระด้วย **Lightning Network ผ่าน Wallet of Satoshi** (manual flow):
  - สร้าง bolt11 invoice ผ่าน LNURL-pay พร้อมจำนวน sats + refCode (`PAY-XXXXXX`) ใน memo
  - Admin อ่าน memo แล้วอนุมัติ/ปฏิเสธ
- Role lifecycle: สมัคร → `CUSTOMER_FREE`; จ่ายรายเดือน/รายปี → `CUSTOMER` (30/365 วัน); หมดอายุ → กลับ `CUSTOMER_FREE`
- **ไม่ลบ transaction ของ user เด็ดขาด** — จ่ายใหม่ข้อมูลเดิมแสดงเหมือนเดิม

### อื่น ๆ
- รองรับ 2 ภาษา (TH / EN) เปลี่ยนได้ตลอด + Theme switcher
- Bitcoin Whitepaper ในตัว
- Security hardening: CloudFront security headers, WAF rate-limit, จำกัด origin, ลบ x-powered-by

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), Tailwind CSS, lucide-react |
| Backend | Next.js API Routes (Node runtime) |
| Database | PostgreSQL + Prisma ORM |
| Auth | NextAuth.js (JWT strategy, Credentials) |
| Charts | Recharts (ComposedChart / Area / Line / Scatter / Brush) |
| Slip OCR | Google Gemini 2.0 Flash (primary) + Claude (fallback) |
| Lightning | Wallet of Satoshi (Lightning address) + LNURL-pay (bolt11) |
| Crypto (security) | AES-256-GCM (เข้ารหัส exchange API secret) |
| Storage | AWS S3 (รูปสลิป + avatar, serve ผ่าน API auth-gated) |
| Queue | Redis + BullMQ (OCR job queue) |
| i18n | locale context (messages/en.json, th.json) |
| Deploy | AWS — CloudFront + EC2 (Docker Compose) + RDS + ElastiCache + S3 |

---

## Data Model (Prisma)

```
User
  id, email (unique), password?, name?, image?,
  role (default "CUSTOMER_FREE"), isActive, plan (free|paid), planExpiresAt?,
  lastSeenAt (online tracking), createdAt
  relations: transactions, shareLinks, subscriptions, exchangeApiKeys, accounts, sessions

Role
  id, name (unique), label, permissions (JSON), isSystem, createdAt
  permissions: { dashboard, upload, chart, share, subscription, settings }

AppSetting              # key-value config แก้ผ่าน admin (เช่น WoS Lightning address, ราคา sats)
  key (PK), value, updatedAt

Coin
  id, symbol (unique), name, assetType (CRYPTO|STOCK), coingeckoId?

Transaction
  id, userId, coinId, type (BUY|SELL),
  amount, price, totalValue, currency (THB|USDT|USD),
  exchange (bitkub|binance|set|...), txDate, slipImageUrl?,
  externalId? (trade id จาก exchange), source (manual|import|sync), createdAt
  @@unique([userId, exchange, externalId])   # กันซ้ำตอน sync

Exchange
  id, code (unique: bitkub|binance), name, isActive, createdAt

ExchangeApiKey          # API key ของ user (secret เข้ารหัส)
  id, userId, exchange, apiKeyEnc, apiSecretEnc, keyHint,
  label?, lastSyncAt?, lastSyncStatus?, lastSyncError?, lastSyncCount, createdAt
  @@unique([userId, exchange])

ShareLink
  id, userId, token (unique), config (JSON), expiresAt?, createdAt

Subscription            # คำขอ/ประวัติชำระเงิน (Wallet of Satoshi)
  id, userId, invoiceId?, refCode? (unique, "PAY-XXXXXX"),
  planType? (monthly|annual), amountSats, status (pending|paid|rejected),
  note?, reviewedBy?, reviewedAt?, paidAt?, createdAt

Account / Session       # NextAuth Prisma adapter
```

---

## Deployment (Production)

ใช้งานจริงที่ **AWS region ap-southeast-7 (Thailand)**:

```
                 CloudFront (HTTPS, security headers, WAF)
                        │  http-only
                        ▼
        EC2 (t3.micro, Ubuntu, Docker Compose)
        ├── web     :3000   (Next.js — รัน prisma migrate deploy ตอน start)
        └── worker          (BullMQ — OCR jobs)
                        │
     ┌──────────────────┼────────────────────┐
     ▼                  ▼                     ▼
 RDS PostgreSQL   ElastiCache Redis      S3 (slips + avatars, private)
```

- Postgres/Redis เป็น managed (ไม่อยู่ใน docker-compose)
- web container รัน `prisma migrate deploy` อัตโนมัติก่อน start
- รายละเอียดเต็ม: ดู `DEPLOY_AWS.md` และ `DEPLOY_PROMPT.md`

### Update / Redeploy (บน EC2)
```bash
cd /opt/SatTrack
git pull            # หรือ git fetch && git reset --hard origin/master
docker compose --env-file .env.production up -d --build
```
> t3.micro: build กิน RAM — มี swap 4GB + `NODE_OPTIONS=--max-old-space-size=2048`; แนะนำ `docker compose stop worker` ระหว่าง build

---

## Environment Variables

```env
# Database
DATABASE_URL=                 # postgres ... ?sslmode=require (RDS)

# NextAuth
NEXTAUTH_SECRET=              # openssl rand -base64 32
NEXTAUTH_URL=                 # https://<cloudfront-domain>
NEXT_PUBLIC_APP_URL=          # https://<cloudfront-domain>

# Slip OCR
GEMINI_API_KEY=               # primary (aistudio.google.com)
ANTHROPIC_API_KEY=            # fallback (console.anthropic.com)

# Storage (หรือใช้ EC2 instance role แทน key)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=                   # ap-southeast-7
S3_BUCKET_NAME=

# Queue
REDIS_URL=

# Exchange API key encryption (จำเป็นสำหรับฟีเจอร์ Exchange Sync)
ENCRYPTION_KEY=               # AES-256-GCM 32 bytes: openssl rand -hex 32

# Email (Reset Password)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=
```

> ค่า Wallet of Satoshi (Lightning address, ราคา sats รายเดือน/รายปี) เก็บใน DB (`AppSetting`)
> ตั้งผ่าน **Admin → Payment Settings** ไม่ใช่ env

---

## Getting Started (Local)

```bash
# 1) ติดตั้ง dependencies
npm install

# 2) ตั้งค่า .env (DATABASE_URL, NEXTAUTH_SECRET, ENCRYPTION_KEY ฯลฯ)
cp .env.example .env

# 3) รัน migration
npx prisma migrate deploy   # หรือ migrate dev (interactive)
npx prisma generate

# 4) seed system roles (ADMIN, CUSTOMER, CUSTOMER_FREE) — ถ้ายังไม่มี
#    (migration customer_free_role seed CUSTOMER_FREE ให้แล้ว)

# 5) รัน dev server + worker (คนละ terminal)
npm run dev
npm run worker
```

> เปลี่ยน schema แล้วต้อง `prisma generate` + **restart dev server** (ไม่งั้น client เก่าไม่รู้จัก field ใหม่)

---

## Project Structure

```
app/
├── (auth)/                    # login, register, reset-password
├── admin/
│   ├── page.tsx               # overview
│   ├── users/                 # user management + online status
│   ├── roles/                 # role + permission editor
│   ├── exchanges/             # exchange management
│   ├── payments/              # อนุมัติ/ปฏิเสธการชำระเงิน
│   └── settings/              # Wallet of Satoshi payment settings
├── dashboard/                 # portfolio dashboard
├── upload/                    # Stack Bitcoin (manual + OCR + Excel import)
├── chart/                     # buy/sell chart (recharts)
├── share/[token]/             # public share + OG card (og/route.tsx)
├── settings/
│   ├── profile/               # แก้ชื่อ + avatar + เปลี่ยนรหัสผ่าน
│   ├── exchanges/             # เชื่อมต่อ Exchange (PRO)
│   ├── share/                 # จัดการ share links
│   ├── subscription/          # แพ็คเกจ + ชำระเงิน Lightning
│   └── tiers/                 # ระดับนักสะสม
└── api/
    ├── exchanges/             # keys (add/test/delete) + sync
    ├── user/                  # profile, avatar, password
    ├── subscription/          # plans, invoice (LNURL bolt11)
    ├── admin/                 # users, roles, exchanges, payments, settings
    ├── transactions/          # CRUD + import (xlsx)
    ├── portfolio/             # คำนวณพอร์ต (THB/USD)
    └── ...
lib/
├── auth.ts                    # NextAuth + JWT (role/permissions/plan sync)
├── crypto.ts                  # AES-256-GCM (encrypt exchange secrets)
├── payments.ts                # WoS config, refCode, approve/reject
├── lnurl.ts                   # LNURL-pay → bolt11 + decode expiry
├── subscription.ts            # isPlanActive, syncExpiredPlan (role lifecycle)
├── exchanges/                 # connector interface + bitkub + binance + sync
├── gemini.ts / anthropic.ts   # slip OCR
└── worker.ts                  # BullMQ worker (OCR jobs)
prisma/
├── schema.prisma
└── migrations/
```

---

## License

Private — All rights reserved.
