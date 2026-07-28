#!/bin/bash
set -euo pipefail

echo "================================================"
echo "  ShopSpy — Coleta Global (produção)"
echo "  $(date '+%d/%m/%Y %H:%M')"
echo "================================================"

API="https://shopspy-production.up.railway.app"
TOKEN="${INTERNAL_TOKEN:-shopspy-internal-token-2026}"

trigger() {
  local SOURCE=$1
  local WAIT=$2
  echo ">>> $SOURCE..."
  curl -s -X POST "$API/internal/jobs/$SOURCE/trigger" \
    -H "X-Internal-Token: $TOKEN" > /dev/null
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

# Amazon (mais confiável, roda primeiro)
trigger "AMAZON_US" 30
trigger "AMAZON_UK" 30

# AliExpress
trigger "ALIEXPRESS_GLOBAL" 30

# TikTok Creative Center — US/UK/AU já cobertos por TIKTOK_CREATIVE_US
trigger "TIKTOK_CREATIVE_US" 60

# TikTok Creative Center — países novos (LATAM, Europa, Ásia)
trigger "TIKTOK_CREATIVE_MX" 60
trigger "TIKTOK_CREATIVE_CO" 60
trigger "TIKTOK_CREATIVE_AR" 60
trigger "TIKTOK_CREATIVE_CL" 60
trigger "TIKTOK_CREATIVE_TH" 60
trigger "TIKTOK_CREATIVE_ID" 60
trigger "TIKTOK_CREATIVE_VN" 60
trigger "TIKTOK_CREATIVE_JP" 60
trigger "TIKTOK_CREATIVE_FR" 60
trigger "TIKTOK_CREATIVE_DE" 60
trigger "TIKTOK_CREATIVE_IT" 60

# TikTok Shop US (BR/internacional ficam de fora por enquanto)
trigger "TIKTOK_SHOP_US" 60

# Google Trends (referência US)
trigger "GOOGLE_TRENDS_US" 120

# Score final
echo ">>> Calculando scores..."
curl -s -X POST "$API/internal/jobs/SCORE_CALCULATOR/trigger" \
  -H "X-Internal-Token: $TOKEN" > /dev/null

echo ""
echo "================================================"
echo "  Coleta global concluída!"
echo "  https://shopspy-web.vercel.app/explorar"
echo "================================================"
