# 🚀 Deploy do Checkout na Vercel

## ✅ Commit Realizado

Commit: `0b5da9d`
Mensagem: "feat: Implementar checkout com Mercado Pago"

## 📋 Variáveis de Ambiente Necessárias

Antes de fazer o deploy, configure estas variáveis no painel da Vercel:

### 1. Acessar Painel da Vercel
https://vercel.com/chorst09s-projects/crmautomatizadob2g

### 2. Ir em Settings > Environment Variables

### 3. Adicionar as seguintes variáveis:

**Mercado Pago**:
```
MERCADO_PAGO_PUBLIC_KEY=TEST-ea423066-0567-48a7-800c-f1a39833ce5e
MERCADO_PAGO_ACCESS_TOKEN=TEST-295373260675697-121217-6e2dd435f6708fc53d0de81b5627652a-606002420
MERCADO_PAGO_WEBHOOK_TOKEN=webhook_secure_token_2026_mp_crm_b2g_production
```

**URLs** (ajustar para produção):
```
FRONTEND_URL=https://crmautomatizadob2g.vercel.app
API_URL=https://crmautomatizadob2g.vercel.app/api
```

**Importante**: Marcar todas como disponíveis para:
- ✅ Production
- ✅ Preview
- ✅ Development

## 🔄 Fazer Deploy

### Opção 1: Deploy Automático
O push para o GitHub já deve ter disparado o deploy automático na Vercel.

Acompanhe em: https://vercel.com/chorst09s-projects/crmautomatizadob2g

### Opção 2: Deploy Manual via CLI
```bash
vercel --prod
```

## ⚠️ IMPORTANTE: Configurar Banco de Dados

O banco de dados na Vercel precisa ter a tabela `PendingSubscription`.

### Executar Migração no Banco de Produção

1. **Conectar ao banco da Vercel** (via Vercel Postgres Dashboard)

2. **Executar a migração**:
```sql
-- CreateTable
CREATE TABLE "PendingSubscription" (
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
CREATE INDEX "PendingSubscription_status_idx" ON "PendingSubscription"("status");

-- CreateIndex
CREATE INDEX "PendingSubscription_responsibleEmail_idx" ON "PendingSubscription"("responsibleEmail");
```

### Ou via Prisma (se tiver acesso ao DATABASE_URL de produção):
```bash
# Temporariamente, adicionar DATABASE_URL de produção no .env
# Depois executar:
cd apps/api
npx prisma migrate deploy
```

## 🧪 Testar Após Deploy

### 1. Verificar se o site está no ar
```bash
curl https://crmautomatizadob2g.vercel.app
```

### 2. Testar endpoint de checkout
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

### 3. Testar no navegador
1. Acesse: https://crmautomatizadob2g.vercel.app
2. Clique em "Ver Planos"
3. Escolha um plano
4. Preencha os dados
5. Clique em "Pagar"
6. Deve redirecionar para o Mercado Pago

## 🔔 Configurar Webhook no Mercado Pago

Após o deploy, configure o webhook no painel do Mercado Pago:

1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Selecione sua aplicação
3. Vá em "Webhooks"
4. Adicione a URL: `https://crmautomatizadob2g.vercel.app/api/checkout/webhook`
5. Selecione os eventos:
   - ✅ Pagamentos
   - ✅ Assinaturas
6. Salve

## 📊 Monitoramento

### Logs da Vercel
```bash
vercel logs --follow
```

### Ou no painel:
https://vercel.com/chorst09s-projects/crmautomatizadob2g/logs

## ✅ Checklist de Deploy

- [x] Commit realizado
- [x] Push para GitHub
- [ ] Variáveis de ambiente configuradas na Vercel
- [ ] Deploy executado
- [ ] Migração do banco executada
- [ ] Teste do endpoint funcionando
- [ ] Teste no navegador funcionando
- [ ] Webhook configurado no Mercado Pago
- [ ] Teste de pagamento completo

---

**Data**: 06/04/2026 - 21:05
**Status**: ⏳ Aguardando configuração de variáveis na Vercel
**Próximo**: Configurar variáveis e executar migração do banco
