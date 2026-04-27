# 🚀 Guia Completo de Migração para Novo Servidor KVM

## 📋 Visão Geral

Este guia fornece instruções passo a passo para migrar o CRM Comercial do servidor provisório (Hostinger) para um novo servidor KVM. Toda a preparação está no GitHub para acesso remoto.

## 🎯 Objetivo

Migrar com sucesso:
- ✅ Banco de dados PostgreSQL (com todos os dados)
- ✅ Aplicação Node.js (API + Frontend)
- ✅ Arquivos de upload
- ✅ Configurações e variáveis de ambiente
- ✅ Processos PM2

## 📦 Arquivos Disponíveis no GitHub

```
scripts/
├── preparar-servidor-definitivo.sh    # Prepara o novo servidor
├── backup-completo.sh                 # Faz backup do servidor atual
├── restaurar-backup.sh                # Restaura backup no novo servidor
├── verificar-migracao.sh              # Verifica se tudo funcionou
└── README_SCRIPTS_MIGRACAO.md         # Documentação dos scripts

GUIA_MIGRACAO_GITHUB.md                # Este arquivo
CHECKLIST_MIGRACAO_RAPIDO.md           # Checklist rápido
```

## 🔧 Pré-requisitos

### No seu computador (Mac)
- ✅ Acesso SSH ao servidor provisório (Hostinger)
- ✅ Acesso SSH ao novo servidor KVM
- ✅ Git instalado
- ✅ Terminal/iTerm2

### No servidor provisório (Hostinger)
- ✅ PostgreSQL rodando
- ✅ Aplicação em `/var/www/crm-comercial`
- ✅ PM2 gerenciando os processos

### No novo servidor KVM
- ✅ Ubuntu 20.04 LTS ou similar
- ✅ Acesso root ou sudo
- ✅ Conexão de internet estável
- ✅ Mínimo 50GB de espaço em disco

## 📝 Passo a Passo Completo

### FASE 1: Preparação (30 minutos)

#### 1.1 Clonar repositório no novo servidor

```bash
# SSH no novo servidor
ssh root@SEU_IP_NOVO_SERVIDOR

# Clonar repositório
git clone https://github.com/seu-usuario/crm-comercial.git
cd crm-comercial

# Dar permissão de execução aos scripts
chmod +x scripts/*.sh
```

#### 1.2 Preparar o novo servidor

```bash
# Executar script de preparação
./scripts/preparar-servidor-definitivo.sh

# O script irá:
# - Atualizar sistema
# - Instalar Node.js 18
# - Instalar PM2
# - Instalar PostgreSQL
# - Configurar firewall
# - Criar estrutura de diretórios
```

**Tempo estimado**: 5-10 minutos

**Saída esperada**:
```
✓ Node.js instalado: v18.x.x
✓ PM2 instalado: 5.x.x
✓ PostgreSQL instalado: 14.x
✓ Firewall configurado
✓ Diretório /var/www/crm-comercial criado
```

---

### FASE 2: Backup (15 minutos)

#### 2.1 Fazer backup no servidor provisório

```bash
# SSH no servidor provisório
ssh root@72.60.195.200

# Clonar repositório (se não tiver)
git clone https://github.com/seu-usuario/crm-comercial.git
cd crm-comercial

# Dar permissão de execução
chmod +x scripts/*.sh

# Executar backup
./scripts/backup-completo.sh

# Anotar o diretório criado
# Exemplo: ~/crm-backup-20240218-143022
```

**Tempo estimado**: 5-15 minutos (depende do tamanho do banco)

**Saída esperada**:
```
✓ Banco de dados: 250MB
✓ Aplicação: 150MB
✓ Uploads: 500MB
✓ Checksums gerados
Diretório: ~/crm-backup-20240218-143022
```

---

### FASE 3: Transferência (5-30 minutos)

#### 3.1 Transferir backup para o novo servidor

```bash
# No seu Mac (novo terminal)

# Baixar backup do servidor provisório
scp -r root@72.60.195.200:~/crm-backup-20240218-143022 ~/Downloads/

# Enviar para novo servidor
scp -r ~/Downloads/crm-backup-20240218-143022 root@SEU_IP_NOVO_SERVIDOR:~/

# Verificar se chegou
ssh root@SEU_IP_NOVO_SERVIDOR "ls -lh ~/crm-backup-20240218-143022"
```

