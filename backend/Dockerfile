FROM node:20-slim
WORKDIR /app

# OpenSSL is required by Prisma at runtime.
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
# --include=dev guarantees build tools (nest CLI, tsx, prisma) even if the host
# sets NODE_ENV=production during the image build (e.g. some PaaS builders).
RUN npm install --include=dev

COPY . .
RUN npx prisma generate && npm run build

EXPOSE 3001

# On boot: sync schema, seed the board (idempotent upserts), then start.
CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss && npx tsx prisma/seed.ts && node dist/main.js"]
