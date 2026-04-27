#!/bin/bash

echo "=== Teste de Login no Ambiente Local ==="
echo ""
echo "1. Testando conexão com a API..."
curl -s http://localhost:3002/api/health | jq '.'
echo ""

echo "2. Testando login com credenciais admin@crm.com / admin123..."
RESPONSE=$(curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{"email":"admin@crm.com","password":"admin123"}')

echo "$RESPONSE" | jq '.'
echo ""

if echo "$RESPONSE" | jq -e '.token' > /dev/null 2>&1; then
    echo "✅ Login bem-sucedido!"
    TOKEN=$(echo "$RESPONSE" | jq -r '.token')
    echo "Token: ${TOKEN:0:50}..."
    echo ""
    
    echo "3. Testando acesso autenticado ao dashboard..."
    curl -s http://localhost:3002/api/dashboard \
      -H "Authorization: Bearer $TOKEN" | jq '.'
else
    echo "❌ Falha no login!"
fi