**Tempo estimado**: 5-30 minutos (depende da internet)

---

### FASE 4: Restauração (15 minutos)

#### 4.1 Restaurar backup no novo servidor

```bash
# SSH no novo servidor
ssh root@SEU_IP_NOVO_SERVIDOR

# Ir para diretório de scripts
cd ~/crm-comercial/scripts

# Restaurar backup
./restaurar-backup.sh ~/crm-backup-20240218-143022

# O script irá:
# - Verificar integridade (MD5)
# - Restaurar banco de dados
# - Restaurar aplicação
# - Restaurar uploads
# - Restaurar configurações
```

**Tempo estimado**: 5-10 minutos

**Saída esperada**:
```
✓ Banco de dados restaurado
  - Usuários: 5
  - Empresas: 10
  - Oportunidades: 25
✓ Aplicação restaurada
✓ Uploads restaurados (1250 arquivos)
✓ Configurações restauradas
```

---

### FASE 5: Configuração (15 minutos)

#### 5.1 Atualizar variáveis de ambiente

```bash
# SSH no novo servidor
ssh root@SEU_IP_NOVO_SERVIDOR

# Editar .env da API
nano /var/www/crm-comercial/apps/api/.env

# Atualizar as seguintes variáveis:
# NODE_ENV=production
# PORT=8081
# DATABASE_URL=postgresql://crm_user:SENHA@localhost:5432/crm_comercial
# JWT_SECRET=seu-secret-seguro
# CORS_ORIGIN=http://SEU_IP_OU_DOMINIO:8081,http://SEU_IP_OU_DOMINIO
```

#### 5.2 Atualizar .env do frontend

```bash
# Editar .env do Frontend
nano /var/www/crm-comercial/apps/web/.env

# Atualizar:
# VITE_API_URL=http://SEU_IP_OU_DOMINIO:8081/api
```

#### 5.3 Build do frontend

```bash
# Build do frontend
cd /var/www/crm-comercial/apps/web
npm run build

# Verificar se o build foi criado
ls -la dist/
```

#### 5.4 Iniciar aplicação

```bash
# Ir para diretório da aplicação
cd /var/www/crm-comercial

# Iniciar com PM2
pm2 start ecosystem.config.js

# Salvar configuração do PM2
pm2 save

# Configurar para iniciar no boot
pm2 startup
# Executar o comando que aparecer na tela
```

---

### FASE 6: Verificação (5 minutos)

#### 6.1 Verificar migração

```bash
# SSH no novo servidor
ssh root@SEU_IP_NOVO_SERVIDOR

# Executar verificação
cd ~/crm-comercial/scripts
./verificar-migracao.sh

# Deve retornar:
# ✓ Migração bem-sucedida!
# Todos os testes passaram.
```

#### 6.2 Testar aplicação

```bash
# Acessar no navegador
http://SEU_IP_OU_DOMINIO:8081

# Fazer login
Email: admin@crm.com
Senha: admin123

# Verificar:
✓ Dashboard carrega
✓ Empresas aparecem
✓ Oportunidades aparecem
✓ Upload de arquivo funciona
```

---

## 🔍 Troubleshooting

### Erro: "PostgreSQL não está rodando"

```bash
# Verificar status
systemctl status postgresql

# Iniciar
systemctl start postgresql

# Ativar no boot
systemctl enable postgresql
```

### Erro: "Não consegue conectar ao banco"

```bash
# Verificar credenciais
cat /var/www/crm-comercial/apps/api/.env | grep DATABASE_URL

# Testar conexão
psql -U crm_user -h localhost -d crm_comercial -c "SELECT 1"

# Se falhar, resetar senha
sudo -u postgres psql -c "ALTER USER crm_user WITH PASSWORD 'nova_senha';"
```

### Erro: "PM2 não encontra o processo"

```bash
# Ver logs
pm2 logs crm-api --lines 100

# Reiniciar
pm2 restart crm-api

# Se não existir, iniciar
cd /var/www/crm-comercial
pm2 start ecosystem.config.js
```

### Erro: "API não responde"

