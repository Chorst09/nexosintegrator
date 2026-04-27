# 🚀 GUIA: Executar Migration B2B/B2G

## ⚠️ IMPORTANTE: Arquitetura Multi-Tenant

Este sistema usa **bancos de dados separados por empresa**. A migration precisa ser executada para cada banco de dados de tenant.

---

## 📋 PASSO A PASSO

### 1. Gerar a Migration do Prisma

```bash
cd apps/api
npx prisma migrate dev --name add_client_type
```

**O que isso faz:**
- Cria o enum `ClientType` (B2B, B2G, B2C)
- Adiciona campo `clientType` na tabela `Company`
- Cria índice para performance
- Migra dados existentes baseado no campo `segment`

### 2. Verificar a Migration

```bash
# Ver migrations pendentes
npx prisma migrate status

# Ver o SQL gerado
cat prisma/migrations/*/migration.sql
```

### 3. Aplicar em Desenvolvimento Local

```bash
# Se o banco local estiver rodando
npx prisma migrate dev

# Ou forçar aplicação
npx prisma db push
```

### 4. Executar Script de Migração de Dados (Opcional)

```bash
# Migrar dados de segment → clientType
node scripts/migrate-client-type.cjs
```

**O script faz:**
- Verifica se o campo `clientType` existe
- Identifica empresas B2G por padrões no `segment`
- Atualiza `clientType` de B2B → B2G
- Mostra estatísticas e amostra

---

## 🏢 PARA CADA TENANT (Multi-Tenant)

Como cada empresa tem seu próprio banco, você precisa:

### Opção A: Migration Automática (Recomendado)

A migration será aplicada automaticamente quando:
1. O servidor backend iniciar
2. O Prisma Client conectar ao banco
3. Detectar migrations pendentes

### Opção B: Migration Manual por Tenant

```bash
# 1. Configurar DATABASE_URL para o tenant
export DATABASE_URL="postgresql://user:pass@host:port/tenant_db"

# 2. Aplicar migration
npx prisma migrate deploy

# 3. Executar script de migração
node scripts/migrate-client-type.cjs
```

---

## 🔍 VALIDAÇÃO

### Verificar se a Migration Foi Aplicada

```sql
-- Verificar se o campo existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Company' 
  AND column_name = 'clientType';

-- Ver distribuição de tipos
SELECT "clientType", COUNT(*) 
FROM "Company" 
GROUP BY "clientType";
```

### Testar no Frontend

1. Acesse `/pos-venda`
2. Verifique se o filtro "Tipo de Cliente" aparece
3. Teste filtrar por B2B, B2G, B2C
4. Verifique se os badges aparecem nas tabelas

### Testar Detecção de Churn

```bash
# Via API
curl -X POST http://localhost:3002/post-sales/churn-alerts/detect \
  -H "Authorization: Bearer SEU_TOKEN"

# Verificar resposta com stats por tipo
{
  "message": "Análise de churn concluída. 5 novos alertas criados.",
  "stats": {
    "total": 5,
    "byType": {
      "B2B": 3,
      "B2G": 2,
      "B2C": 0
    }
  }
}
```

---

## 🐛 TROUBLESHOOTING

### Erro: "Can't reach database server"

**Causa:** Banco de dados não está rodando

**Solução:**
```bash
# Verificar se o banco está rodando
docker ps | grep postgres

# Ou iniciar o banco
docker-compose up -d postgres
```

### Erro: "Column 'clientType' does not exist"

**Causa:** Migration não foi aplicada

**Solução:**
```bash
# Aplicar migration
npx prisma migrate deploy

# Ou forçar
npx prisma db push
```

### Erro: "Migration already applied"

**Causa:** Migration já foi executada antes

**Solução:**
```bash
# Verificar status
npx prisma migrate status

# Se necessário, marcar como aplicada
npx prisma migrate resolve --applied add_client_type
```

### Script de Migração Falha

**Causa:** Campo `clientType` não existe ainda

**Solução:**
```bash
# 1. Aplicar migration primeiro
npx prisma migrate deploy

# 2. Depois executar script
node scripts/migrate-client-type.cjs
```

---

## 📊 MIGRATION SQL (Referência)

```sql
-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('B2B', 'B2G', 'B2C');

-- AlterTable
ALTER TABLE "Company" 
ADD COLUMN "clientType" "ClientType" NOT NULL DEFAULT 'B2B';

-- Migrar dados existentes
UPDATE "Company" 
SET "clientType" = 'B2G' 
WHERE "segment" ILIKE '%B2G%' 
   OR "segment" ILIKE '%GOVERNO%' 
   OR "segment" ILIKE '%PUBLICO%'
   OR "segment" ILIKE '%EDITAL%';

-- Criar índice
CREATE INDEX "Company_clientType_idx" ON "Company"("clientType");
```

---

## 🚀 DEPLOY EM PRODUÇÃO (Vercel)

### Preparação

1. **Commit das mudanças:**
```bash
git add .
git commit -m "feat: adicionar separação B2B/B2G em pós-vendas"
git push origin main
```

2. **Vercel aplicará automaticamente:**
- Build do projeto
- Migrations do Prisma
- Deploy do frontend e backend

### Verificação Pós-Deploy

```bash
# 1. Verificar logs do Vercel
vercel logs

# 2. Testar API em produção
curl https://seu-app.vercel.app/api/post-sales/churn-alerts

# 3. Acessar frontend
# Abrir https://seu-app.vercel.app/pos-venda
```

---

## 📝 CHECKLIST DE EXECUÇÃO

- [ ] Schema atualizado com enum `ClientType`
- [ ] Migration gerada (`add_client_type`)
- [ ] Migration aplicada no banco local
- [ ] Script de migração executado
- [ ] Empresas B2G identificadas corretamente
- [ ] Filtros funcionando no frontend
- [ ] Badges aparecendo nas tabelas
- [ ] Detecção de churn usando pesos corretos
- [ ] SLA calculado por tipo de cliente
- [ ] Testes realizados
- [ ] Commit e push para produção
- [ ] Deploy verificado

---

## 💡 DICAS

### Para Desenvolvimento

```bash
# Resetar banco (CUIDADO: apaga dados)
npx prisma migrate reset

# Aplicar todas as migrations
npx prisma migrate deploy

# Gerar Prisma Client
npx prisma generate
```

### Para Produção

```bash
# Apenas aplicar migrations (não cria novas)
npx prisma migrate deploy

# Verificar status sem aplicar
npx prisma migrate status
```

### Rollback (Se Necessário)

```bash
# 1. Reverter migration
npx prisma migrate resolve --rolled-back add_client_type

# 2. Remover campo manualmente
ALTER TABLE "Company" DROP COLUMN "clientType";
DROP TYPE "ClientType";

# 3. Remover migration
rm -rf prisma/migrations/*add_client_type*
```

---

## 📞 SUPORTE

Se encontrar problemas:

1. Verifique os logs: `npx prisma migrate status`
2. Consulte a documentação: `IMPLEMENTACAO_B2B_B2G_COMPLETA.md`
3. Execute o script de validação: `node scripts/migrate-client-type.cjs`

---

**Status:** ✅ Pronto para execução  
**Última atualização:** 2026-04-07
