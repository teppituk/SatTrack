# KeepSats — Deploy Prompt (พร้อมก๊อปไปวางใช้ครั้งหน้า)

ก๊อปข้อความในกล่องด้านล่างทั้งหมดไปวางใน Claude Code (ที่ root ของ repo นี้) เพื่อ deploy ซ้ำ
ค่าทั้งหมดอิงจาก deployment ที่ทำงานได้จริง (Thailand region + CloudFront)

> ก่อนเริ่ม: ตรวจว่า AWS CLI ใช้ user `teppituk.dev` แล้ว (`aws sts get-caller-identity` ต้องขึ้น `user/teppituk.dev` ไม่ใช่ root)
> ถ้ายัง ให้ตั้งใน Terminal เอง: `aws configure` หรือใช้ profile ที่มีอยู่

---

```
ช่วย deploy แอป KeepSats (Next.js 15 + Prisma + BullMQ worker) ขึ้น AWS ตามสเปกนี้ทั้งหมด ทำให้จบและทดสอบให้เข้าได้จริง:

[Identity & Region]
- ใช้ AWS CLI user teppituk.dev (ยืนยันด้วย aws sts get-caller-identity ก่อน อย่าใช้ root)
- Region: ap-southeast-7 (Asia Pacific Thailand) — ตั้ง default region เป็นค่านี้
- ใช้ default VPC + public subnets (อย่างน้อย 2 AZ สำหรับ RDS/ElastiCache subnet group)

[Architecture] EC2 (Docker Compose) + RDS Postgres + ElastiCache Redis + S3 + CloudFront
- เก็บ secret/state ทั้งหมดไว้ใน ~/.sattrack-deploy/ (chmod 700) อย่าพิมพ์ secret ลง chat
- Repo: https://github.com/teppituk/SatTrack.git (มี Dockerfile + docker-compose.yml + prisma migrations พร้อมแล้ว)

[ขั้นตอน]
1. Foundational: หา VPC/2 subnets, หา Ubuntu 22.04 AMI ด้วย `ec2 describe-images --owners 099720109477`
   (อย่าใช้ SSM GetParameter — teppituk.dev ไม่มีสิทธิ์ ssm) generate DB_PASSWORD (alphanumeric 28 ตัว)
   และ NEXTAUTH_SECRET (openssl rand -base64 32) สร้าง EC2 key pair stacksat-key เซฟ .pem (chmod 400)
2. Security Groups 3 ตัว: web(80 from 0.0.0.0/0, 22 from `curl checkip.amazonaws.com`/32),
   rds(5432 from web SG), redis(6379 from web SG)
3. S3 bucket private: stacksat-slips-th-<account-id> + Block Public Access ON
   IAM role stacksat-ec2-role (trust ec2) + inline policy S3 (Get/Put/Delete/ListBucket bucket นี้)
   + instance profile stacksat-ec2-profile
4. RDS: db.t4g.micro, postgres, 20GB gp2, Single-AZ, ไม่ public, db-name=stacksat, user=stacksat
   **--backup-retention-period 1** (free tier บล็อกค่า >1) + subnet group 2 AZ
5. ElastiCache: redis cache.t3.micro 1 node + subnet group 2 AZ
6. Billing budget $10/เดือน (ต้องเพิ่ม inline policy budgets:* ให้ teppituk.dev ก่อน รอ IAM propagate)
7. รอ RDS+Redis = available แล้วดึง endpoint
8. EC2 t3.micro + user-data ที่ทำ: เพิ่ม swap 4GB (จำเป็นไม่งั้น next build OOM บน 1GB),
   ติดตั้ง docker+compose, git clone, เขียน .env.production (ดู [ENV]), `docker compose up -d --build`
   - instance profile stacksat-ec2-profile, key stacksat-key, SG web, root EBS 20GB gp3
   - user-data ดึง public-hostname ผ่าน IMDSv2 มาใส่ NEXTAUTH_URL ชั่วคราว
9. รอ build เสร็จ (~10-15 นาที) ตรวจ health 200, ตรวจ docker logs ว่า "All migrations have been successfully applied"

[ENV ที่ใส่ใน .env.production]
DATABASE_URL=postgresql://stacksat:<DB_PASSWORD>@<RDS_ENDPOINT>:5432/stacksat?sslmode=require   # RDS บังคับ SSL
NEXTAUTH_SECRET=<generated>
NEXTAUTH_URL=<CloudFront URL หลังสร้าง CloudFront เสร็จ>
AWS_REGION=ap-southeast-7
S3_BUCKET_NAME=<bucket>
REDIS_URL=redis://<REDIS_ENDPOINT>:6379
ANTHROPIC_API_KEY=        # เว้นว่างได้ (OCR จะไม่ทำงานจนกว่าจะใส่)
# ที่เหลือ (GOOGLE_*, SMTP_*, BTCPAY_*, COINGECKO) เว้นว่างได้

[สำคัญมาก — ISP ไทยบล็อก HTTP/HTTPS ไป IP ของ region ไทย (RST injection)]
- เข้าตรงด้วย IP/DNS ของ EC2 จากเน็ตในไทย "จะเข้าไม่ได้" (port 80/443 โดน RST แต่ 22/SSH ใช้ได้)
- ดังนั้น **ต้องสร้าง CloudFront คั่นหน้าเสมอ**:
  - Origin = EC2 public DNS, OriginProtocolPolicy = http-only (EC2 ไม่มี HTTPS)
  - ViewerProtocolPolicy = redirect-to-https, AllowedMethods = ครบ 7 (รวม POST/PUT/DELETE)
  - CachePolicyId = 4135ea2d-6df8-44a3-9df3-4b5a84be39ad (CachingDisabled)
  - OriginRequestPolicyId = 216adef6-5c7f-47e4-b989-5492eafa07d3 (AllViewer — forward ทุก header/cookie)
  - PriceClass_200 (รวมเอเชีย)
  - ต้องเพิ่ม CloudFrontFullAccess ให้ teppituk.dev ก่อน
- หลังได้โดเมน cloudfront: แก้ NEXTAUTH_URL + NEXT_PUBLIC_APP_URL ใน .env.production เป็น https://<cf-domain>
  แล้ว `docker compose up -d --force-recreate web` (ไม่งั้น login/NextAuth พัง)
- ทดสอบเข้าผ่าน https://<cf-domain>/api/health ให้ได้ 200 จากเครื่อง local

[หลัง deploy เสร็จ]
- สร้าง admin: POST /api/auth/register (curl ที่ localhost บน EC2) แล้ว UPDATE "User" SET role='ADMIN'
  (รันผ่าน docker compose exec web node -e ... prisma)
- สรุปให้: CloudFront URL, EC2 instance id, endpoints, ตำแหน่ง key (.pem), credential ที่ใช้ login

[Verify ต้องผ่านทั้งหมด]
- https://<cf-domain>/ , /login = 200 ; /dashboard = 307 ; /api/auth/providers callback ชี้ cf-domain
- docker: web (healthy) + worker (Up, "OCR Worker started")
```

