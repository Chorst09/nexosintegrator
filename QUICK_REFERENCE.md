# Quick Reference - Cliente e Modalidade no Orçamento

## 🚀 Deploy Rápido

```bash
# 1. Conectar ao servidor
ssh root@209.50.241.25

# 2. Executar migração SQL
docker exec -it postgres psql -U nexoscrm -d nexoscrm
ALTER TABLE "PreSalesRequest" ADD COLUMN IF NOT EXISTS "nomeCliente" TEXT;
ALTER TABLE "PreSalesRequest" ADD COLUMN IF NOT EXISTS "modalidade" TEXT;
\q

# 3. Atualizar código
git pull origin main

# 4. Regenerar Prisma Client
cd apps/api && npx prisma generate
cd ../../netlify/functions && npx prisma generate

# 5. Rebuild frontend
cd ../../apps/web && npm run build

# 6. Reiniciar serviços
docker-compose restart
```

---

## 📦 Arquivos Alterados

| Arquivo | Mudança |
|---------|---------|
| `apps/api/prisma/schema.prisma` | +2 campos no modelo PreSalesRequest |
| `netlify/functions/prisma/schema.prisma` | +2 campos no modelo PreSalesRequest |
| `netlify/functions/pre-vendas.js` | Suporte API para novos campos |
| `apps/web/src/pages/OrcamentosPrevendas.jsx` | Form + listagem atualizados |

---

## 🗄️ Campos no Banco

```sql
-- Tabela: PreSalesRequest
nomeCliente  TEXT NULL    -- Nome do cliente
modalidade   TEXT NULL    -- VENDA, LOCACAO ou SERVICO
```

---

## 🔌 API Endpoints

### POST /api/pre-vendas
```json
{
  "titulo": "Orçamento Exemplo",
  "descricao": "Descrição...",
  "nomeCliente": "Empresa XYZ",     // ← NOVO (opcional)
  "modalidade": "VENDA",            // ← NOVO (opcional)
  "prioridade": "MEDIUM",
  "items": [...]
}
```

### PUT /api/pre-vendas/:id
```json
{
  "nomeCliente": "Empresa ABC",     // ← Atualizar cliente
  "modalidade": "LOCACAO"           // ← Atualizar modalidade
}
```

### GET /api/pre-vendas
Resposta inclui automaticamente:
```json
{
  "solicitacoes": [
    {
      "id": "...",
      "titulo": "...",
      "nomeCliente": "Empresa XYZ",   // ← Retornado
      "modalidade": "VENDA"           // ← Retornado
    }
  ]
}
```

---

## 💻 Frontend Components

### Form State
```javascript
const buildEmptyForm = (currentUser) => ({
  // ... campos existentes ...
  nomeCliente: '',
  modalidade: 'VENDA',  // valor padrão
});
```

### Form Fields
```jsx
<input 
  type="text"
  value={form.nomeCliente}
  onChange={(e) => setField('nomeCliente', e.target.value)}
  placeholder="Nome da empresa ou cliente"
/>

<select
  value={form.modalidade}
  onChange={(e) => setField('modalidade', e.target.value)}
>
  <option value="VENDA">Venda</option>
  <option value="LOCACAO">Locação</option>
  <option value="SERVICO">Serviço</option>
</select>
```

### Display in List
```jsx
const modalidadeLabel = {
  VENDA: 'Venda',
  LOCACAO: 'Locação',
  SERVICO: 'Serviço'
}[item.modalidade] || '-';

<div>
  <p>{item.nomeCliente || '-'}</p>
  <p>{modalidadeLabel}</p>
</div>
```

---

## ✅ Checklist de Teste

- [ ] Criar orçamento COM cliente e modalidade
- [ ] Criar orçamento SEM cliente e modalidade
- [ ] Verificar campos na listagem
- [ ] Verificar busca continua funcionando
- [ ] Verificar filtros existentes funcionam
- [ ] Verificar dados salvos no banco
- [ ] Verificar registros antigos continuam funcionando

---

## 🐛 Troubleshooting

### Campos não aparecem no formulário
```bash
# Verificar se o código foi atualizado
git log --oneline -5

# Limpar cache do build
rm -rf apps/web/dist
npm run build
```

### Erro ao salvar no banco
```sql
-- Verificar se as colunas existem
\d "PreSalesRequest"

-- Se não existirem, executar:
ALTER TABLE "PreSalesRequest" ADD COLUMN "nomeCliente" TEXT;
ALTER TABLE "PreSalesRequest" ADD COLUMN "modalidade" TEXT;
```

### Prisma Client desatualizado
```bash
# Regenerar em ambos os locais
cd apps/api
npx prisma generate

cd ../../netlify/functions
npx prisma generate
```

### Valores não aparecem na listagem
```javascript
// Verificar se o backend retorna os campos
console.log(item.nomeCliente, item.modalidade);

// Verificar query
fetch('/api/pre-vendas')
  .then(r => r.json())
  .then(data => console.log(data));
```

---

## 📐 Valores Válidos

### modalidade
- `"VENDA"` → Exibe "Venda"
- `"LOCACAO"` → Exibe "Locação"
- `"SERVICO"` → Exibe "Serviço"
- `null` ou `""` → Exibe "-"

### nomeCliente
- Qualquer string
- `null` ou `""` → Exibe "-"

---

## 🔄 Rollback Rápido

```bash
# Remover colunas do banco
docker exec -it postgres psql -U nexoscrm -d nexoscrm
ALTER TABLE "PreSalesRequest" DROP COLUMN "nomeCliente";
ALTER TABLE "PreSalesRequest" DROP COLUMN "modalidade";
\q

# Reverter código
git log --oneline
git revert <commit-hash>
```

---

## 📊 SQL Queries Úteis

```sql
-- Ver todos os orçamentos com cliente e modalidade
SELECT numero, titulo, "nomeCliente", modalidade 
FROM "PreSalesRequest" 
ORDER BY "createdAt" DESC 
LIMIT 10;

-- Contar orçamentos por modalidade
SELECT modalidade, COUNT(*) 
FROM "PreSalesRequest" 
GROUP BY modalidade;

-- Atualizar modalidade em massa (exemplo)
UPDATE "PreSalesRequest" 
SET modalidade = 'VENDA' 
WHERE modalidade IS NULL;

-- Ver registros sem cliente
SELECT * FROM "PreSalesRequest" 
WHERE "nomeCliente" IS NULL 
OR "nomeCliente" = '';
```

---

## 📞 Contatos Úteis

**Documentação Completa**:
- Deploy: `DEPLOY_INSTRUCTIONS.md`
- Changelog: `CHANGELOG_CLIENTE_MODALIDADE.md`
- Feature: `FEATURE_SUMMARY.md`

**Migration SQL**: `migration_add_cliente_modalidade.sql`

---

**Última Atualização**: 25/06/2026  
**Versão**: 1.1.0