```bash
# Verificar se a porta está em uso
netstat -tulpn | grep 8081

# Ver logs
pm2 logs crm-api

# Verificar firewall
ufw status
ufw allow 8081/tcp
```

### Erro: "Frontend não carrega"

```bash
# Verificar se o build existe
ls -la /var/www/crm-comercial/apps/web/dist/

# Rebuild
cd /var/www/crm-comercial/apps/web
npm run build

# Reiniciar PM2
pm2 restart crm-api
```

---

## 📊 Checklist de Migração

### Antes de Começar
- [ ] Acesso SSH ao servidor provisório
- [ ] Acesso SSH ao novo servidor
- [ ] Espaço suficiente (50GB+)
- [ ] Repositório clonado em ambos os servidores

### Preparação
- [ ] Script `preparar-servidor-definitivo.sh` executado
- [ ] Node.js 18 instalado
- [ ] PostgreSQL instalado
- [ ] PM2 instalado
- [ ] Firewall configurado

### Backup
- [ ] Script `backup-completo.sh` executado
- [ ] Backup criado com sucesso
- [ ] Checksums verificados
- [ ] Tamanho do backup anotado

### Transferência
- [ ] Backup baixado para Mac
- [ ] Backup enviado para novo servidor
- [ ] Integridade verificada

### Restauração
- [ ] Script `restaurar-backup.sh` executado
- [ ] Banco de dados restaurado
- [ ] Aplicação restaurada
- [ ] Uploads restaurados

### Configuração
- [ ] .env da API atualizado
- [ ] .env do Frontend atualizado
- [ ] Frontend buildado
- [ ] PM2 iniciado

### Verificação
- [ ] Script `verificar-migracao.sh` passou
- [ ] Login funciona
- [ ] Dashboard carrega
- [ ] Dados aparecem
- [ ] Upload funciona

### Finalização
- [ ] Manter servidor provisório ativo por 7-14 dias
- [ ] Atualizar DNS (se aplicável)
- [ ] Configurar SSL/HTTPS
- [ ] Configurar backups automáticos
- [ ] Documentar credenciais

---

## ⏱️ Tempo Total Estimado

| Fase | Tempo |
|------|-------|
| 1. Preparação | 5-10 min |
| 2. Backup | 5-15 min |
| 3. Transferência | 5-30 min |
| 4. Restauração | 5-10 min |
| 5. Configuração | 10-15 min |
| 6. Verificação | 5-10 min |
| **TOTAL** | **35-90 min** |

---

## 🔐 Segurança

### Recomendações

1. **Alterar senhas padrão**
   ```bash
   # Alterar senha do PostgreSQL
   sudo -u postgres psql -c "ALTER USER crm_user WITH PASSWORD 'senha_forte';"
   ```

2. **Configurar SSL/HTTPS**
   ```bash
   # Usar Let's Encrypt com Certbot
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot certonly --standalone -d seu-dominio.com
   ```

3. **Configurar backups automáticos**
   ```bash
   # Adicionar cron job
   crontab -e
   
   # Adicionar linha:
   0 2 * * * /var/www/crm-comercial/scripts/backup-completo.sh
   ```

4. **Monitorar logs**
   ```bash
   # Ver logs em tempo real
   pm2 logs crm-api
   
   # Ver logs do PostgreSQL
   tail -f /var/log/postgresql/postgresql.log
   ```

---

## 📞 Suporte

Se encontrar problemas:

1. Execute `./scripts/verificar-migracao.sh` para diagnóstico
2. Verifique os logs: `pm2 logs crm-api`
3. Consulte o README dos scripts: `scripts/README_SCRIPTS_MIGRACAO.md`
4. Verifique o arquivo de checklist: `CHECKLIST_MIGRACAO_RAPIDO.md`

---

## 📚 Documentação Adicional

- `scripts/README_SCRIPTS_MIGRACAO.md` - Documentação detalhada dos scripts
- `CHECKLIST_MIGRACAO_RAPIDO.md` - Checklist rápido para referência
- `DEPLOY_COMPLETO.md` - Instruções de deploy manual
- `DEPLOY_VERCEL.md` - Deploy no Vercel (alternativa)

---

**Desenvolvido com ❤️ para facilitar sua migração**

Última atualização: 27 de Fevereiro de 2026
