#!/bin/bash

echo "🧪 TESTE DE LOGIN - TODOS OS USUÁRIOS"
echo "====================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Array de usuários para testar
declare -a USERS=(
    "chorstconsult@gmail.com:Double@@2026:MASTER"
    "admin@crm.com:admin123:ADMIN"
    "joao@crm.com:vendedor123:SELLER"
    "maria@crm.com:vendedor123:SELLER"
)

PASSED=0
FAILED=0

for USER_DATA in "${USERS[@]}"; do
    IFS=':' read -r EMAIL PASSWORD EXPECTED_ROLE <<< "$USER_DATA"
    
    echo "🔐 Testando: $EMAIL ($EXPECTED_ROLE)"
    
    RESPONSE=$(curl -s -X POST http://localhost:3002/api/auth/login \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
    
    if echo "$RESPONSE" | grep -q "token"; then
        ROLE=$(echo "$RESPONSE" | jq -r '.user.role')
        NAME=$(echo "$RESPONSE" | jq -r '.user.name')
        
        if [ "$ROLE" = "$EXPECTED_ROLE" ]; then
            echo -e "${GREEN}   ✅ Login OK - $NAME ($ROLE)${NC}"
            ((PASSED++))
        else
            echo -e "${RED}   ❌ Role incorreto - Esperado: $EXPECTED_ROLE, Recebido: $ROLE${NC}"
            ((FAILED++))
        fi
    else
        echo -e "${RED}   ❌ Falha no login${NC}"
        ((FAILED++))
    fi
    echo ""
done

echo "====================================="
echo -e "Resultados: ${GREEN}$PASSED passaram${NC}, ${RED}$FAILED falharam${NC}"
echo "====================================="

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 TODOS OS TESTES PASSARAM!${NC}"
    exit 0
else
    echo -e "${RED}❌ Alguns testes falharam${NC}"
    exit 1
fi
