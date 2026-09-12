# ShopSpy

Plataforma de pesquisa de produtos (product research) para dropshipping/afiliados: cruza scrapers de marketplaces (Brasil e global) com Google Trends, calcula um score de oportunidade via IA (Gemini) e envia alertas por e-mail. Modelo freemium.

## Stack

Turborepo (monorepo), Next.js (`apps/web`), Express (`apps/api`), PostgreSQL (Supabase) + Prisma, Redis (Upstash) + BullMQ, Google Gemini, Puppeteer (scrapers com browser), Resend (e-mail), Vercel (frontend), Railway (API + Worker), Docker, Vitest + k6 (testes/carga), Lighthouse CI.

## Arquitetura

```
Vercel (Next.js) ──▶ Railway: API (Express) ──▶ Supabase (Postgres)
                            │
                            ▼
                     Railway: Worker (mesmo código, comando de start diferente)
                            │
                            ▼
                     Upstash (Redis / BullMQ)
```

API e Worker rodam o **mesmo código-fonte** (`apps/api`) como dois serviços Railway separados: a API atende HTTP e escala por requisição; o Worker fica de pé continuamente consumindo a fila e rodando os crons dos scrapers. O frontend nunca fala direto com o banco.

## Setup

```bash
npm install
cp .env.example .env   # preencher DATABASE_URL, REDIS_URL, GEMINI_API_KEY no mínimo
npm run db:generate
npm run db:migrate
npm run dev             # sobe API + Web + Worker via turbo
```

Guia completo de deploy em produção (Supabase + Upstash + Railway + Vercel + Resend): ver [DEPLOY.md](./DEPLOY.md).

## Variáveis de ambiente

Ver `.env.example` para a lista comentada completa. Resumo por categoria:

| Categoria | Variáveis |
|---|---|
| Banco (Supabase Postgres) | `DATABASE_URL`, `DIRECT_URL` |
| Cache/fila (Upstash Redis) | `REDIS_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| IA (Gemini) | `GEMINI_API_KEY`, `GEMINI_MODEL` |
| Autenticação | `JWT_ACCESS_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `ENABLE_PASSWORD_AUTH` |
| Frontend/cookies | `FRONTEND_URL`, `COOKIE_DOMAIN`, `NEXT_PUBLIC_API_URL` |
| API | `PORT`, `NODE_ENV`, `CORS_ALLOWED_ORIGINS`, `INTERNAL_TOKEN` |
| Scrapers | `PUPPETEER_EXECUTABLE_PATH`, `TIKTOK_CREATIVE_SESSION_COOKIES` (⚠️ ver aviso), `EXCHANGE_RATE_API_URL`, `ALIEXPRESS_APP_KEY`, `ALIEXPRESS_APP_SECRET` |
| E-mail (Resend) | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |

> ⚠️ **Atenção**: `TIKTOK_CREATIVE_SESSION_COOKIES` autentica os scrapers do TikTok Creative Center com a sessão de uma conta real do TikTok Business. O próprio `.env.example` avisa que isso viola os Termos de Uso do TikTok e a conta corre risco real de suspensão — não ativar sem confirmar com o dono da conta.

## Estrutura de pastas

```
apps/
  api/        — Express: rotas (alerts, auth, dashboard, health, internal, opportunities,
                products, stream) + worker.ts (mesmo código, modo fila/cron)
  web/        — Next.js: app/, components/, hooks/, lib/, middleware.ts

packages/
  ai/         — wrapper Gemini: geração de copy/scripts, extração de hooks, classificação,
                cache, rate limiter
  database/   — schema Prisma (Product, TrendScore, RegionalScore, ProductMatch,
                ReferenceVideo, User, Alert, Session, ScraperLog) + migrations
  queue/      — BullMQ
  scorer/     — engine de score de oportunidade, gap-analyzer, regional-score,
                ugc-classifier, window-estimator
  scrapers/
    brazil/   — Mercado Livre, Shopee BR, TikTok Shop BR, Google Trends BR,
                matcher de produtos
    global/   — AliExpress, Amazon US/UK, TikTok Shop US, TikTok Creative
                (US/internacional), Google Trends global/internacional
  shared/     — utilitários comuns
```

Ver [PROGRESSO.md](./PROGRESSO.md) para o estado atual do projeto.
