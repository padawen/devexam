# 1. Base image with system dependencies
FROM node:20-slim AS base
RUN apt-get update && \
    apt-get install -y default-jdk sqlite3 build-essential python3 && \
    rm -rf /var/lib/apt/lists/*

# 2. Dependencies stage - only runs when package.json changes
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 3. Builder stage - builds Next.js and Prisma
FROM base AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# 4. Runner stage - final lightweight production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server.mjs ./server.mjs
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["node", "server.mjs"]
