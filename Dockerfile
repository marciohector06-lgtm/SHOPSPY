FROM node:20-slim

# Instala dependências do Chromium
RUN apt-get update && apt-get install -y \
  chromium \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libgbm1 \
  libasound2 \
  libpangocairo-1.0-0 \
  libxss1 \
  libgtk-3-0 \
  libxshmfence1 \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

# Copia arquivos de dependências primeiro (cache de layers)
COPY package*.json ./
COPY packages/database/package*.json ./packages/database/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/ai/package*.json ./packages/ai/
COPY packages/queue/package*.json ./packages/queue/
COPY packages/scorer/package*.json ./packages/scorer/
COPY packages/scrapers/package*.json ./packages/scrapers/
COPY apps/api/package*.json ./apps/api/
COPY turbo.json ./

# Instala dependências
RUN npm ci

# Copia resto do código
COPY . .

# Gera Prisma e builda
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma
RUN npx turbo run build --filter=apps/api

EXPOSE 4000

CMD ["npm", "run", "start", "--workspace=apps/api"]
