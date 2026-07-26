@echo off
REM Roda scrapers que precisam de IP residencial contra a API de PRODUCAO.
REM TIKTOK_CREATIVE_* fica de fora de proposito: nao e bloqueio de IP, o
REM Creative Center agora exige conta TikTok Business logada (confirmado
REM via inspecao de rede). Rodar daqui nao muda esse resultado.
echo ================================================
echo   ShopSpy - Coleta TikTok Shop BR (IP Residencial)
echo ================================================

set API=https://shopspy-production.up.railway.app
set TOKEN=shopspy-internal-token-2026

echo Verificando API de producao...
curl -s %API%/api/v1/health | findstr /C:"\"status\":\"ok\"" > nul
if %errorlevel% neq 0 (
  echo ERRO: API de producao nao respondeu com status ok
  pause
  exit /b 1
)

echo API OK! Iniciando coleta...

echo Coletando TIKTOK_SHOP_BR...
curl -s -X POST %API%/internal/jobs/TIKTOK_SHOP_BR/trigger -H "X-Internal-Token: %TOKEN%"
timeout /t 90 /nobreak > nul

echo Recalculando scores...
curl -s -X POST %API%/internal/jobs/SCORE_CALCULATOR/trigger -H "X-Internal-Token: %TOKEN%"

echo ================================================
echo   Coleta concluida! Acesse:
echo   https://shopspy-web.vercel.app/explorar
echo ================================================
pause
