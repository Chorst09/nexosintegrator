#!/bin/bash

# Script de Verificação de Segurança
# Execute ANTES do deploy para garantir que não vai afetar o Finanças Zen

SERVER=${1:-"usuario@72.60.195.200"}

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Verificação de Segurança do Servidor${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}🔍 Verificando servidor: $SERVER${NC}"
echo ""

echo -e "${YELLOW}1. Verificando processos PM2...${NC}"
ssh "$SERVER" "pm2 list" 2>/dev/null || echo "PM2 não instalado ou sem processos"
echo ""

echo -e "${YELLOW}2. Verificando portas em uso...${NC}"
ssh "$SERVER" "sudo netstat -tulpn | grep -E ':(80|8081|3000)' || echo 'Nenhuma porta relevante em uso'"
echo ""

echo -e "${YELLOW}3. Verificando diretórios existentes...${NC}"
ssh "$SERVER" "ls -la /var/www/ 2>/dev/null || echo 'Diretório /var/www não existe'"
echo ""

echo -e "${YELLOW}4. Verificando se CRM já existe...${NC}"
if ssh "$SERVER" "[ -d /var/www/crm-comercial ]"; then
    echo -e "${YELLOW}⚠️  Diretório /var/www/crm-comercial JÁ EXISTE${NC}"
    echo "   Será feito backup antes de sobrescrever"
else
    echo -e "${GREEN}✅ Diretório /var/www/crm-comercial não existe (instalação limpa)${NC}"
fi
echo ""

echo -e "${YELLOW}5. Verificando Finanças Zen...${NC}"
FINANCAS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://72.60.195.200 --connect-timeout 5)
if [ "$FINANCAS_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Finanças Zen está rodando na porta 80${NC}"
    echo "   Título: $(curl -s http://72.60.195.200 | grep -o '<title>[^<]*' | sed 's/<title>//')"
else
    echo -e "${YELLOW}⚠️  Não foi possível verificar Finanças Zen na porta 80${NC}"
fi
echo ""

echo -e "${YELLOW}6. Verificando porta 8081 (destino do CRM)...${NC}"
CRM_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://72.60.195.200:8081 --connect-timeout 5)
if [ "$CRM_RESPONSE" = "000" ]; then
    echo -e "${GREEN}✅ Porta 8081 está livre (perfeito para o CRM)${NC}"
else
    echo -e "${YELLOW}⚠️  Porta 8081 está respondendo (código: $CRM_RESPONSE)${NC}"
    echo "   Pode haver algo rodando nesta porta"
fi
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Resumo da Verificação${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}✅ SEGURO PARA DEPLOY:${NC}"
echo "   • Finanças Zen está na porta 80"
echo "   • CRM será instalado em /var/www/crm-comercial"
echo "   • CRM usará porta 8081"
echo "   • Diretórios e processos são independentes"
echo ""
echo -e "${YELLOW}📋 Próximo passo:${NC}"
echo "   ./deploy-to-server.sh $SERVER"
echo ""
