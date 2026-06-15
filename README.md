# TestProduct — Crypto Slip Tracker

Web application สำหรับอัพโหลดไฟล์สลิปการซื้อขาย Bitcoin และเหรียญ Crypto อื่นๆ จาก Bitkub, Binance TH และ Binance พร้อมระบบ Portfolio Tracking และ Subscription ผ่าน Lightning Network

---

## Features

### Feature 0 — Admin
- อยากให้แยก User ระหว่าง Admin และ Customer
- ใช่หน้า login เดียวกัน
- ฝั่ง Customer ให้ให้ feature 1,2,3,4,5,6,7,8,9 ได้
- Admin สามารถสร้าง สิทธิ์และกำหนดสิทธิ์ให้กับลูกค้าได้
- Admin สามารถดูหน้า Deshboard ภาพรวมทั้งหมดได้
- Admin สามารถ Inactive ลูกค้าได้

### Feature 1 — Login
- สมัครสมาชิกและเข้าสู่ระบบด้วย Email / Password
- รองรับ OAuth (Google, etc.) ผ่าน NextAuth.js / Supabase Auth
- JWT-based session management

### Feature 2 — Reset Password
- รีเซ็ตรหัสผ่านผ่าน Email Link (Magic Link)
- รองรับ SMS OTP เป็น fallback
- Token หมดอายุใน 15 นาที

### Feature 3 — Dashboard
- แสดง Portfolio แยกรายเหรียญ และรวมทุกเหรียญ
- สกุลเงินหลัก: THB / USD (เลือกได้)
- ราคาปัจจุบันดึงจาก Bitkub API / Binance API / CoinGecko API
- แสดง Unrealized P&L, Cost Basis, Portfolio Allocation

### Feature 4 — Buy/Sell Chart
- กราฟแสดงจุดซื้อ/ขายบน Timeline (แกน X = วันที่)
- กราฟราคา Candlestick / Line เป็น background
- ใช้ TradingView Lightweight Charts
- กรองตามเหรียญ, Exchange, ช่วงวันที่

### Feature 5 — Upload Slip
- รองรับไฟล์ JPG, PNG และ PDF
- AI อ่านข้อมูลจากสลิปอัตโนมัติ (Claude Vision API / Google Vision)
- รองรับ format ของ Bitkub, Binance TH, Binance
- ผู้ใช้แก้ไขข้อมูลได้ก่อน Confirm (Human-in-the-loop)
- 1 สลิป = 1 Transaction

### Feature 7 — Share Portfolio
- สร้าง Share Link แบบ Private (มี token)
- เลือกแสดง/ซ่อนข้อมูลทุน และกำไรได้
- แชร์แบบ Real-time หรือ Snapshot
- ตั้ง Expire Date ของ Link ได้

### Feature 8 — Subscription
- Free Tier: จำกัดจำนวน Transaction / เดือน
- Paid Tier: Unlimited Transactions + ฟีเจอร์ครบ
- รับชำระด้วย Lightning Network ผ่าน BTCPay Server (self-hosted)
- ยืนยันการชำระเงินอัตโนมัติผ่าน Webhook
- เมื่อหมด Subscription: ข้อมูลยังคงอยู่ แต่ Lock ฟีเจอร์ Paid

### Feature 9 — High Concurrency
- รองรับผู้ใช้งาน **100,000 Concurrent Users**
- Horizontal Scaling ด้วย Kubernetes / AWS ECS
- CDN + Edge Caching สำหรับ Static Assets
- Database Connection Pooling (PgBouncer)
- Queue-based OCR Processing (Redis + BullMQ)

### Feature 10 - รองรับภาษา ไทย - En
- ให้สามารถเปลี่ยนภาษาได้ตลอด

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14+ (App Router), Tailwind CSS, shadcn/ui |
| Backend | Next.js API Routes + FastAPI (Python สำหรับ OCR) |
| Database | PostgreSQL via Supabase หรือ Railway |
| AI/OCR | Claude Vision API (claude-sonnet-4-6) / Google Vision API |
| Auth | NextAuth.js / Supabase Auth |
| Charts | TradingView Lightweight Charts |
| Lightning | BTCPay Server (self-hosted) หรือ OpenNode (managed) |
| Storage | Cloudflare R2 หรือ AWS S3 (เก็บรูปสลิป) |
| Queue | Redis + BullMQ (OCR job queue) |
| Deploy | Vercel (Frontend) + Railway / Render (Backend) |

---

## Data Model

```
User
  id, email, password_hash, plan, plan_expires_at, created_at

Coin
  id, symbol (BTC, ETH, ...), name, coingecko_id

Transaction
  id, user_id, coin_id, type (BUY/SELL),
  amount, price, total_value, currency (THB/USDT),
  exchange (bitkub/binanceth/binance),
  tx_date, slip_image_url, created_at

Portfolio
  คำนวณ real-time จาก transactions (ไม่ store แยก)

ShareLink
  id, user_id, token, config (JSON), expires_at, created_at

Subscription
  id, user_id, invoice_id, amount_sats, status, paid_at
```

---

## Deployment

### AWS Cloud Architecture
```
Route 53 → CloudFront → ALB
                         ├── ECS (Next.js Frontend)
                         ├── ECS (FastAPI OCR Service)
                         └── RDS PostgreSQL (Multi-AZ)

S3 / Cloudflare R2    → Slip Image Storage
ElastiCache Redis      → Job Queue + Session Cache
BTCPay Server (EC2)   → Lightning Network Payments
```

### Environment Variables
```env
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
ANTHROPIC_API_KEY=
GOOGLE_VISION_API_KEY=
BTCPAY_URL=
BTCPAY_API_KEY=
S3_BUCKET=
S3_REGION=
REDIS_URL=
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Setup database
npx prisma migrate dev

# Run development server
npm run dev
```

---

## Project Structure

```
/
├── app/                  # Next.js App Router
│   ├── (auth)/           # Login, Register, Reset Password
│   ├── dashboard/        # Dashboard & Portfolio
│   ├── upload/           # Slip Upload
│   ├── chart/            # Buy/Sell Chart
│   ├── share/[token]/    # Public Share Portfolio
│   └── settings/         # Subscription, Profile
├── components/           # shadcn/ui components
├── lib/                  # Utilities, API clients
├── prisma/               # Database schema
└── ocr-service/          # FastAPI OCR microservice (Python)
```

---

## License

Private — All rights reserved.
