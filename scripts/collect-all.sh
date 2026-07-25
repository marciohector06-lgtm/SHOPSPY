#!/bin/bash
set -euo pipefail

# Roda tudo — global + BR
# Execute da sua máquina em casa (IP residencial, necessário para os scrapers BR)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

bash "$SCRIPT_DIR/collect-global.sh"
echo ""
echo "Aguardando 2 minutos antes da coleta BR..."
sleep 120
bash "$SCRIPT_DIR/collect-br.sh"
