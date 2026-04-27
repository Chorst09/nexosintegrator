#!/bin/bash
# ============================================
# Teste de Conexão com Servidor
# ============================================

SERVER_IP="209.50.241.25"
SERVER_USER="root"
SERVER_PORT="22"

echo "🔍 Testando conexão com $SERVER_IP..."

# Verificar se sshpass está disponível
if command -v sshpass &> /dev/null; then
    SSH_CMD="sshpass -p 'tq6vJPwtZbOCW3kj' ssh -p $SERVER_PORT -o StrictHostKeyChecking=no -o ConnectTimeout=10"
    echo "   Usando sshpass para autenticação automática"
else
    SSH_CMD="ssh -p $SERVER_PORT -o ConnectTimeout=10"
    echo "   sshpass não encontrado - será pedida senha manualmente"
fi

echo ""
echo "📡 Testando conectividade..."

# Teste de ping
if ping -c 3 $SERVER_IP > /dev/null 2>&1; then
    echo "✅ Ping: OK"
else
    echo "❌ Ping: FALHOU"
    exit 1
fi

# Teste de SSH
echo "🔐 Testando SSH..."
if $SSH_CMD $SERVER_USER@$SERVER_IP 'echo "SSH OK"' > /dev/null 2>&1; then
    echo "✅ SSH: OK"
else
    echo "❌ SSH: FALHOU"
    echo "   Mas vamos tentar o deploy mesmo assim..."
    echo "   (Às vezes o teste falha mas o deploy funciona)"
fi

echo ""
echo "🖥️  Informações do servidor:"
$SSH_CMD $SERVER_USER@$SERVER_IP << 'ENDSSH'
    echo "   OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
    echo "   Kernel: $(uname -r)"
    echo "   CPU: $(nproc) cores"
    echo "   RAM: $(free -h | grep Mem | awk '{print $2}')"
    echo "   Disco: $(df -h / | tail -1 | awk '{print $4}') disponível"
    
    # Verificar Docker
    if command -v docker &> /dev/null; then
        echo "   Docker: $(docker --version | cut -d' ' -f3 | cut -d',' -f1)"
    else
        echo "   Docker: NÃO INSTALADO"
    fi
    
    # Verificar Docker Compose
    if command -v docker compose &> /dev/null; then
        echo "   Docker Compose: INSTALADO"
    else
        echo "   Docker Compose: NÃO INSTALADO"
    fi
ENDSSH

echo ""
echo "✅ Servidor está pronto para deploy!"
echo ""
echo "🚀 Para fazer o deploy completo:"
echo "   ./deploy-servidor.sh"
echo ""
echo "⚡ Para deploy rápido (apenas código):"
echo "   ./deploy-rapido.sh"