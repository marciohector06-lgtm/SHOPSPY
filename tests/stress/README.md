# Testes de estresse (k6)

`shopspy-stress.js` roda os 3 cenários de carga contra a API do ShopSpy, na ordem: **carga constante → rampa crescente → spike viral**, um atrás do outro (não simultâneos — cada um já sobe 500 usuários, rodar os três juntos exigiria 1500 VUs ao mesmo tempo, o que não é o objetivo aqui).

> **Nota de transparência:** este script foi escrito e revisado, mas não pôde ser executado neste ambiente (sem o binário do k6 instalado, e a instalação via chocolatey falhou por falta de permissão de admin na sandbox). A sintaxe foi validada (`node --check`), mas os números da seção "Resultado esperado" abaixo são o que os thresholds *exigem*, não uma medição real — a primeira execução real é o que vai dizer se o sistema aguenta.

## Instalar o k6

```bash
# macOS
brew install k6

# Windows (precisa de terminal com permissão de admin)
choco install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

## Rodando

O script pega dois usuários possíveis: sem `JWT_ACCESS_SECRET`, ele testa só `GET /api/v1/health` (público). Com o secret, ele assina um token PRO válido (mesmo algoritmo HS256/JOSE que a API usa) e também estressa `/api/v1/opportunities/top`, `/api/v1/products` e `/api/v1/dashboard/summary` — o cenário realista, já que esses endpoints exigem login desde a Fase 9.

```bash
# contra local (precisa da API, Postgres e Redis no ar)
JWT_ACCESS_SECRET="o-mesmo-valor-do-.env-do-ambiente-testado" \
BASE_URL="http://localhost:4000" \
k6 run tests/stress/shopspy-stress.js

# contra staging/produção — NUNCA rode isso contra produção com usuários
# reais sem avisar o time; contrate uma janela de manutenção.
JWT_ACCESS_SECRET="..." BASE_URL="https://api.shopspy.com.br" k6 run tests/stress/shopspy-stress.js
```

`JWT_ACCESS_SECRET` é o mesmo valor configurado no `.env` do ambiente que você está testando (nunca comite esse valor em lugar nenhum — passe só via variável de ambiente na hora de rodar).

### Rodando um cenário isolado

Os três estão no mesmo arquivo com `startTime` sequencial (ver o código pros horários exatos). Pra rodar só um, use `--scenario`:

```bash
k6 run --scenario carga_constante tests/stress/shopspy-stress.js
k6 run --scenario rampa_crescente tests/stress/shopspy-stress.js
k6 run --scenario spike_viral tests/stress/shopspy-stress.js
```

## Os 3 cenários

| Cenário | Padrão | Duração | O que valida |
|---|---|---|---|
| `carga_constante` | 500 VUs fixos | 10 min | Estabilidade sustentada — degradação ao longo do tempo, memory leak no worker/API |
| `rampa_crescente` | 0 → 500 gradual | 9 min | Comportamento sob crescimento — pool de conexões, cache "esquentando" |
| `spike_viral` | 0 → 500 em 30s | 2 min | Pico repentino (produto viral, todo mundo abre o dashboard junto) |

## Thresholds obrigatórios

Definidos em `options.thresholds` no script — se qualquer um falhar, o k6 termina com exit code ≠ 0 (útil pra travar deploy em CI):

- **p95 < 500ms** (`http_req_duration`)
- **p99 < 1000ms** (`http_req_duration`)
- **Taxa de erro < 1%** (`http_req_failed` — qualquer resposta com status de erro conta)
- **Throughput > 100 req/s** (`http_reqs`, taxa média ao longo de todo o teste)

## Interpretando o resultado

Ao final, o k6 imprime um resumo com cada métrica e se passou ou não nos thresholds (`✓`/`✗`). O que olhar primeiro se algo falhar:

1. **`http_req_failed` alto** → confira `GET /api/v1/health` no resultado: se `database`/`redis` caírem para `down` durante o teste, o Postgres/Redis provavelmente esgotou conexões antes da API. Aumente o pool (`DATABASE_URL?connection_limit=`) ou o plano do Supabase/Upstash.
2. **`http_req_duration` (p95/p99) alto, mas erro baixo** → a API está respondendo, só lenta. Verifique `X-Cache` nos endpoints cacheados (Fase 7) — se está vindo `MISS` toda hora sob carga, o Redis pode estar sendo despejado (`maxmemory-policy`) ou o TTL está curto pra esse volume.
3. **Falha só no `spike_viral`, os outros dois passam** → o sistema aguenta carga sustentada mas não absorve o pico inicial. Em produção (Railway) isso normalmente significa que o autoscaling/health check não reage rápido o suficiente — revisar o `healthcheckTimeout` do serviço (ver `DEPLOY.md` na raiz).
4. **Memory leak (Parte C do pedido original — "zero memory leaks após 10 minutos")**: o k6 não mede memória do servidor diretamente. Durante o `carga_constante` (os 10 minutos completos), monitore a memória do processo da API/worker no painel do Railway (ou `docker stats` localmente) — se ela cresce de forma constante e não estabiliza, é vazamento, independente do que os thresholds de latência/erro do k6 digam.

## Quando escalar

Se os 3 cenários passarem confortavelmente (métricas com folga, não só "passou raspando"), 500 usuários simultâneos está validado. Pra saber o próximo teto, suba `vus`/`target` gradualmente (ex.: 800, depois 1200) até algum threshold quebrar — esse é o limite real da infra atual, e o ponto de partida pra decidir o próximo upgrade de plano (Supabase/Upstash/Railway) antes de precisar dele de verdade.
