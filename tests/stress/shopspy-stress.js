// k6 run tests/stress/shopspy-stress.js
// Ver tests/stress/README.md para variáveis de ambiente, como rodar cada
// cenário isoladamente e como interpretar o resultado.
import http from "k6/http";
import { check, sleep } from "k6";
import crypto from "k6/crypto";
import encoding from "k6/encoding";

const BASE_URL = __ENV.BASE_URL || "http://localhost:4000";
const JWT_SECRET = __ENV.JWT_ACCESS_SECRET || "";

function base64url(input) {
  return encoding.b64encode(input, "rawurl");
}

/**
 * Assina um access token PRO válido pro ambiente sob teste (mesmo
 * HS256/JOSE que a API usa) — sem isso não daria pra estressar os
 * endpoints reais de oportunidade, que exigem login desde a Fase 9.
 * Sem JWT_ACCESS_SECRET, o script ainda roda, só que só contra /health
 * (documentado no README).
 */
function signAccessToken() {
  if (!JWT_SECRET) return null;

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sub: "k6-load-test-user",
    email: "load-test@shopspy.com.br",
    plan: "PRO",
    name: "k6",
    avatarUrl: null,
    iat: now,
    exp: now + 3600,
  };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = crypto.hmac("sha256", JWT_SECRET, signingInput, "base64rawurl");
  return `${signingInput}.${signature}`;
}

const ACCESS_TOKEN = signAccessToken();
const AUTH_PARAMS = ACCESS_TOKEN ? { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } } : {};

export const options = {
  scenarios: {
    // 1) Carga constante: 500 usuários simultâneos por 10 minutos —
    // valida estabilidade sustentada (memory leak, degradação ao longo do tempo).
    carga_constante: {
      executor: "constant-vus",
      vus: 500,
      duration: "10m",
      exec: "defaultScenario",
      startTime: "0s",
    },
    // 2) Rampa crescente: 0 -> 500 gradualmente — valida como o sistema
    // se comporta crescendo (autoscaling, pool de conexões, cache esquentando).
    rampa_crescente: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 500 },
        { duration: "5m", target: 500 },
        { duration: "2m", target: 0 },
      ],
      exec: "defaultScenario",
      startTime: "10m30s", // 30s de intervalo depois que carga_constante termina
    },
    // 3) Spike viral: 0 -> 500 em 30s — simula um produto estourando e
    // todo mundo abrindo o dashboard ao mesmo tempo.
    spike_viral: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 500 },
        { duration: "1m", target: 500 },
        { duration: "30s", target: 0 },
      ],
      exec: "defaultScenario",
      startTime: "20m", // 30s de intervalo depois que rampa_crescente termina (10m30s+9m)
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1000"],
    http_req_failed: ["rate<0.01"],
    http_reqs: ["rate>100"],
  },
};

/**
 * Mesma função pros 3 cenários — o executor/estágios é que muda o
 * padrão de carga. k6 marca toda métrica com a tag `scenario` automaticamente,
 * então o resultado final já sai quebrado por cenário sem esforço extra.
 */
export function defaultScenario() {
  const health = http.get(`${BASE_URL}/api/v1/health`);
  check(health, { "health: status 200": (r) => r.status === 200 });

  if (ACCESS_TOKEN) {
    const top = http.get(`${BASE_URL}/api/v1/opportunities/top`, AUTH_PARAMS);
    check(top, { "opportunities/top: status 200": (r) => r.status === 200 });

    const products = http.get(`${BASE_URL}/api/v1/products?limit=20`, AUTH_PARAMS);
    check(products, { "products: status 200 ou 304": (r) => r.status === 200 });

    const dashboard = http.get(`${BASE_URL}/api/v1/dashboard/summary`, AUTH_PARAMS);
    check(dashboard, { "dashboard/summary: status 200": (r) => r.status === 200 });
  }

  sleep(1); // think time — usuário real não bate refresh sem parar
}
