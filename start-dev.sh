#!/bin/bash

echo "🐳 Parando containers antigos..."
docker-compose down

echo "🗑️  Removendo volume antigo..."
docker volume rm nexoscrm-main_postgres_data 2>/dev/null || true

echo "🚀 Iniciando PostgreSQL no Docker..."
docker-compose up -d

echo "⏳ Aguardando PostgreSQL ficar pronto..."
sleep 10

echo "🔄 Rodando migrations..."
cd apps/api && npm run db:migrate

echo "✅ Ambiente pronto! Iniciando servidores..."
cd ../.. && npm run dev
