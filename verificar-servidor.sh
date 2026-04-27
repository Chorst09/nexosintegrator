#!/bin/bash
# ============================================
# Verificar Status do Servidor
# ============================================

SERVER_IP="209.50.241.25"
SERVER_USER="root"
SERVER_PASS="tq6vJPwtZbOCW3kj"

echo "🔍 Verificando status do servidor $SERVER_IP..."
echo ""

# Criar script de verificação
cat > check_server.exp << 'EOF'
#!/usr/bin/expect -f

set timeout 30
set server_ip [lindex $argv 0]
set server_user [lindex $argv 1]
set server_pass [lindex $argv 2]

spawn ssh -o StrictHostKeyChecking=no $server_user@$server_ip

expect {
    "password:" {
        send "$server_pass\r"
        exp_continue
    }
    "# " {
        send "echo '=== VERIFICAÇÃO DO SISTEMA ==='\r"
        expect "# "
        
        send "echo '1. Verificando serviços:'\r"
        expect "# "
        
        send "systemctl status nginx --no-pager -l\r"
        expect "# "
        
        send "systemctl status postgresql --no-pager -l\r"
        expect "# "
        
        send "echo '2. Verificando Node.js e PM2:'\r"
        expect "# "
        
        send "node --version 2>/dev/null || echo 'Node.js não instalado'\r"
        expect "# "
        
        send "pm2 status 2>/dev/null || echo 'PM2 não instalado'\r"
        expect "# "
        
        send "echo '3. Verificando diretórios:'\r"
        expect "# "
        
        send "ls -la /var/www/ 2>/dev/null || echo 'Diretório /var/www não existe'\r"
        expect "# "
        
        send "ls -la /var/www/nexoscrm/ 2>/dev/null || echo 'Diretório nexoscrm não existe'\r"
        expect "# "
        
        send "echo '4. Verificando configuração Nginx:'\r"
        expect "# "
        
        send "ls -la /etc/nginx/sites-enabled/ 2>/dev/null || echo 'Sites nginx não configurados'\r"
        expect "# "
        
        send "echo '5. Verificando PostgreSQL:'\r"
        expect "# "
        
        send "sudo -u postgres psql -l 2>/dev/null || echo 'PostgreSQL não acessível'\r"
        expect "# "
        
        send "echo '6. Verificando portas:'\r"
        expect "# "
        
        send "netstat -tlnp | grep ':80\\|:3001\\|:5432' || echo 'Portas não estão sendo usadas'\r"
        expect "# "
        
        send "exit\r"
    }
}

expect eof
EOF

chmod +x check_server.exp

if command -v expect &> /dev/null; then
    ./check_server.exp $SERVER_IP $SERVER_USER $SERVER_PASS
else
    echo "❌ expect não instalado. Instalando..."
    if command -v brew &> /dev/null; then
        brew install expect
        ./check_server.exp $SERVER_IP $SERVER_USER $SERVER_PASS
    else
        echo "Instale expect manualmente: brew install expect"
    fi
fi

rm -f check_server.exp

echo ""
echo "🔧 Baseado no resultado acima, vamos corrigir os problemas..."