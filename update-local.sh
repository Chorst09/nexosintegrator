#!/bin/bash
set -e

echo "=== ATUALIZANDO AMBIENTE LOCAL ==="
echo ""

# 1. API - Instalar dependências
echo "1. Instalando dependências da API..."
cd apps/api
npm install

# 2. API - Gerar cliente Prisma
echo "2. Gerando cliente Prisma..."
npm run db:generate

# 3. Frontend - Instalar dependências
echo "3. Instalando dependências do Frontend..."
cd ../web
npm install

# 4. Frontend - Build
echo "4. Build do Frontend..."
npm run build

echo ""
echo "=== ATUALIZAÇÃO LOCAL CONCLUÍDA ==="
echo ""
echo "Próximos passos:"
echo "1. Subir Docker: docker-compose up -d"
echo "2. Acessar: http://localhost:5173"
echo ""