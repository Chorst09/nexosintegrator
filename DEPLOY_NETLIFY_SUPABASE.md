# 🚀 Guia de Deploy - Netlify + Supabase

Este guia explica como fazer o deploy do NexosCRM no Netlify com banco de dados Supabase.

## 📋 Pré-requisitos

- Conta no [Netlify](https://netlify.com)
- Conta no [Supabase](https://supabase.com)
- Node.js 18+ instalado localmente
- Git instalado

## 🗄️ Passo 1: Configurar Supabase

### 1.1 Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e faça login
2. Clique em "New Project"
3. Preencha:
   - **Name**: nexoscrm (ou nome de sua preferência)
   - **Database Password**: Crie uma senha forte e **GUARDE-A**
   - **Region**: Escolha a região mais próxima (ex: South America - São Paulo)
4. Clique em "Create new project"
5. Aguarde alguns minutos até o projeto ser criado

### 1.2 Obter Connection Strings

1. No painel do Supabase, vá em **Settings** → **Database**
2. Role até **Connection string** e copie:
   - **Connection pooling (Transaction mode / porta 6543)** (para DATABASE_URL)
   - **Direct connection** (para DIRECT_URL)
3. Substitua `[YOUR-PASSWORD]` pela senha que você criou

Exemplo:
```
DATABASE_URL=postgresql://postgres.xxxx:SuaSenha@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require

DIRECT_URL=postgresql://postgres.xxxx:SuaSenha@db.xxxx.supabase.co:5432/postgres?sslmode=require
```

## 📦 Passo 2: Preparar o Projeto

### 2.1 Instalar Dependências

```bash
# Instalar dependências raiz
npm install

# Instalar dependências do frontend
cd apps/web && npm install && cd ../..

# Instalar dependências das functions
cd netlify/functions && npm install && cd ../..
```

### 2.2 Configurar Variáveis de Ambiente Localmente

Crie um arquivo `.env` na raiz do projeto:

```bash
cp .env.example .env
```

Edite o `.env` e preencha com suas credenciais do Supabase:

```env
DATABASE_URL=postgresql://postgres.xxxx:SuaSenha@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require
DIRECT_URL=postgresql://postgres.xxxx:SuaSenha@db.xxxx.supabase.co:5432/postgres?sslmode=require
JWT_SECRET=seu-segredo-jwt-super-secreto-mude-isso
AUTH_MASTER_KEY=codigo-recuperacao-senha-123
MASTER_EMAILS=seu-email@exemplo.com
NODE_ENV=development
```

### 2.3 Rodar Migrations do Prisma

```bash
cd netlify/functions
npx prisma migrate deploy
npx prisma generate
cd ../..
```

## 🌐 Passo 3: Deploy no Netlify

### 3.1 Conectar Repositório ao Netlify

#### Opção A: Via Interface Web

1. Acesse [app.netlify.com](https://app.netlify.com)
2. Clique em "Add new site" → "Import an existing project"
3. Conecte seu repositório Git (GitHub, GitLab, ou Bitbucket)
4. Selecione o repositório do projeto

#### Opção B: Via Netlify CLI

```bash
# Instalar Netlify CLI globalmente
npm install -g netlify-cli

# Login no Netlify
netlify login

# Inicializar o site
netlify init
```

### 3.2 Configurar Build Settings

No Netlify, configure:

- **Base directory**: `apps/web`
- **Build command**: `npm run build`
- **Publish directory**: `apps/web/dist`
- **Functions directory**: `netlify/functions`

### 3.3 Configurar Variáveis de Ambiente no Netlify

1. No painel do Netlify, vá em **Site settings** → **Environment variables**
2. Adicione as seguintes variáveis:

```
DATABASE_URL = postgresql://postgres.xxxx:SuaSenha@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require

DIRECT_URL = postgresql://postgres.xxxx:SuaSenha@db.xxxx.supabase.co:5432/postgres?sslmode=require

JWT_SECRET = seu-segredo-jwt-super-secreto-mude-isso

AUTH_MASTER_KEY = codigo-recuperacao-senha-123

MASTER_EMAILS = seu-email@exemplo.com

NODE_ENV = production
```

⚠️ **IMPORTANTE**: Use valores diferentes e seguros em produção!

### 3.4 Deploy

```bash
# Via CLI
netlify deploy --prod

# Ou faça push para o repositório Git
git add .
git commit -m "Deploy to Netlify"
git push origin main
```

O Netlify vai automaticamente:
1. Instalar dependências
2. Rodar migrations do Prisma
3. Fazer build do frontend
4. Fazer deploy das functions

## 🧪 Passo 4: Testar o Deploy

### 4.1 Verificar Health Check

Acesse: `https://seu-site.netlify.app/api/health`

Deve retornar:
```json
{
  "status": "ok",
  "service": "nexoscrm-api",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production"
}
```

### 4.2 Criar Primeiro Usuário

Faça uma requisição POST para: `https://seu-site.netlify.app/api/auth/register`

```json
{
  "name": "Admin",
  "email": "admin@exemplo.com",
  "password": "senha123",
  "confirmPassword": "senha123",
  "role": "ADMIN",
  "inviteCode": "codigo-recuperacao-senha-123"
}
```

### 4.3 Fazer Login

POST para: `https://seu-site.netlify.app/api/auth/login`

```json
{
  "email": "admin@exemplo.com",
  "password": "senha123"
}
```

## 🔧 Desenvolvimento Local

### Rodar com Netlify Dev

```bash
# Inicia o ambiente de desenvolvimento local
npm run dev:api

# Em outro terminal, inicie o frontend
npm run dev:web
```

O Netlify Dev vai:
- Rodar o frontend em `http://localhost:5173`
- Rodar as functions em `http://localhost:8888/.netlify/functions`
- Simular o ambiente de produção localmente

## 📝 Comandos Úteis

```bash
# Gerar Prisma Client
npm run prisma:generate

# Rodar migrations
npm run prisma:migrate

# Abrir Prisma Studio
npm run prisma:studio

# Build do frontend
npm run build:web

# Deploy para produção
netlify deploy --prod

# Ver logs do Netlify
netlify logs
```

## 🔐 Segurança

### Variáveis Sensíveis

⚠️ **NUNCA** commite arquivos `.env` no Git!

Sempre use valores fortes e únicos para:
- `JWT_SECRET`: Use um hash aleatório de 64+ caracteres
- `AUTH_MASTER_KEY`: Código secreto para recuperação de senha
- `DATABASE_URL`: Credenciais do banco de dados

### Gerar Secrets Seguros

```bash
# Gerar JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Gerar AUTH_MASTER_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🐛 Troubleshooting

### Erro: "Cannot find module '@prisma/client'"

```bash
cd netlify/functions
npm install
npx prisma generate
```

### Erro: "Database connection failed"

1. Verifique se as variáveis `DATABASE_URL` e `DIRECT_URL` estão corretas
2. Confirme que a senha do banco está correta
3. Verifique se o IP do Netlify está permitido no Supabase (geralmente já está)

### Erro: "MaxClientsInSessionMode: max clients reached"

1. Garanta que `DATABASE_URL` usa o host `*.pooler.supabase.com` na **porta 6543**
2. Garanta os parâmetros `?pgbouncer=true&connection_limit=1&sslmode=require`
3. Use `DIRECT_URL` com `db.<project-ref>.supabase.co:5432` para migrações

### Erro: "Function timeout"

Aumente o timeout das functions no `netlify.toml`:

```toml
[functions]
  node_bundler = "esbuild"
  external_node_modules = ["@prisma/client", "prisma"]
  included_files = ["prisma/**"]
  timeout = 30
```

### Erro: "Prisma schema not found"

Certifique-se de que o arquivo `netlify/functions/prisma/schema.prisma` existe.

## 📚 Próximos Passos

1. **Configurar Domínio Customizado** no Netlify
2. **Configurar SSL** (automático no Netlify)
3. **Configurar Backups** no Supabase
4. **Monitoramento** com Netlify Analytics
5. **CI/CD** com GitHub Actions (opcional)

## 🆘 Suporte

- [Documentação Netlify](https://docs.netlify.com)
- [Documentação Supabase](https://supabase.com/docs)
- [Documentação Prisma](https://www.prisma.io/docs)

## ✅ Checklist de Deploy

- [ ] Projeto criado no Supabase
- [ ] Connection strings copiadas
- [ ] Variáveis de ambiente configuradas localmente
- [ ] Migrations rodadas com sucesso
- [ ] Repositório conectado ao Netlify
- [ ] Variáveis de ambiente configuradas no Netlify
- [ ] Build settings configurados
- [ ] Deploy realizado com sucesso
- [ ] Health check funcionando
- [ ] Primeiro usuário criado
- [ ] Login funcionando
- [ ] Frontend acessível

---

🎉 **Parabéns!** Seu NexosCRM está no ar!
