# syntax=docker/dockerfile:1
# Single image used by BOTH the web app and the BullMQ worker.
# - web:    npm run start   (next start)
# - worker: npm run worker  (tsx lib/worker.ts)
# Dev deps are kept on disk so the worker can run TS via tsx at runtime.

FROM node:20-bookworm-slim AS base
# openssl is required by Prisma's query engine; ca-certificates for outbound HTTPS APIs
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---- Install dependencies (incl. dev: needed for `next build` and `tsx` worker) ----
COPY package.json package-lock.json ./
RUN npm ci

# ---- Build ----
COPY . .
RUN npx prisma generate \
  && npm run build

# Runtime defaults (NODE_ENV set AFTER build so dev deps remain installed)
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Default command runs the web server; docker-compose overrides it for the worker.
CMD ["npm", "run", "start"]
