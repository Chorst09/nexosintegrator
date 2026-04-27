#!/bin/bash

echo "🧪 TESTE FINAL DE LOGIN - CRM NEXOS"
echo "===================================="
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Teste 1: API Health
echo "📡 Teste 1: Verificando API..."
HEALTH=$(curl -s http://localhost:3002/api/health)
if echo "$HEALTH" | grep -q "ok"; then
    echo -e "${GREEN}✅ API está respondendo${NC}"
else
    echo -e "${RED}❌ API não está respondendo${NC}"
    exit 1
fi

# Teste 2: Login do usuário MASTER
echo ""
echo "🔐 Teste 2: Testando login do usuário MASTER..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3002/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"chorstconsult@gmail.com","password":"Double@@2026"}')

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    echo -e "${GREEN}✅ Login realizado com sucesso${NC}"
    
    # Extrair informações do usuário
    USER_NAME=$(echo "$LOGIN_RESPONSE" | jq -r '.user.name')
    USER_EMAIL=$(echo "$LOGIN_RESPONSE" | jq -r '.user.email')
    USER_ROLE=$(echo "$LOGIN_RESPONSE" | jq -r '.user.role')
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
    
    echo -e "${GREEN}   👤 Nome: $USER_NAME${NC}"
    echo -e "${GREEN}   📧 Email: $USER_EMAIL${NC}"
    echo -e "${GREEN}   🔑 Role: $USER_ROLE${NC}"
    echo -e "${GREEN}   🎫 Token: ${TOKEN:0:50}...${NC}"
else
    echo -e "${RED}❌ Erro no login${NC}"
    echo "$LOGIN_RESPONSE" | jq .
    exit 1
fi

# Teste 3: Validar token
echo ""
echo "🎫 Teste 3: Validando token..."
ME_RESPONSE=$(curl -s http://localhost:3002/api/auth/me \
    -H "Authorization: Bearer $TOKEN")

if echo "$ME_RESPONSE" | grep -q "email"; then
    echo -e "${GREEN}✅ Token válido e usuário autenticado${NC}"
    
    # Contar permissões
    PERMISSIONS_COUNT=$(echo "$ME_RESPONSE" | jq '.permissions | length')
    echo -e "${GREEN}   📊 Permissões carregadas: $PERMISSIONS_COUNT${NC}"
else
    echo -e "${RED}❌ Token inválido${NC}"
    exit 1
fi

# Teste 4: Verificar proxy do Vite
echo ""
echo "🔄 Teste 4: Testando proxy do Vite..."
PROXY_RESPONSE=$(curl -s -X POST http://localhost:5174/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"chorstconsult@gmail.com","password":"Double@@2026"}')

if echo "$PROXY_RESPONSE" | grep -q "token"; then
    echo -e "${GREEN}✅ Proxy do Vite funcionando corretamente${NC}"
else
    echo -e "${RED}❌ Proxy do Vite com problemas${NC}"
    exit 1
fi

# Teste 5: Verificar usuário no banco
echo ""
echo "💾 Teste 5: Verificando usuário no banco de dados..."
DB_CHECK=$(PGPASSWORD=crm123 psql -h localhost -p 5434 -U crm -d crm -t -c "SELECT COUNT(*) FROM \"User\" WHERE email = 'chorstconsult@gmail.com' AND role = 'MASTER';")

if [ "$DB_CHECK" -eq 1 ]; then
    echo -e "${GREEN}✅ Usuário MASTER encontrado no banco${NC}"
else
    echo -e "${RED}❌ Usuário MASTER não encontrado no banco${NC}"
    exit 1
fi

# Resumo final
echo ""
echo "=================================="
echo -e "${GREEN}🎉 TODOS OS TESTES PASSARAM!${NC}"
echo "=================================="
echo ""
echo "📋 Credenciais de acesso:"
echo "   Email: chorstconsult@gmail.com"
echo "   Senha: Double@@2026"
echo ""
echo "🌐 URLs:"
echo "   Frontend: http://localhost:5174"
echo "   API: http://localhost:3002"
echo ""
echo "✅ O sistema está pronto para uso!"
