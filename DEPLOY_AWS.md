# Deploy StackSat to AWS (EC2 + Docker Compose)

Target architecture for the first deployment:

```
                 Internet
                    │  http://<EC2 public DNS>
                    ▼
        ┌──────────────────────────┐
        │   EC2 (Ubuntu, Docker)   │
        │  ┌────────┐  ┌─────────┐ │
        │  │  web   │  │ worker  │ │   docker compose
        │  │ :3000  │  │ (BullMQ)│ │
        │  └───┬────┘  └────┬────┘ │
        └──────┼────────────┼──────┘
               │            │
      ┌────────▼───┐  ┌─────▼───────┐   ┌───────────┐
      │ RDS        │  │ ElastiCache │   │  S3 bucket│
      │ PostgreSQL │  │   Redis     │   │  (slips)  │
      └────────────┘  └─────────────┘   └───────────┘
        + external APIs: Anthropic, Gemini, CoinGecko, SES/SMTP, Google OAuth, BTCPay (optional)
```

The web container applies Prisma migrations on start. Postgres and Redis are
**managed** (RDS + ElastiCache) and are not part of `docker-compose.yml`.

---

## 0. What you need (checklist)

AWS resources:
- [ ] **EC2** instance (Ubuntu 22.04/24.04, t3.small or larger — needs RAM to build the image; t3.micro can OOM during `next build`)
- [ ] **RDS for PostgreSQL** (db.t4g.micro is fine to start)
- [ ] **ElastiCache for Redis** (cache.t4g.micro)
- [ ] **S3 bucket** for slip images (private)
- [ ] **IAM role** for EC2 with S3 access (preferred over static keys)
- [ ] **Security groups** (see §1)
- [ ] *(optional)* **SES** for transactional email, or use a Gmail app password

Accounts / external services (free or paid):
- [ ] Anthropic API key (OCR)
- [ ] Google OAuth client (login) — optional
- [ ] CoinGecko API key — optional
- [ ] BTCPay server — optional (subscriptions)

Pick an AWS region and use it everywhere (the code defaults to `ap-southeast-1`).

---

## 1. Security groups

| Resource     | Inbound rule                                  |
|--------------|-----------------------------------------------|
| EC2          | TCP 22 from **your IP** (SSH)                  |
| EC2          | TCP 80 from `0.0.0.0/0` (web)                  |
| RDS          | TCP 5432 from **EC2's security group**        |
| ElastiCache  | TCP 6379 from **EC2's security group**        |

Keep RDS and ElastiCache **not publicly accessible**; only the EC2 SG can reach them.
Put EC2, RDS and ElastiCache in the same VPC.

---

## 2. Create the managed data stores

1. **RDS PostgreSQL** → note the endpoint, port (5432), DB name, user, password.
2. **ElastiCache Redis** (cluster mode disabled) → note the primary endpoint.
3. **S3 bucket** (e.g. `stacksat-slips`), Block Public Access = ON (images are
   served through the app's `/api/slips` route, not publicly).
4. **IAM role for EC2** with an inline policy allowing `s3:GetObject`,
   `s3:PutObject`, `s3:DeleteObject` on `arn:aws:s3:::stacksat-slips/*`.
   Attach this role to the EC2 instance → then leave `AWS_ACCESS_KEY_ID` /
   `AWS_SECRET_ACCESS_KEY` blank in env (the SDK uses the role automatically).

---

## 3. Prepare the EC2 host

SSH in, then install Docker + Compose plugin:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
# log out / back in so the docker group applies
```

---

## 4. Deploy

```bash
git clone https://github.com/teppituk/SatTrack.git
cd SatTrack

cp .env.production.example .env.production
nano .env.production        # fill in RDS, ElastiCache, S3, secrets, NEXTAUTH_URL

# NEXTAUTH_URL and NEXT_PUBLIC_APP_URL must be the EC2 public DNS, e.g.
#   http://ec2-13-250-xx-xx.ap-southeast-1.compute.amazonaws.com

docker compose --env-file .env.production up -d --build
```

The web service runs `prisma migrate deploy` automatically before starting.
Check it:

```bash
docker compose ps
docker compose logs -f web
curl http://localhost/api/health      # -> {"status":"ok",...}
```

Open `http://<EC2 public DNS>` in a browser.

> **First run / seeding:** if you have a seed or an initial admin user step,
> run it once with `docker compose exec web npx prisma db seed` (only if a seed
> script is configured) or create the admin via the app's normal flow.

---

## 5. Google OAuth (if used)

In Google Cloud Console → OAuth client → Authorized redirect URIs, add:

```
http://<EC2 public DNS>/api/auth/callback/google
```

(Re-add the real domain later once HTTPS is set up.)

---

## 6. Updating after a code change

```bash
cd SatTrack
git pull
docker compose --env-file .env.production up -d --build
```

Old images pile up over time; reclaim space occasionally with `docker image prune -f`.

---

## 7. Next steps (when you get a domain)

- Point an A record at the EC2 Elastic IP (allocate an **Elastic IP** so the
  public DNS doesn't change on reboot).
- Add HTTPS. Two easy options:
  - **Caddy** as a reverse proxy in front of `web` (automatic Let's Encrypt), or
  - **ALB + ACM certificate** in front of the instance.
- Update `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, and the Google redirect URI to
  the `https://` domain, then `docker compose up -d`.

---

## Notes / gotchas

- **Instance size for builds:** `next build` is memory-hungry. Use ≥ 2 GB RAM
  (t3.small). On a t3.micro, either add swap or build the image elsewhere
  (e.g. push to ECR) and just `docker compose up -d` on the host.
- **TLS to RDS:** keep `?sslmode=require` in `DATABASE_URL`.
- **Redis encryption:** if ElastiCache in-transit encryption is on, use
  `rediss://` in `REDIS_URL`.
- **Secrets:** `.env.production` is gitignored. For stronger security, consider
  AWS SSM Parameter Store / Secrets Manager instead of a file on disk.
- **Email:** Gmail SMTP works for a quick start; move to **SES** for production
  deliverability (and verify your domain / sandbox-exit in SES).
