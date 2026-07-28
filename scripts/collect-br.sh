#!/bin/bash
set -euo pipefail

echo "================================================"
echo "  ShopSpy — Coleta BR com IP Residencial (produção)"
echo "  $(date '+%d/%m/%Y %H:%M')"
echo "================================================"

API="https://shopspy-production.up.railway.app"
TOKEN="${INTERNAL_TOKEN:-shopspy-internal-token-2026}"

trigger() {
  local SOURCE=$1
  local WAIT=$2
  echo ""
  echo ">>> Iniciando $SOURCE..."
  RESULT=$(curl -s -X POST "$API/internal/jobs/$SOURCE/trigger" \
    -H "X-Internal-Token: $TOKEN" \
    -H "Content-Type: application/json")
  echo "    Resultado: $RESULT"
  echo "    Aguardando ${WAIT}s para próximo scraper..."
  sleep "$WAIT"
}

echo "Verificando API de produção..."
HEALTH_BODY=$(curl -s "$API/api/v1/health")
if ! echo "$HEALTH_BODY" | grep -q '"status":"ok"'; then
  echo "ERRO: API de produção não respondeu com status ok"
  echo "Resposta: $HEALTH_BODY"
  exit 1
fi
echo "API OK!"

trigger "SHOPEE_BR" 90
trigger "TIKTOK_SHOP_BR" 90
trigger "MERCADOLIVRE_BR" 60
trigger "GOOGLE_TRENDS_BR" 120

echo ""
echo ">>> Calculando scores..."
curl -s -X POST "$API/internal/jobs/SCORE_CALCULATOR/trigger" \
  -H "X-Internal-Token: $TOKEN" > /dev/null

echo ""
echo "================================================"
echo "  Coleta BR concluída!"
echo "  Abra o dashboard para ver os produtos BR"
echo "  https://shopspy-web.vercel.app/explorar"
echo "================================================"
