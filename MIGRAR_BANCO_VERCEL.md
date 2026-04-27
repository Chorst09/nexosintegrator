# 🗄️ Migrar Banco de Dados na Vercel

## ❌ Problema Atual

O endpoint `/api/checkout/create-preference` está retornando erro "Não autorizado" porque a tabela `PendingSubscription` não existe no banco de dados de produção.

## ✅ Solução: Executar Migração

### Opção 1: Via Vercel Postgres Dashboard (RECOMENDADO)

1. **Acessar o Dashboard do Postgres**
   - Vá para: https://vercel.com/chorstconsult-6872s-projects/crmautomatizadob2g
   - Clique em "Storage"
   - Selecione seu banco de dados Postgres

2. **Abrir o Query Editor**
   - Clique em "Query"
   - Cole o SQL abaixo

3. **Executar a Migração**

```sql
-- CreateTable
CREATE TABLE IF NOT EXISTS "PendingSubscription" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "companyName" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "responsibleName" TEXT NOT NULL,
    "responsibleEmail" TEXT NOT NULL,
    "responsiblePhone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentData" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PendingSubscription_status_idx" ON "PendingSubscription"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PendingSubscription_responsibleEmail_idx" ON "PendingSubscription"("responsibleEmail");
```

4. **Verificar se a tabela foi criada**

```sql
SELECT * FROM "PendingSubscription" LIMIT 1;
```

### Opção 2: Via Prisma CLI (se tiver acesso ao DATABASE_URL)

1. **Obter o DATABASE_URL de produção**
   - Vá para: https://vercel.com/chorstconsult-6872s-projects/crmautomatizadob2g
   - Settings > Environment Variables
   - Copie o valor de `DATABASE_URL` (ou `POSTGRES_URL`)

2. **Adicionar temporariamente no .env local**

```bash
# apps/api/.env
DATABASE_URL="postgresql://..."
```

3. **Executar a migração**

```bash
cd apps/api
npx prisma migrate deploy
```

4. **Remover o DATABASE_URL do .env local** (segurança)

### Opção 3: Via psql (linha de comando)

Se você tiver o `psql` instalado:

```bash
# Conectar ao banco
psql "postgresql://..."

# Executar o SQL da Opção 1
\i apps/api/prisma/migrations/20260406200900_add_pending_subscription/migration.sql

# Verificar
\dt PendingSubscription
\q
```

## 🧪 Testar Após Migração

```bash
curl -X POST https://crmautomatizadob2g.vercel.app/api/checkout/create-preference \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "starter",
    "companyData": {
      "companyName": "Teste Ltda",
      "document": "12.345.678/0001-90",
      "email": "teste@empresa.com",
      "phone": "(11) 99999-9999",
      "responsibleName": "João Silva",
      "responsibleEmail": "joao@teste.com",
      "responsiblePhone": "(11) 98888-8888"
    }
  }'
```

**Resposta esperada**:
```json
{
  "success": true,
  "subscriptionId": "uuid-aqui",
  "paymentUrl": "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=...",
  "preferenceId": "..."
}
```

## 📋 Checklist

- [ ] Acessar Vercel Postgres Dashboard
- [ ] Executar SQL de criação da tabela
- [ ] Verificar que a tabela foi criada
- [ ] Testar endpoint de checkout
- [ ] Testar fluxo completo no navegador

---

**Próximo**: Após a migração, o checkout estará funcionando em produção!
