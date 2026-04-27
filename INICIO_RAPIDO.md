# ⚡ Início Rápido - NexosCRM

Guia rápido para colocar o NexosCRM funcionando em minutos!

## 🎯 Opção 1: Deploy Direto (Mais Rápido)

### 1. Criar Conta no Supabase (2 minutos)

1. Acesse [supabase.com](https://supabase.com)
2. Clique em "Start your project"
3. Crie um novo projeto:
   - Nome: `nexoscrm`
   - Senha: Crie uma senha forte
   - Região: `South America (São Paulo)`
4. Aguarde 2 minutos até o projeto ser criado

### 2. Copiar Connection Strings (1 minuto)

1. No Supabase, vá em **Settings** → **Database**
2. Role até **Connection string**
3. Copie:
   - **Connection pooling** (para DATABASE_URL)
   - **Direct connection** (para DIRECT_URL)
4. Substitua `[YOUR-PASSWORD]` pela senha que você criou

### 3. Deploy no Netlify (3 minutos)

1. Acesse [app.netlify.com](https://app.netlify.com)
2. Clique em "Add new site" → "Import an existing project"
3. Conecte seu repositório Git
4. Configure:
   - **Base directory**: `apps/web`
   - **Build command**: `npm run build`
   - **Publish directory**: `apps/web/dist`
5. Adicione as variáveis de ambiente:
   ```
   DATABASE_URL=sua-connection-string-aqui
   DIRECT_URL=sua-direct-connection-aqui
   JWT_SECRET=gere-um-hash-aleatorio-aqui
   AUTH_MASTER_KEY=codigo-recuperacao-123
   MASTER_EMAILS=seu-email@exemplo.com
   NODE_ENV=production
   ```
6. Clique em "Deploy site"

### 4. Pronto! 🎉

Seu NexosCRM está no ar em: `https://seu-site.netlify.app`

---

## 💻 Opção 2: Desenvolvimento Local

### Pré-requisitos

- Node.js 18+
- Conta no Supabase (gratuita)

### Setup Automático (5 minutos)

```bash
# 1. Clonar repositório
git clone https://github.com/seu-usuario/nexoscrm.git
cd nexoscrm

# 2. Rodar script de setup
./setup.sh
```

O script vai:
- ✅ Instalar todas as dependências
- ✅ Criar arquivo .env
- ✅ Gerar Prisma Client
- ✅ Rodar migrations (opcional)

### Setup Manual (10 minutos)

```bash
# 1. Clonar repositório
git clone https://github.com/seu-usuario/nexoscrm.git
cd nexoscrm

# 2. Instalar dependências
npm install
cd apps/web && npm install && cd ../..
cd netlify/functions && npm install && cd ../..

# 3. Configurar .env
cp .env.example .env
# Edite o .env com suas credenciais

# 4. Gerar Prisma Client
cd netlify/functions
npx prisma generate

# 5. Rodar migrations
npx prisma migrate deploy
cd ../..

# 6. Iniciar desenvolvimento
npm run dev
```

### Acessar a Aplicação

- **Frontend**: http://localhost:5173
- **API**: http://localhost:8888/.netlify/functions
- **Health Check**: http://localhost:8888/.netlify/functions/health

---

## 🔐 Criar Primeiro Usuário

### Via API

```bash
curl -X POST http://localhost:8888/.netlify/functions/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin",
    "email": "admin@exemplo.com",
    "password": "senha123",
    "confirmPassword": "senha123",
    "role": "ADMIN",
    "inviteCode": "codigo-recuperacao-123"
  }'
```

### Via Interface

1. Acesse http://localhost:5173
2. Clique em "Criar conta"
3. Preencha os dados
4. Para criar como ADMIN, use o código de convite do `.env`

---

## 🧪 Testar a Instalação

### 1. Health Check

```bash
curl http://localhost:8888/.netlify/functions/health
```

Deve retornar:
```json
{
  "status": "ok",
  "service": "nexoscrm-api",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. Login

```bash
curl -X POST http://localhost:8888/.netlify/functions/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@exemplo.com",
    "password": "senha123"
  }'
```

Deve retornar um token JWT.

### 3. Acessar Frontend

Abra http://localhost:5173 no navegador e faça login!

---

## 📝 Comandos Úteis

```bash
# Desenvolvimento
npm run dev              # Frontend + API
npm run dev:web          # Apenas frontend
npm run dev:api          # Apenas API

# Prisma
npm run prisma:studio    # Abrir Prisma Studio
npm run prisma:migrate   # Rodar migrations
npm run prisma:generate  # Gerar Prisma Client

# Build
npm run build            # Build do frontend

# Deploy
netlify deploy --prod    # Deploy para produção
```

---

## 🐛 Problemas Comuns

### "Cannot find module '@prisma/client'"

```bash
cd netlify/functions
npm install
npx prisma generate
```

### "Database connection failed"

Verifique se:
1. As variáveis `DATABASE_URL` e `DIRECT_URL` estão corretas
2. A senha do banco está correta
3. O projeto do Supabase está ativo

### "Port 8888 already in use"

```bash
# Matar processo na porta 8888
lsof -ti:8888 | xargs kill -9

# Ou usar outra porta
netlify dev --port 8889
```

### "Prisma schema not found"

```bash
# Copiar schema para o lugar correto
cp apps/api/prisma/schema.prisma netlify/functions/prisma/
```

---

## 🎓 Próximos Passos

1. ✅ **Explorar a Interface**
   - Dashboard
   - Criar clientes
   - Criar oportunidades
   - Gerar propostas

2. 📚 **Ler a Documentação**
   - [README.md](./README.md) - Visão geral
   - [DEPLOY_NETLIFY_SUPABASE.md](./DEPLOY_NETLIFY_SUPABASE.md) - Deploy completo
   - [MIGRACAO_APIS.md](./MIGRACAO_APIS.md) - Migração de APIs

3. 🔧 **Personalizar**
   - Configurar logo da empresa
   - Ajustar cores do tema
   - Configurar integrações

4. 🚀 **Deploy em Produção**
   - Seguir guia de deploy
   - Configurar domínio customizado
   - Configurar backups

---

## 🆘 Precisa de Ajuda?

- 📖 [Documentação Completa](./README.md)
- 🐛 [Reportar Bug](https://github.com/seu-usuario/nexoscrm/issues)
- 💬 [Discord](#)
- 📧 suporte@nexoscrm.com

---

## ⏱️ Tempo Estimado

- **Deploy Direto**: ~6 minutos
- **Setup Automático**: ~5 minutos
- **Setup Manual**: ~10 minutos

---

🎉 **Parabéns!** Você está pronto para usar o NexosCRM!
