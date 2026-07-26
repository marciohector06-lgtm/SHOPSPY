#!/bin/bash
set -euo pipefail

# Roda scrapers que precisam de IP residencial contra a API de PRODUÇÃO.
# TIKTOK_CREATIVE_* fica de fora de propósito: não é bloqueio de IP, o
# Creative Center agora exige conta TikTok Business logada (confirmado via
# inspeção de rede — a API interna devolve "invalid user" pra qualquer IP,
# residencial ou não). Rodar daqui não muda esse resultado.
# Execute com: npm run collect:tiktok

echo "================================================"
echo "  ShopSpy — Coleta TikTok Shop BR (IP Residencial)"
echo "  $(date '+%d/%m/%Y %H:%M')"
echo "================================================"

API="https://shopspy-production.up.railway.app"
TOKEN="${INTERNAL_TOKEN:-shopspy-internal-token-2026}"

trigger() {
  local SOURCE=$1
  local WAIT=$2
  echo ">>> $SOURCE..."
  RESULT=$(curl -s -X POST "$API/internal/jobs/$SOURCE/trigger" \
    -H "X-Internal-Token: $TOKEN")
  echo "    $RESULT"
  sleep "$WAIT"
}

echo "Verificando API de produção..."
HEALTH_BODY=$(curl -s "$API/api/v1/health")
if ! echo "$HEALTH_BODY" | grep -q '"status":"ok"'; then
  echo "ERRO: API de produção não respondeu com status ok"
  echo "Resposta: $HEALTH_BODY"
  exit 1
fi
echo "API OK! Iniciando coleta..."
echo ""

trigger "TIKTOK_SHOP_BR" 90

echo ""
echo ">>> Recalculando scores..."
curl -s -X POST "$API/internal/jobs/SCORE_CALCULATOR/trigger" \
  -H "X-Internal-Token: $TOKEN" > /dev/null

echo ""
echo "================================================"
echo "  Coleta TikTok concluída!"
echo "  Abra o dashboard para ver os produtos"
echo "  https://shopspy-web.vercel.app/explorar"
echo "================================================"
