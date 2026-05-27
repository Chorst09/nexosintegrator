#!/bin/bash
# ============================================
# Script de Deploy - NexosCRM
# Servidor: 209.50.241.25
# ============================================

set -e

SERVER_IP="209.50.241.25"
SERVER_USER="root"
SERVER_PORT="22"
APP_DIR="/opt/nexoscrm"

echo "🚀 Iniciando deploy do NexosCRM para $SERVER_IP..."

# 1. Verificar se sshpass está instalado (para senha via script)
if ! command -v sshpass &> /dev/null; then
    echo "⚠️  sshpass não encontrado. Instale com: brew install sshpass"
    echo "   Ou use: ssh-copy-id root@$SERVER_IP para configurar chave SSH"
    echo ""
    echo "   Continuando sem sshpass (será pedida a senha manualmente)..."
    SSH_CMD="ssh -p $SERVER_PORT"
    SCP_CMD="scp -P $SERVER_PORT"
else
    SSH_CMD="sshpass -p tq6vJPwtZbOCW3kj ssh -p $SERVER_PORT -o StrictHostKeyChecking=no"
    SCP_CMD="sshpass -p tq6vJPwtZbOCW3kj scp -P $SERVER_PORT -o StrictHostKeyChecking=no"
fi

echo ""
echo "📦 Passo 1: Preparando servidor..."
$SSH_CMD $SERVER_USER@$SERVER_IP << 'ENDSSH'
    # Instalar Docker se não existir
    if ! command -v docker &> /dev/null; then
        echo "Instalando Docker..."
        curl -fsSL https://get.docker.com | sh
        systemctl enable docker
        systemctl start docker
    fi

    # Instalar Docker Compose se não existir
    if ! command -v docker compose &> /dev/null; then
        echo "Instalando Docker Compose plugin..."
        apt-get update -qq
        apt-get install -y docker-compose-plugin
    fi

    # Criar diretório da aplicação
    mkdir -p /opt/nexoscrm
    echo "✅ Servidor preparado"
ENDSSH

echo ""
echo "📁 Passo 2: Enviando arquivos para o servidor..."

# Criar arquivo tar excluindo node_modules e arquivos desnecessários
tar --exclude='./node_modules' \
    --exclude='./.git' \
    --exclude='./frontend/node_modules' \
    --exclude='./backend/node_modules' \
    --exclude='./apps/*/node_modules' \
    --exclude='./netlify/functions/node_modules' \
    --exclude='./frontend/dist' \
    --exclude='./*.md' \
    --exclude='./*.sh' \
    --exclude='./deploy-servidor.sh' \
    --exclude='./backups-preparados' \
    --exclude='./docs' \
    -czf /tmp/nexoscrm-deploy.tar.gz .

echo "   Arquivo criado: $(du -sh /tmp/nexoscrm-deploy.tar.gz | cut -f1)"

# Enviar para o servidor
$SCP_CMD /tmp/nexoscrm-deploy.tar.gz $SERVER_USER@$SERVER_IP:/opt/nexoscrm/

echo ""
echo "🔧 Passo 3: Extraindo e configurando no servidor..."
$SSH_CMD $SERVER_USER@$SERVER_IP << 'ENDSSH'
    cd /opt/nexoscrm
    
    # Parar containers existentes se houver
    if [ -f docker-compose.production.yml ]; then
        docker compose -f docker-compose.production.yml down 2>/dev/null || true
    fi
    
    # Extrair arquivos
    tar -xzf nexoscrm-deploy.tar.gz
    rm nexoscrm-deploy.tar.gz
    
    # Preparar .env de produção sem quebrar deploys quando o arquivo local não existir
    if [ -f .env.production ]; then
        cp .env.production .env
    elif [ ! -f .env ]; then
        cat > .env << 'ENVEOF'
DB_PASSWORD=NexosCRM@2024!
JWT_SECRET=NexosCRM_JWT_Super_Secret_2024
CORS_ORIGIN=http://209.50.241.25
VITE_API_URL=/api
ENVEOF
    fi
    
    echo "✅ Arquivos extraídos"
ENDSSH

echo ""
echo "🐳 Passo 4: Fazendo build e subindo containers..."
$SSH_CMD $SERVER_USER@$SERVER_IP << 'ENDSSH'
    cd /opt/nexoscrm
    
    # Build e start
    docker compose -f docker-compose.production.yml --env-file .env up -d --build
    
    echo "⏳ Aguardando containers iniciarem..."
    sleep 15
    
    # Verificar status
    docker compose -f docker-compose.production.yml ps
ENDSSH

echo ""
echo "🗄️  Passo 5: Executando migrations do banco de dados..."
$SSH_CMD $SERVER_USER@$SERVER_IP << 'ENDSSH'
    cd /opt/nexoscrm
    
    # Aguardar PostgreSQL estar pronto
    echo "Aguardando PostgreSQL..."
    sleep 10
    
    # Sincronizar schema e executar migrations via Prisma
    docker compose -f docker-compose.production.yml exec -T backend npx prisma db push
    docker compose -f docker-compose.production.yml exec -T backend npx prisma migrate deploy
    
    echo "✅ Migrations executadas"
ENDSSH

echo ""
echo "👤 Passo 6: Executando setup inicial do sistema..."
$SSH_CMD $SERVER_USER@$SERVER_IP << 'ENDSSH'
    cd /opt/nexoscrm
    
    # Executar setup inicial
    docker compose -f docker-compose.production.yml exec -T backend node prisma/migrate-production.js
    
    echo "✅ Setup inicial concluído"
ENDSSH

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "🌐 Acesse: http://$SERVER_IP"
echo "📧 Login:  admin@nexoscrm.com"
echo "🔑 Senha:  Admin@2024!"
echo ""
echo "⚠️  IMPORTANTE: Troque a senha após o primeiro acesso!"
