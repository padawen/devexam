FROM node:20-slim

# JDK + SQLite + build tools in case it's needed
RUN apt-get update && \
    apt-get install -y default-jdk sqlite3 build-essential python3 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "server.mjs"]
