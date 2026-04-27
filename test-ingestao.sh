#!/bin/bash

# Script de Teste da Ingestão de Portais
# Verifica se o sistema de busca está funcionando corretamente

echo "🔍 Testando Sistema de Ingestão de Portais"
echo "=========================================="
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verificar se o backend está rodando
echo "1️⃣ Verificando backend..."
if lsof -ti:8888 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Backend está rodando na porta 8888"
else
    echo -e "${RED}✗${NC} Backend NÃO está rodando na porta 8888"
    echo "   Execute: npm run dev"
    exit 1
fi
echo ""

# 2. Verificar dependências
echo "2️⃣ Verificando dependências..."
cd netlify/functions

if npm list playwright 2>/dev/null | grep -q "playwright@"; then
    echo -e "${GREEN}✓${NC} Playwright instalado"
else
    echo -e "${RED}✗${NC} Playwright NÃO instalado"
    echo "   Execute: npm install playwright"
fi

if npm list @sparticuz/chromium 2>/dev/null | grep -q "@sparticuz/chromium@"; then
    echo -e "${GREEN}✓${NC} @sparticuz/chromium instalado"
else
    echo -e "${RED}✗${NC} @sparticuz/chromium NÃO instalado"
    echo "   Execute: npm install @sparticuz/chromium"
fi

cd ../..
echo ""

# 3. Testar endpoint PNCP
echo "3️⃣ Testando endpoint PNCP..."
PNCP_RESPONSE=$(curl -s "http://localhost:8888/api/pncp-proxy?dataFinal=20260416&codigoModalidadeContratacao=6&pagina=1&tamanhoPagina=5")

if echo "$PNCP_RESPONSE" | grep -q '"data"'; then
    PNCP_COUNT=$(echo "$PNCP_RESPONSE" | grep -o '"data":\[' | wc -l)
    echo -e "${GREEN}✓${NC} Endpoint PNCP funcionando"
    echo "   Resposta recebida com sucesso"
else
    echo -e "${RED}✗${NC} Endpoint PNCP com problemas"
    echo "   Resposta: $PNCP_RESPONSE"
fi
echo ""

# 4. Testar endpoint BLL
echo "4️⃣ Testando endpoint BLL..."
BLL_RESPONSE=$(curl -s "http://localhost:8888/api/bll-proxy?objeto=software&pagina=1&tamanhoPagina=5")

if echo "$BLL_RESPONSE" | grep -q '"data"'; then
    echo -e "${GREEN}✓${NC} Endpoint BLL funcionando"
    
    # Verificar se retornou dados
    if echo "$BLL_RESPONSE" | grep -q '"total":0'; then
        echo -e "${YELLOW}⚠${NC}  BLL retornou 0 resultados (pode ser normal)"
        echo "   Configure credenciais na interface para melhorar resultados"
    else
        echo "   Resultados encontrados!"
    fi
    
    # Verificar método usado
    if echo "$BLL_RESPONSE" | grep -q '"method":"scraper"'; then
        echo "   Método: Scraper (fallback)"
    elif echo "$BLL_RESPONSE" | grep -q '"method":"api"'; then
        echo "   Método: API"
    fi
else
    echo -e "${RED}✗${NC} Endpoint BLL com problemas"
    echo "   Resposta: $BLL_RESPONSE"
fi
echo ""

# 5. Verificar frontend
echo "5️⃣ Verificando frontend..."
if lsof -ti:5174 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Frontend está rodando na porta 5174"
    echo "   Acesse: http://localhost:5174/b2g-portal-busca"
else
    echo -e "${YELLOW}⚠${NC}  Frontend NÃO está rodando na porta 5174"
    echo "   Execute: npm run dev (na pasta apps/web)"
fi
echo ""

# Resumo
echo "=========================================="
echo "📊 Resumo do Teste"
echo "=========================================="
echo ""
echo "Para testar na interface:"
echo "1. Acesse: http://localhost:5174/b2g-portal-busca"
echo "2. Clique na aba 'Ingestão'"
echo "3. Configure suas credenciais do BLL"
echo "4. Volte para 'Resultados' e faça uma busca"
echo ""
echo "Você deve ver cards com badges:"
echo "  🔵 PNCP - Portal Nacional"
echo "  🟠 BLL - Bolsa de Licitações"
echo ""
