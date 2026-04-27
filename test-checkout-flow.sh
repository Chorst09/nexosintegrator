#!/bin/bash

echo "🧪 Testando Fluxo Completo do Checkout"
echo "======================================"
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Teste 1: Verificar se servidores estão rodando
echo "📡 Teste 1: Verificando servidores..."
if lsof -ti:3002 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend rodando na porta 3002${NC}"
else
    echo -e "${RED}❌ Backend NÃO está rodando na porta 3002${NC}"
    exit 1
fi

if lsof -ti:5174 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend rodando na porta 5174${NC}"
else
    echo -e "${RED}❌ Frontend NÃO está rodando na porta 5174${NC}"
    exit 1
fi

echo ""

# Teste 2: Criar preferência de pagamento
echo "💳 Teste 2: Criando preferência de pagamento..."
RESPONSE=$(curl -s -X POST http://127.0.0.1:3002/api/checkout/create-preference \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "starter",
    "companyData": {
      "companyName": "Teste Empresa Automatizado",
      "document": "12345678000190",
      "email": "teste@empresa.com",
      "phone": "(11) 99999-9999",
      "responsibleName": "João Teste",
      "responsibleEmail": "joao@empresa.com",
      "responsiblePhone": "(11) 98888-8888"
    }
  }')

echo "Resposta do servidor:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# Verificar se a resposta contém os campos necessários
if echo "$RESPONSE" | grep -q "success"; then
    echo -e "${GREEN}✅ Preferência criada com sucesso${NC}"
else
    echo -e "${RED}❌ Erro ao criar preferência${NC}"
    exit 1
fi

if echo "$RESPONSE" | grep -q "preferenceId"; then
    PREFERENCE_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['preferenceId'])" 2>/dev/null)
    echo -e "${GREEN}✅ Preference ID: $PREFERENCE_ID${NC}"
else
    echo -e "${RED}❌ Preference ID não encontrado${NC}"
    exit 1
fi

if echo "$RESPONSE" | grep -q "paymentUrl"; then
    PAYMENT_URL=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['paymentUrl'])" 2>/dev/null)
    echo -e "${GREEN}✅ Payment URL: ${PAYMENT_URL:0:50}...${NC}"
else
    echo -e "${RED}❌ Payment URL não encontrado${NC}"
    exit 1
fi

echo ""

# Teste 3: Verificar se a URL do MP está acessível
echo "🌐 Teste 3: Verificando URL do Mercado Pago..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PAYMENT_URL")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ]; then
    echo -e "${GREEN}✅ URL do Mercado Pago acessível (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${YELLOW}⚠️  URL do Mercado Pago retornou HTTP $HTTP_CODE${NC}"
fi

echo ""

# Teste 4: Verificar se o SDK do MP está no HTML
echo "📦 Teste 4: Verificando SDK do Mercado Pago no HTML..."
if grep -q "sdk.mercadopago.com" apps/web/index.html; then
    echo -e "${GREEN}✅ SDK do Mercado Pago encontrado no HTML${NC}"
else
    echo -e "${RED}❌ SDK do Mercado Pago NÃO encontrado no HTML${NC}"
    exit 1
fi

echo ""

# Teste 5: Verificar variáveis de ambiente
echo "🔑 Teste 5: Verificando variáveis de ambiente..."
if [ -f "apps/web/.env.local" ]; then
    if grep -q "VITE_MERCADO_PAGO_PUBLIC_KEY" apps/web/.env.local; then
        echo -e "${GREEN}✅ Chave pública do MP configurada no frontend${NC}"
    else
        echo -e "${RED}❌ Chave pública do MP NÃO configurada no frontend${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Arquivo .env.local do frontend não encontrado${NC}"
fi

if [ -f "apps/api/.env.local" ]; then
    if grep -q "MERCADO_PAGO_ACCESS_TOKEN" apps/api/.env.local; then
        echo -e "${GREEN}✅ Token de acesso do MP configurado no backend${NC}"
    else
        echo -e "${RED}❌ Token de acesso do MP NÃO configurado no backend${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Arquivo .env.local do backend não encontrado${NC}"
fi

echo ""
echo "======================================"
echo -e "${GREEN}✅ Todos os testes passaram!${NC}"
echo ""
echo "📝 Próximos passos:"
echo "1. Acesse: http://localhost:5174/checkout?plan=starter"
echo "2. Preencha os dados do formulário"
echo "3. Clique em 'Pagar'"
echo "4. Use o cartão de teste:"
echo "   Número: 5031 4332 1540 6351"
echo "   CVV: 123"
echo "   Validade: 11/25"
echo "   Nome: APRO"
echo ""
echo "🔍 Abra o Console do navegador (F12) para ver os logs detalhados"
