# Deploy do ShopSpy em produção

Guia passo a passo pra colocar o ShopSpy no ar. Arquitetura final:

```
┌─────────────┐      ┌──────────────────┐      ┌──────────────────┐
│   Vercel    │─────▶│  Railway: API    │─────▶│  Supabase        │
│  (frontend) │      │  (Express)       │      │  (Postgres)      │
└─────────────┘      └──────────────────┘      └──────────────────┘
                              │                          ▲
                              ▼                          │
                      ┌──────────────────┐                │
                      │  Railway: Worker │────────────────┘
                      │  (scrapers/cron) │
                      └──────────────────┘
                              │
                              ▼
                      ┌──────────────────┐
                      │  Upstash (Redis) │
                      └──────────────────┘
```

Frontend e API são serviços **separados** — o frontend nunca fala direto com o banco. API e Worker são **dois serviços Railway separados** rodando o mesmo código (`apps/api`), com comandos de start diferentes: a API atende HTTP, o Worker consome a fila e roda os crons. Eles não podem ser o mesmo serviço porque o Worker precisa ficar de pé continuamente processando jobs, enquanto a API escala/reinicia por requisição.

## Pré-requisitos

- Conta no [Supabase](https://supabase.com), [Upstash](https://upstash.com), [Railway](https://railway.app), [Vercel](https://vercel.com), [Resend](https://resend.com) e [Google Cloud Console](https://console.cloud.google.com).
- `npm i -g @railway/cli` (opcional, dá pra fazer tudo pela UI também).
- Node 20+ localmente pra rodar a migration inicial.

---

## 1. Banco de dados — Supabase (Postgres)

1. Crie um projeto em [supabase.com/dashboard](https://supabase.com/dashboard/projects) → **New Project**. Guarde a senha do banco gerada na criação (você vai precisar dela nas connection strings).
2. Em **Project Settings → Database → Connection string**, copie duas strings:
   - **Connection pooling** (modo `Transaction`, porta `6543`) → isso é o `DATABASE_URL`. Adicione `?pgbouncer=true` no final se não vier.
   - **Direct connection** (porta `5432`) → isso é o `DIRECT_URL`, usado só pelas migrations (o Prisma Migrate não funciona direto pelo pooler).
3. Rode a migration a partir da sua máquina (não precisa estar no Railway pra isso — só precisa das duas URLs acima):

   ```bash
   cd packages/database
   DATABASE_URL="postgresql://postgres.xxxx:SENHA@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true" \
   DIRECT_URL="postgresql://postgres.xxxx:SENHA@aws-0-region.pooler.supabase.com:5432/postgres" \
   npx prisma migrate deploy
   ```

   Isso aplica as migrations já versionadas em `packages/database/prisma/migrations/` — não gera uma nova (`migrate deploy` nunca cria migration, só aplica as existentes; usar `migrate dev` é só local).
4. Confirme que as tabelas subiram: `npx prisma studio` (abre um painel local apontando pro banco de produção — feche depois de checar, não deixe aberto).

Guarde `DATABASE_URL` e `DIRECT_URL` — vão pro Railway (serviço API **e** Worker, os dois batem no mesmo banco).

---

## 2. Cache/filas — Upstash (Redis)

1. Em [console.upstash.com](https://console.upstash.com) → **Create Database**. Escolha a região mais próxima do Railway (reduz latência entre API/Worker e Redis).
2. Na aba **Details** do banco criado:
   - Copie a **Redis URL** (formato `rediss://default:senha@host:porta`, com `s` — TLS) → isso é o `REDIS_URL`.
3. `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` (aba **REST API** do mesmo banco) estão no `.env.example` como reserva caso algum componente futuro prefira o cliente REST em vez do protocolo Redis puro — hoje nada no código os usa (BullMQ/ioredis usam só `REDIS_URL`), pode deixar vazio.

---

## 3. Login — Google Cloud Console (OAuth)

1. Crie (ou reuse) um projeto em [console.cloud.google.com](https://console.cloud.google.com/).
2. **APIs & Services → OAuth consent screen**: tipo **External**, preencha nome do app ("ShopSpy"), e-mail de suporte. Em produção real (não teste) isso passa por revisão do Google — pra começar, pode deixar em modo **Testing** e adicionar os e-mails que vão logar como testadores.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**.
   - **Authorized redirect URIs** — adicione as duas (dev e produção):
     - `http://localhost:4000/auth/google/callback`
     - `https://api.shopspy.com.br/auth/google/callback` (troque pelo seu domínio real da API)
4. Copie **Client ID** e **Client secret** → são `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`.

> Se a URL de callback cadastrada aqui não bater **exatamente** (path, domínio, http vs https) com `GOOGLE_REDIRECT_URI` configurada no Railway, o Google recusa o login com `redirect_uri_mismatch`.

---

## 4. E-mail de alertas — Resend

1. Crie uma conta em [resend.com](https://resend.com) (free tier: 3.000 e-mails/mês).
2. **Domains → Add Domain**, adicione o domínio que vai enviar os alertas (ex.: `shopspy.com.br`) e configure os registros DNS (SPF/DKIM) que o Resend mostrar, no seu provedor de DNS. Sem isso o Resend não deixa mandar de `alertas@seudominio.com` — sem domínio verificado, dá pra testar com o domínio de sandbox deles, mas não use isso em produção.
3. **API Keys → Create API Key** → isso é o `RESEND_API_KEY`.
4. `RESEND_FROM_EMAIL` = `"ShopSpy <alertas@seudominio.com.br>"`, usando o domínio verificado no passo 2.

---

## 5. Railway — serviço da API

1. **New Project → Deploy from GitHub repo**, aponte pro repositório do ShopSpy.
2. Como é um monorepo, configure em **Settings** desse serviço:
   - **Root Directory**: `/` (raiz — o build precisa do monorepo inteiro pro turbo resolver os workspaces).
   - **Build Command**: `npm install && npx prisma generate --schema=packages/database/prisma/schema.prisma && npx turbo run build --filter=@shopspy/api...`
   - **Start Command**: `npm run start --workspace=@shopspy/api`
3. **Settings → Networking**: gere um domínio público (`*.up.railway.app` serve pra começar) ou aponte um customizado (seção 8).
4. **Settings → Health Check**: path `/api/v1/health`, timeout de uns 10s. Esse endpoint responde `200` mesmo com banco/Redis fora do ar (retorna `status: "degraded"` mas ainda é HTTP 200) — o objetivo do health check do Railway aqui é só confirmar que o processo Node subiu, não decidir se restart é necessário por causa de uma dependência externa.
5. Variáveis de ambiente (seção 7 tem a lista completa) — as que mudam entre API e Worker: a API **não** precisa de nenhuma variável exclusiva, mas o Worker (próximo passo) sim.

---

## 6. Railway — serviço do Worker

Mesmo repositório, **serviço novo** dentro do mesmo projeto Railway (não reaproveita o serviço da API — são dois processos rodando em paralelo):

1. **New Service → mesmo repo GitHub**.
2. **Settings**:
   - **Root Directory**: `/`
   - **Build Command**: `npm install && npx prisma generate --schema=packages/database/prisma/schema.prisma && npx turbo run build --filter=@shopspy/api...`
   - **Start Command**: `npm run worker:start --workspace=@shopspy/api`
3. **Sem Health Check HTTP** — o Worker não expõe porta nenhuma (não é servidor HTTP), então não marque health check por path aqui; deixe o Railway monitorar só se o processo está vivo (restart automático em crash já é o comportamento padrão).
4. Mesmas variáveis de ambiente da API (banco, Redis, chaves de API dos scrapers/Gemini/Resend) — o Worker é quem de fato chama os scrapers, o Gemini e o Resend.

---

## 7. Vercel — frontend

1. **Add New → Project**, importe o repositório.
2. **Root Directory**: `apps/web` (o único app que builda com Next.js).
3. Framework preset: Next.js (a Vercel detecta automaticamente).
4. Variáveis de ambiente (Project Settings → Environment Variables):
   - `NEXT_PUBLIC_API_URL` = URL pública do serviço API no Railway (ex.: `https://api.shopspy.com.br`).
   - `JWT_ACCESS_SECRET` = **o mesmo valor** configurado na API — o `middleware.ts` do Next.js verifica o JWT localmente (Edge), sem chamar a API.
   - `COOKIE_DOMAIN` = domínio pai compartilhado com a API (ex.: `.shopspy.com.br`) — **obrigatório** em produção com domínios diferentes de Vercel/Railway (ver aviso na seção 8).
   - `NODE_ENV` = `production` (a Vercel já seta isso automaticamente, não precisa duplicar).
5. Deploy. A Vercel builda e publica automaticamente a cada push na branch principal.

---

## 8. Domínio customizado

Cookies de sessão são `httpOnly` com `Domain` explícito (`COOKIE_DOMAIN`) — isso só funciona se **frontend e API compartilharem um domínio pai**. `app.vercel.app` e `api.up.railway.app` são domínios totalmente diferentes e **não conseguem** compartilhar cookie, de forma alguma. Por isso domínio customizado aqui não é cosmético, é funcional:

1. Compre/tenha um domínio (ex.: `shopspy.com.br`).
2. **Vercel** → Project Settings → Domains → adicione `app.shopspy.com.br` (ou o domínio raiz). Siga as instruções de DNS que a Vercel mostrar (CNAME/A record).
3. **Railway** → serviço da API → Settings → Networking → Custom Domain → adicione `api.shopspy.com.br`. Railway mostra o CNAME pra configurar no seu provedor de DNS.
4. Com os dois domínios ativos, configure:
   - `COOKIE_DOMAIN=".shopspy.com.br"` (na Vercel **e** na API do Railway — os dois precisam saber o mesmo domínio de cookie).
   - `FRONTEND_URL="https://app.shopspy.com.br"` (Railway, API) e `GOOGLE_REDIRECT_URI="https://api.shopspy.com.br/auth/google/callback"` (Railway, API + cadastrado no Google Console, seção 3).
   - `CORS_ALLOWED_ORIGINS="https://app.shopspy.com.br"` (Railway, API).
   - `NEXT_PUBLIC_API_URL="https://api.shopspy.com.br"` (Vercel).

---

## 9. Variáveis de ambiente — referência completa

| Variável | Onde configurar | Onde obter |
|---|---|---|
| `DATABASE_URL` | Railway (API + Worker) | Supabase → Settings → Database → Connection pooling |
| `DIRECT_URL` | Só na sua máquina, pra `migrate deploy` | Supabase → Settings → Database → Direct connection |
| `REDIS_URL` | Railway (API + Worker) | Upstash → seu banco → Details → Redis URL |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Railway (opcional, não usado hoje) | Upstash → seu banco → REST API |
| `GEMINI_API_KEY` | Railway (API + Worker) | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | Railway (API + Worker) | fixo, ex.: `gemini-1.5-flash` |
| `JWT_ACCESS_SECRET` | Railway (API + Worker) **e** Vercel | gere você: `openssl rand -base64 32` — mesmo valor nos dois lados |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Railway (API) | Google Cloud Console (seção 3) |
| `GOOGLE_REDIRECT_URI` | Railway (API) | `https://api.SEUDOMINIO/auth/google/callback`, cadastrada igual no Console |
| `FRONTEND_URL` | Railway (API) | URL pública do frontend (Vercel/domínio customizado) |
| `COOKIE_DOMAIN` | Railway (API) **e** Vercel | domínio pai compartilhado, ex.: `.shopspy.com.br` (seção 8) |
| `PORT` | Railway (API) | Railway injeta automaticamente — só é usado como fallback local |
| `NODE_ENV` | Railway + Vercel | `production` |
| `CORS_ALLOWED_ORIGINS` | Railway (API) | URL do frontend |
| `INTERNAL_TOKEN` | Railway (API + Worker) | gere você: `openssl rand -hex 24` — protege `POST /internal/jobs/:source/trigger` |
| `NEXT_PUBLIC_API_URL` | Vercel | URL pública da API |
| `EXCHANGE_RATE_API_URL` | Railway (Worker) | fixo, já vem preenchido no `.env.example` |
| `ALIEXPRESS_APP_KEY` / `ALIEXPRESS_APP_SECRET` | Railway (Worker) | [portals.aliexpress.com/affiportals](https://portals.aliexpress.com/affiportals) |
| `RESEND_API_KEY` | Railway (Worker) | Resend → API Keys (seção 4) |
| `RESEND_FROM_EMAIL` | Railway (Worker) | domínio verificado no Resend, seção 4 |

`DIRECT_URL` é a única que **não** entra em nenhum serviço rodando — é só pra você aplicar migration da sua máquina. Nunca precisa estar no Railway/Vercel.

---

## 10. Checklist pós-deploy

- [ ] `GET https://api.SEUDOMINIO/api/v1/health` responde `200` com `"status": "ok"` (database e redis `"up"`).
- [ ] Login com Google completa o fluxo e volta pro `/dashboard` já autenticado (confirma `GOOGLE_REDIRECT_URI`, `FRONTEND_URL` e `COOKIE_DOMAIN` certos).
- [ ] `POST /internal/jobs/SHOPEE_BR/trigger` com o header `X-Internal-Token` certo enfileira o job (confirma Worker rodando e consumindo a fila).
- [ ] Painel do Railway mostra os dois serviços (API e Worker) com status "Active" — se o Worker cair sozinho, confira os logs: geralmente é `REDIS_URL`/`DATABASE_URL` errado ou ausente nesse serviço especificamente (são configurados por serviço, não é automático copiar de um pro outro).
- [ ] Roda `npm run stress` (ver `tests/stress/README.md`) contra o ambiente antes de anunciar o lançamento — é o jeito de saber se a infra escolhida aqui aguenta tráfego real antes de descobrir isso com usuários de verdade.
