FROM node:22-slim AS base
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# --- Dependencies ---
FROM base AS deps
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci

# --- Build client ---
FROM deps AS build-client
COPY shared/ shared/
COPY client/ client/
COPY tsconfig.base.json ./
RUN npm run build -w client

# --- Build server (generate Prisma client) ---
FROM deps AS build-server
COPY shared/ shared/
COPY server/ server/
COPY tsconfig.base.json ./
RUN npx prisma generate --schema=server/prisma/schema.prisma

# --- Production ---
FROM base AS production
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --omit=dev

# Copy shared source (imported at runtime by tsx)
COPY shared/ shared/

# Copy server source + prisma schema & migrations
COPY server/src/ server/src/
COPY server/prisma/ server/prisma/
COPY server/prisma.config.ts server/

# Copy generated Prisma client
COPY --from=build-server /app/node_modules/.prisma node_modules/.prisma
COPY --from=build-server /app/node_modules/@prisma/client node_modules/@prisma/client

# Copy built client
COPY --from=build-client /app/client/dist client/dist

# Install tsx for running TypeScript directly
RUN npm install tsx --save-dev -w server

EXPOSE 3001

# Run migrations, seed, then start
CMD sh -c "npx prisma migrate deploy --schema=server/prisma/schema.prisma && npx tsx server/prisma/seed.ts && npx tsx server/src/index.ts"
