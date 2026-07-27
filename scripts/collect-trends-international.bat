@echo off
REM Roda scrapers internacionais que precisam de IP residencial contra a API de PRODUCAO.
REM Ordem: GOOGLE_TRENDS_INTERNATIONAL primeiro (popula RegionalScore pras 11
REM regioes LATAM/Asia/Europa) -> EXPLOSIVE_DETECTOR depois (le
REM RegionalScore.isExplosive, so acha algo se o Trends ja tiver rodado) ->
REM BR_MATCHER por ultimo (independente dos outros dois - so casa produto
REM global com equivalente BR via Shopee/Mercado Livre - mas roda no fim pra
REM nao competir por rate limit/CPU com os dois primeiros).
REM
REM AVISO: GOOGLE_TRENDS_INTERNATIONAL processa TODOS os produtos monitorados
REM x 11 regioes. Isso pode ultrapassar o timeout de job de 8min (480s) so
REM pelo volume, mesmo com IP residencial funcionando perfeitamente - se
REM "Recalculando"/"Verificando alertas" vier de um job que ainda nao
REM terminou, confira /api/v1/health depois pra ver o resultado real.
echo ================================================
echo   ShopSpy - Coleta Trends Internacional (IP Residencial)
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

echo Coletando GOOGLE_TRENDS_INTERNATIONAL (produtos monitorados x 11 regioes - pode demorar ate 8min)...
curl -s -X POST %API%/internal/jobs/GOOGLE_TRENDS_INTERNATIONAL/trigger -H "X-Internal-Token: %TOKEN%"
REM "ping" em vez de "timeout": ver collect-tiktok.bat - evita conflito com
REM o timeout do Git Bash/coreutils quando esse .bat roda por la.
ping -n 481 127.0.0.1 > nul

echo Verificando alertas de crescimento explosivo (EXPLOSIVE_DETECTOR)...
curl -s -X POST %API%/internal/jobs/EXPLOSIVE_DETECTOR/trigger -H "X-Internal-Token: %TOKEN%"
ping -n 31 127.0.0.1 > nul

echo Cruzando produtos globais com equivalentes BR (BR_MATCHER: Shopee + fallback Mercado Livre)...
curl -s -X POST %API%/internal/jobs/BR_MATCHER/trigger -H "X-Internal-Token: %TOKEN%"

echo ================================================
echo   Coleta concluida! Confira o resultado real em:
echo   %API%/api/v1/health
echo   https://shopspy-web.vercel.app/explorar
echo ================================================
pause
