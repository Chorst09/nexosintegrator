# 🗄️ Configurar Banco de Dados na Vercel - CRM NEXOS

## 🎯 Objetivo

Configurar o banco de dados PostgreSQL para o CRM NEXOS em produção na Vercel.

---

## 📋 Opções de Banco de Dados

### Opção 1: Vercel Postgres (Recomendado) ⭐

**Vantagens:**
- ✅ Integração nativa com Vercel
- ✅ Configuração automática de variáveis
- ✅ Baixa latência
- ✅ Fácil de configurar

**Passos:**
1. Acesse: https://vercel.com/chorstconsult-6872s-projects/crmautomatizadob2g
2. Clique em "Storage" no menu lateral
3. Clique em "Create Database"
4. Escolha "Postgres"
5. Dê um nome: `crm-nexos-db`
6. Escolha a região (preferencialmente próxima aos usuários)
7. Clique em "Create"
8. A `DATABASE_URL` será configurada automaticamente

### Opção 2: Neon (Serverless Postgres) 🚀

**Vantagens:**
- ✅ Gratuito até 0.5 GB
- ✅ Serverless (escala automaticamente)
- ✅ Branching de banco de dados
- ✅ Ótima performance

**Passos:**
1. Acesse: https://neon.tech
2. Crie uma conta (pode usar GitHub)
3. Crie um novo projeto: "CRM NEXOS"
4. Escolha a região
5. Copie a connection string
6. Configure na Vercel (veja seção abaixo)

### Opção 3: Supabase 🔥

**Vantagens:**
- ✅ Gratuito até 500 MB
- ✅ Interface visual para gerenciar dados
- ✅ Backups automáticos
- ✅ Auth integrado (opcional)

**Passos:**
1. Acesse: https://supabase.com
2. Crie uma conta
3. Crie um novo projeto: "CRM NEXOS"
4. Escolha senha forte
5. Escolha a região
6. Vá em "Settings" → "Database"
7. Copie a "Connection string" (modo "Transaction")
8. Configure na Vercel (veja seção abaixo)

---

## ⚙️ Configurar Variáveis de Ambiente na Vercel

### 1. Acesse as Configurações
```
https://vercel.com/chorstconsult-6872s-projects/crmautomatizadob2g/settings/environment-variables
```

### 2. Adicione as Variáveis

#### DATABASE_URL (Obrigatório)
```
Nome: DATABASE_URL
Valor: postgresql://usuario:senha@host:porta/database?schema=public
Ambiente: Production, Preview, Development
```

**Exemplos:**
```bash
# Neon
postgresql://usuario:senha@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# Supabase
postgresql://postgres:senha@db.xxx.supabase.co:5432/postgres?schema=public

# Vercel Postgres (configurado automaticamente)
postgres://default:xxx@xxx.postgres.vercel-storage.com:5432/verceldb
```

#### JWT_SECRET (Obrigatório)
```
Nome: JWT_SECRET
Valor: [gere um valor aleatório seguro]
Ambiente: Production, Preview, Development
```

**Gerar JWT_SECRET:**
```bash
# No terminal
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### CORS_ORIGIN (Obrigatório)
```
Nome: CORS_ORIGIN
Valor: https://crmautomatizadob2g.vercel.app
Ambiente: Production
```

#### NODE_ENV (Obrigatório)
```
Nome: NODE_ENV
Valor: production
Ambiente: Production
```

### 3. Salvar e Redeploy
Após adicionar as variáveis, clique em "Save" e faça um novo deploy:
```bash
vercel --prod
```

---

## 🔄 Executar Migrações do Banco

### Opção 1: Via Terminal Local

```bash
# 1. Instalar dependências (se necessário)
cd apps/api
npm install

# 2. Configurar DATABASE_URL temporariamente
export DATABASE_URL="sua-connection-string-de-producao"

# 3. Executar migrações
npx prisma migrate deploy

# 4. Executar seed (criar usuário MASTER e dados iniciais)
npm run seed
```

### Opção 2: Via Vercel CLI

```bash
# 1. Conectar ao projeto
vercel link

