# Progresso — ShopSpy

## Nota sobre este documento

Reconstruído em 12/09/2026 a partir da inspeção do código-fonte — não existia PROGRESSO.md no repositório até esta data.

## Estado geral

Repositório com estrutura de produção completa: monorepo Turborepo com 2 apps e 6 packages, testes (Vitest unitário/integração, k6 de carga, Lighthouse CI), Docker, e um `DEPLOY.md` com o guia de deploy real (Vercel + Railway + Supabase + Upstash + Resend). Repositório criado em 22/07/2026, último push em 11/08/2026.

## Funcionalidades implementadas (por package)

- **Scrapers Brasil**: Mercado Livre, Shopee BR, TikTok Shop BR, Google Trends BR, matcher de produtos entre fontes.
- **Scrapers Global**: AliExpress (via API oficial de afiliados), Amazon US/UK, TikTok Shop US, TikTok Creative Center (US/internacional — ver risco abaixo), Google Trends global/internacional.
- **Scoring**: engine de score de oportunidade, gap-analyzer, regional-score, classificador de UGC, estimador de janela de oportunidade.
- **IA (Gemini)**: geração de copy/scripts, extração de hooks, análise de oportunidade, classificação de subcategoria, normalização de keyword, cache e rate limiter próprios.
- **API**: rotas de auth (Google OAuth + modo senha só fora de produção), dashboard, produtos, oportunidades, alertas, streaming (SSE via `stream.ts`), rotas internas (trigger de jobs via token).
- **Alertas por e-mail**: via Resend — degrada com elegância (loga erro e segue) se a chave não estiver configurada.
- **Banco**: 9 models Prisma (Product, TrendScore, RegionalScore, ProductMatch, ReferenceVideo, User, Alert, Session, ScraperLog).

## Riscos conhecidos (documentados no próprio `.env.example`)

- `TIKTOK_CREATIVE_SESSION_COOKIES` usa a sessão de uma conta real do TikTok Business pra autenticar os scrapers do Creative Center — o próprio comentário no código avisa que isso viola os Termos de Uso do TikTok e arrisca suspensão da conta. Decisão do dono da conta antes de ativar.
- `ENABLE_PASSWORD_AUTH` liga sozinho fora de produção; se ligado em produção, `/register` cria conta já em `plan: PRO` sem passar pelo checkout — cuidado ao ativar manualmente em produção.

## Pendências / o que não dá pra confirmar só lendo o código

- Se todos os scrapers (em especial os que dependem de cookies de sessão real, como o TikTok Creative) estão de fato rodando em produção agora, ou só implementados.
- **Cobrança freemium (R$47/mês)**: não foi encontrado nenhum código de billing/checkout (Stripe ou similar) neste repositório. Confirmar com Márcio se isso está em outro lugar (gateway configurado direto no provedor, produto ainda não lançado comercialmente) ou se é uma pendência real de implementação.
- Cobertura real dos testes (Vitest/k6/Lighthouse) — os arquivos existem, mas nenhuma suíte foi executada nesta reconstrução.
