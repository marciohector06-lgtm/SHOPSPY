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

Mesmo repositório, **serviço novo** dentro do mesmo projeto Railway (não reaproveita o serviço da API — são dois processos rodando em paralelo).

**Importante:** o deploy é via Dockerfile (não Nixpacks) — nesse modo, o **"Start Command" e o "Custom Config File" configurados pelo dashboard/API do Railway são salvos mas não têm efeito real no deploy**, que sempre roda o `CMD` da imagem e sempre lê `railway.json` da raiz do repo (confirmado testando: 3 tentativas diferentes de sobrescrever isso por serviço falharam silenciosamente antes de descobrir essa limitação). Por isso o Worker usa um mecanismo diferente:

1. **New Service → mesmo repo GitHub**.
2. **Settings → Root Directory**: `/` (só isso — não configure Start Command nem Config File, não vão pegar).
3. Nas variáveis de ambiente desse serviço, adicione `SERVICE_ROLE=worker` — o `CMD` do `Dockerfile` lê essa variável e decide entre `npm run start` (API, comportamento padrão sem a variável) e `npm run worker` (Worker). É a mesma imagem Docker para os dois serviços, só muda essa variável.
4. **Sem Health Check HTTP configurável por serviço** (mesma limitação acima — `railway.json` aponta `/api/v1/health` pra todo serviço do repo, e não dá pra desligar por serviço). Por isso o Worker (`apps/api/src/worker.ts`) sobe um servidor HTTP mínimo só pra responder `200` nesse path — não é uma rota real, existe só pra passar no healthcheck do Railway. A saúde de verdade do Worker é "está consumindo a fila", visível nos logs (`ShopSpy worker rodando — N agendamentos ativos`) e no `/health` da API (campo `lastRun` de cada scraper).
5. Mesmas variáveis de ambiente da API (banco, Redis, chaves de API dos scrapers/Gemini/Resend) — o Worker é quem de fato chama os scrapers, o Gemini e o Resend.

Se um deploy do Worker ficar preso (nem `railway redeploy` nem a mutation `deploymentRedeploy` da API do Railway destravam — aconteceu uma vez), a saída mais rápida é deletar e recriar o serviço (`railway service delete --service worker` e `railway add --service worker --repo ... --branch main`) em vez de insistir tentando destravar o mesmo deployment.

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
| `PUPPETEER_EXECUTABLE_PATH` | Railway (Worker) | `/run/current-system/sw/bin/chromium` — Chromium vem do `nixpacks.toml` (`nixPkgs`), necessário pros scrapers de TikTok (Shop BR/US e Creative Center) |
| `TIKTOK_CREATIVE_SESSION_COOKIES` | Railway (Worker), opcional | Exportado de uma sessão logada em ads.tiktok.com/business (ver seção 11) — sem isso, `TIKTOK_CREATIVE_*` responde "invalid user" |
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

---

## 11. Scripts que precisam rodar com IP residencial

Alguns scrapers bloqueiam IP de datacenter (Railway) e só funcionam de um IP residencial normal. Hoje são dois scripts, cada um cobrindo um grupo de fontes — os dois apontam pra **API de produção**, não pro localhost.

### `collect-tiktok` — `TIKTOK_SHOP_BR`, diário

```bash
npm run collect:tiktok       # Linux/Mac/Git Bash
npm run collect:tiktok:win   # Windows (CMD), sem precisar de bash
```

Dispara `TIKTOK_SHOP_BR` e recalcula os scores (`SCORE_CALCULATOR`) direto em produção via `POST /internal/jobs/:source/trigger`. Rode uma vez por dia.

**`TIKTOK_CREATIVE_*` (US + 11 países internacionais) fica de fora desse script de propósito** — não é bloqueio de IP: o TikTok Creative Center passou a exigir uma conta TikTok Business autenticada (a API interna dele devolve `"invalid user"` pra qualquer IP, residencial ou não, confirmado por inspeção de rede). Rodar da sua máquina não resolve isso.

**Se você decidir usar uma conta própria mesmo assim** (risco real de suspensão da conta — é automação contra os Termos do TikTok, decisão do dono da conta): `packages/scrapers/src/global/tiktok-creative-us.ts` (`scrapeTikTokCreativeRegions`) lê `TIKTOK_CREATIVE_SESSION_COOKIES` e injeta a sessão via `Page.setCookie` antes de abrir o Creative Center, em vez de simular login (menor sinal de automação que digitar usuário/senha). Passo a passo:

1. Logue em `ads.tiktok.com/business` num navegador normal, com a conta que você aceita usar pra isso.
2. Exporte os cookies desse domínio (extensão tipo "Cookie-Editor" já exporta no formato JSON que `Page.setCookie` espera).
3. Cole o JSON na variável `TIKTOK_CREATIVE_SESSION_COOKIES` (seção 9) — no Worker do Railway, e localmente no seu `.env` se quiser testar com `collect-global.sh`.
4. A sessão expira periodicamente (TikTok não documenta por quanto tempo) — quando `TIKTOK_CREATIVE_*` voltar a dar erro no `/api/v1/health`, repita os passos 1-3.

Sem essa variável, o comportamento é o mesmo de hoje (erro "invalid user", sem quebrar o resto do ciclo).

### `collect-trends-international.bat` — `GOOGLE_TRENDS_INTERNATIONAL` + `EXPLOSIVE_DETECTOR` + `BR_MATCHER`, semanal ou quando quiser dados regionais frescos

```
scripts\collect-trends-international.bat   # Windows (CMD ou duplo clique)
```

Dispara os três na sequência (a ordem importa pros dois primeiros):

1. **`GOOGLE_TRENDS_INTERNATIONAL`** — Google Trends pras 11 regiões internacionais (LATAM: MX/CO/AR/CL, Ásia: TH/ID/VN/JP, Europa: FR/DE/IT) de todo produto monitorado. Popula `RegionalScore`. Processa muita coisa (produtos × 11 regiões) — pode chegar perto do timeout de job de 8min mesmo com IP residencial funcionando, só pelo volume. O script espera ~8min antes de seguir; se não tiver terminado a tempo, confira `/api/v1/health` depois.
2. **`EXPLOSIVE_DETECTOR`** — lê `RegionalScore.isExplosive` (só populado pelo passo 1) e manda e-mail pros usuários PRO com alerta ativo no produto. Roda vazio (sem achar nada) se o passo 1 não tiver terminado ainda.
3. **`BR_MATCHER`** — casa produto global sem equivalente BR ainda (via Shopee, com fallback pro Mercado Livre se a Shopee bloquear com 403). Independente dos outros dois — só roda por último pra não competir por rate limit/CPU com eles.

**Limitação conhecida do fallback Mercado Livre**: mesmo com IP residencial, o fallback só é acionado se a Shopee responder 403 primeiro — e o `robots.txt` do `api.mercadolibre.com` tem `Disallow: /` pra `User-agent: *` (bloqueia geral, independente de IP). O código respeita `robots.txt` antes de cada request (mesma prática de todos os scrapers deste projeto), então o fallback ML nunca chega a fazer a chamada de verdade enquanto esse `robots.txt` continuar assim — fica registrado como limitação conhecida, não um bug do fallback em si (a lógica está implementada e testada, só não tem uma fonte real pra usar hoje).

Os scrapers globais/BR restantes (`collect-br.sh`, `collect-global.sh`) já cobrem o resto e também apontam pra API de produção (mesmo padrão de `collect-tiktok.sh`) — rode-os de casa quando quiser forçar uma coleta fora do horário do cron, sem esperar o ciclo diário.