# 2. Executar comando remoto
vercel env pull .env.production
cd apps/api
npx prisma migrate deploy
npm run seed
```

---

## 🧪 Testar Conexão com o Banco

### Script de Teste

Crie um arquivo `test-db-connection.js`:

```javascript
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function testConnection() {
  try {
    console.log('🔍 Testando conexão com o banco...');
    
    // Testar conexão
    await prisma.$connect();
    console.log('✅ Conexão estabelecida!');
    
    // Contar usuários
    const userCount = await prisma.user.count();
    console.log(`👥 Usuários no banco: ${userCount}`);
    
    // Verificar usuário MASTER
    const master = await prisma.user.findUnique({
      where: { email: 'chorstconsult@gmail.com' }
    });
    
    if (master) {
      console.log('✅ Usuário MASTER encontrado!');
      console.log(`   Nome: ${master.name}`);
      console.log(`   Role: ${master.role}`);
    } else {
      console.log('⚠️  Usuário MASTER não encontrado. Execute o seed!');
    }
    
  } catch (error) {
    console.error('❌ Erro ao conectar:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
```

Execute:
```bash
DATABASE_URL="sua-url" node test-db-connection.js
```

---

## 📊 Verificar Status do Banco

### Via Prisma Studio

```bash
# Abrir interface visual do banco
DATABASE_URL="sua-url" npx prisma studio
```

Acesse: http://localhost:5555

### Via SQL Direto

```bash
# Conectar via psql (se disponível)
psql "sua-connection-string"

# Verificar tabelas
\dt

# Verificar usuários
SELECT email, role, name FROM "User";

# Verificar se MASTER existe
SELECT * FROM "User" WHERE email = 'chorstconsult@gmail.com';
```

---

## 🔐 Criar Usuário MASTER Manualmente (Se Necessário)

Se o seed não funcionar, crie o usuário MASTER via SQL:

```sql
-- 1. Gerar hash da senha (use bcrypt online ou node)
-- Senha: Double@@2026
-- Hash: $2a$10$... (use: https://bcrypt-generator.com/)

-- 2. Inserir usuário
INSERT INTO "User" (
  id,
  name,
  email,
  password,
  role,
  quota,
  "accessB2B",
  "accessB2G",
  "accessPreSales",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'Master Admin',
  'chorstconsult@gmail.com',
  '$2a$10$SEU_HASH_AQUI',
  'MASTER',
  999999,
  true,
  true,
  true,
  NOW(),
  NOW()
);
```

---

## ⚠️ Problemas Comuns

### Erro: "SSL connection required"
**Solução:** Adicione `?sslmode=require` na connection string
```
postgresql://user:pass@host:5432/db?sslmode=require
```

### Erro: "Connection timeout"
**Solução:** Verifique se o IP da Vercel está na whitelist do banco

### Erro: "Database does not exist"
**Solução:** Crie o banco de dados primeiro
```sql
CREATE DATABASE crm;
```

### Erro: "Migrations not applied"
**Solução:** Execute as migrações
```bash
npx prisma migrate deploy
```

---

## 📋 Checklist de Configuração

- [ ] Banco de dados criado (Vercel/Neon/Supabase)
- [ ] Connection string copiada
- [ ] `DATABASE_URL` configurada na Vercel
- [ ] `JWT_SECRET` configurado na Vercel
- [ ] `CORS_ORIGIN` configurado na Vercel
- [ ] `NODE_ENV=production` configurado
- [ ] Migrações executadas (`prisma migrate deploy`)
- [ ] Seed executado (`npm run seed`)
- [ ] Usuário MASTER criado
- [ ] Conexão testada
- [ ] Login testado em produção

---

## 🚀 Após Configurar

1. **Acesse a aplicação:**
   ```
   https://crmautomatizadob2g.vercel.app
   ```

2. **Faça login com o MASTER:**
   ```
   Email: chorstconsult@gmail.com
   Senha: Double@@2026
   ```

3. **Altere a senha do MASTER:**
   - Vá em "Administração" → "Usuários"
   - Edite o usuário MASTER
   - Defina uma senha forte e segura

4. **Crie outros usuários:**
   - Administradores
   - Vendedores
   - Usuários comuns

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs da Vercel: `vercel logs`
2. Teste a conexão com o banco localmente
3. Verifique se todas as variáveis estão configuradas
4. Consulte a documentação do Prisma: https://www.prisma.io/docs

---

**Próximo Passo:** Após configurar o banco, acesse `DEPLOY_SUCESSO.md` para ver o status completo do deploy.
