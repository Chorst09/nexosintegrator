#!/bin/bash

# Script de setup automatizado para NexosCRM
# Este script configura o ambiente de desenvolvimento local

set -e

echo "🚀 Iniciando setup do NexosCRM..."
echo ""

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Por favor, instale Node.js 18+ primeiro."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js versão 18+ é necessária. Versão atual: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) encontrado"
echo ""

# Instalar dependências raiz
echo "📦 Instalando dependências raiz..."
npm install
echo ""

# Instalar dependências do frontend
echo "📦 Instalando dependências do frontend..."
cd apps/web
npm install
cd ../..
echo ""

# Instalar dependências das functions
echo "📦 Instalando dependências das Netlify Functions..."
cd netlify/functions
npm install
cd ../..
echo ""

# Verificar se .env existe
if [ ! -f .env ]; then
    echo "⚙️  Criando arquivo .env..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANTE: Edite o arquivo .env com suas credenciais do Supabase!"
    echo ""
    echo "   1. Acesse https://supabase.com e crie um projeto"
    echo "   2. Copie as connection strings do Supabase"
    echo "   3. Cole no arquivo .env"
    echo ""
    read -p "Pressione ENTER quando terminar de configurar o .env..."
else
    echo "✅ Arquivo .env já existe"
fi
echo ""

# Verificar se DATABASE_URL está configurada
if grep -q "YOUR-PASSWORD" .env 2>/dev/null; then
    echo "⚠️  DATABASE_URL ainda não foi configurada!"
    echo "   Por favor, edite o arquivo .env com suas credenciais do Supabase"
    exit 1
fi

# Gerar Prisma Client
echo "🔧 Gerando Prisma Client..."
cd netlify/functions
npx prisma generate
echo ""

# Perguntar se quer rodar migrations
read -p "🗄️  Deseja rodar as migrations do banco de dados agora? (s/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "🗄️  Rodando migrations..."
    npx prisma migrate deploy
    echo ""
fi
cd ../..

# Verificar se Netlify CLI está instalado
if ! command -v netlify &> /dev/null; then
    echo "📦 Netlify CLI não encontrado. Instalando..."
    npm install -g netlify-cli
    echo ""
fi

echo "✅ Setup concluído com sucesso!"
echo ""
echo "🎉 Próximos passos:"
echo ""
echo "   1. Para desenvolvimento local:"
echo "      npm run dev"
echo ""
echo "   2. Para acessar o Prisma Studio:"
echo "      npm run prisma:studio"
echo ""
echo "   3. Para fazer deploy:"
echo "      netlify deploy --prod"
echo ""
echo "📚 Documentação:"
echo "   - Deploy: DEPLOY_NETLIFY_SUPABASE.md"
echo "   - Migração de APIs: MIGRACAO_APIS.md"
echo "   - README: README.md"
echo ""
echo "🆘 Precisa de ajuda? Abra uma issue no GitHub!"
echo ""