---

## ข้อมูลอ้างอิงจาก deployment ปัจจุบัน (ถ้าจะ deploy ทับ/ต่อยอด)

| รายการ | ค่า |
|---|---|
| Region | ap-southeast-7 (Thailand) |
| AWS user | teppituk.dev (account 022038146115) |
| CloudFront URL | https://d1j7crkdurl59p.cloudfront.net |
| CloudFront ID | E3EB1QWX1EVIDY |
| EC2 | i-08ad7b6fde167774d (t3.micro) — public IP 43.208.136.13 |
| RDS | stacksat-db (db.t4g.micro, postgres 18) |
| Redis | stacksat-redis (cache.t3.micro) |
| S3 | stacksat-slips-th-022038146115 |
| SSH key | ~/.sattrack-deploy/stacksat-key.pem |
| DB tunnel scripts | ~/.sattrack-deploy/db-tunnel.sh , db-psql.sh |

## กับดักที่เจอแล้ว (อย่าพลาดซ้ำ)
1. **อย่าใช้ root** — สลับเป็น teppituk.dev ก่อน
2. **RDS free tier**: `--backup-retention-period` ต้อง ≤ 1 (ใส่ 7 จะ error)
3. **ไม่มีสิทธิ์ SSM**: หา AMI ด้วย `ec2 describe-images` ไม่ใช่ ssm get-parameter
4. **t3.micro 1GB**: ต้องเพิ่ม swap 4GB ใน user-data ไม่งั้น `next build` ตาย (OOM)
5. **RDS บังคับ SSL**: ต่อ DB ต้องมี `sslmode=require` (DBeaver ก็ต้องเปิด SSL)
6. **ISP ไทย RST HTTP/HTTPS ไป IP region ไทย**: ต้องมี CloudFront เสมอ แล้วชี้ NEXTAUTH_URL ไป cloudfront
7. **อย่ารัน `npm run build` ทับ dev server ในเครื่อง** — `.next` จะพังเพราะเขียน dir เดียวกัน
