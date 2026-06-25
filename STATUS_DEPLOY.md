# Status do Deploy - Cliente e Modalidade

## ✅ O Que Já Foi Feito

### 1. Commit Realizado
- **Hash**: ad8bcbc
- **Branch**: main
- **Data**: 25/06/2026
- **Status**: ✅ Commitado com sucesso

### 2. Push para GitHub
- **Repositório**: https://github.com/Chorst09/nexosintegrator.git
- **Branch**: main
- **Status**: ✅ Enviado com sucesso

### 3. Arquivos Commitados
✅ `apps/api/prisma/schema.prisma` - Schema atualizado
✅ `netlify/functions/prisma/schema.prisma` - Schema atualizado
✅ `netlify/functions/pre-vendas.js` - API atualizada
✅ `apps/web/src/pages/OrcamentosPrevendas.jsx` - Frontend atualizado
✅ `migration_add_cliente_modalidade.sql` - Script SQL
✅ `CHANGELOG_CLIENTE_MODALIDADE.md` - Documentação
✅ `DEPLOY_INSTRUCTIONS.md` - Guia de deploy
✅ `FEATURE_SUMMARY.md` - Resumo da feature
✅ `QUICK_REFERENCE.md` - Referência rápida
✅ `README_ALTERACOES.md` - Índice geral

---

## ⏳ O Que Precisa Ser Feito NO SERVIDOR

### Passo 1: Conectar ao Servidor
```bash
ssh root@209.50.241.25
```

### Passo 2: Navegar até o Projeto
```bash
cd /caminho/do/nexosintegrator-main
```

### Passo 3: Atualizar o Código
```bash
git pull origin main
```

### Passo 4: Executar Migração do Banco
```bash
# Opção A: Via arquivo SQL
docker exec -it postgres psql -U nexoscrm -d nexoscrm -f migration_add_cliente_modalidade.sql

# Opção B: Comando direto
docker exec -it postgres psql -U nexoscrm -d nexoscrm -c "
ALTER TABLE \"PreSalesRequest\" ADD COLUMN IF NOT EXISTS \"nomeCliente\" TEXT;
ALTER TABLE \"PreSalesRequest\" ADD COLUMN IF NOT EXISTS \"modalidade\" TEXT;
"
```

### Passo 5: Regenerar Prisma Client
```bash
# No diretório apps/api
cd apps/api
npx prisma generate

# No diretório netlify/functions
cd ../../netlify/functions
npx prisma generate
```

### Passo 6: Rebuild Frontend
```bash
cd ../../apps/web
npm run build
```

### Passo 7: Reiniciar Serviços
```bash
cd ../../
docker-compose restart
# OU
docker restart nexoscrm-api
docker restart nexoscrm-web
```

### Passo 8: Verificar Funcionamento
1. Acesse: https://nexos.chorstconsult.com.br
2. Vá em: Pré-Vendas > Orçamentos
3. Crie um novo orçamento
4. Verifique se os campos aparecem
5. Teste salvar com os novos campos
6. Verifique se aparecem na listagem

---

## 📋 Checklist Rápido de Deploy

- [ ] Conectado ao servidor (209.50.241.25)
- [ ] Código atualizado (`git pull`)
- [ ] Migração SQL executada
- [ ] Verificado: colunas existem no banco
- [ ] Prisma regenerado em `apps/api`
- [ ] Prisma regenerado em `netlify/functions`
- [ ] Frontend rebuilded
- [ ] Serviços reiniciados
- [ ] Site acessível
- [ ] Formulário mostra novos campos
- [ ] Orçamento criado com sucesso
- [ ] Dados aparecem na listagem

---

## 🔍 Verificação Rápida

### No Banco de Dados
```sql
-- Conectar
docker exec -it postgres psql -U nexoscrm -d nexoscrm

-- Verificar colunas
\d "PreSalesRequest"

-- Deve mostrar:
-- nomeCliente | text |
-- modalidade  | text |
```

### No Frontend
- Abrir: https://nexos.chorstconsult.com.br/prevendas-orcamentos
- Clicar em "Novo orçamento"
- Deve ver campos: "Nome do Cliente" e "Modalidade"

### Na Listagem
- Deve ver coluna "Cliente / Modalidade"
- Ao criar orçamento, dados devem aparecer

---

## ⚠️ Observações Importantes

1. **Backup Recomendado**: Fazer backup do banco antes da migração
2. **Horário**: Preferencialmente fora do horário comercial
3. **Rollback**: Se necessário, use o script de rollback no DEPLOY_INSTRUCTIONS.md
4. **Tempo Estimado**: 10-15 minutos para todo o processo

---

## 📞 Suporte

Se algo der errado:

1. **Logs**: `docker logs nexoscrm-api`
2. **Banco**: Verificar se migração foi aplicada
3. **Prisma**: Verificar se foi regenerado
4. **Documentação**: Consultar DEPLOY_INSTRUCTIONS.md

---

## 📊 Resumo

| Item | Status |
|------|--------|
| **Código commitado** | ✅ Feito |
| **Push para GitHub** | ✅ Feito |
| **Documentação** | ✅ Completa |
| **Migração SQL** | ⏳ Aguardando deploy no servidor |
| **Atualização servidor** | ⏳ Aguardando deploy no servidor |
| **Testes produção** | ⏳ Aguardando deploy no servidor |

---

## 🎯 Próximo Passo

**CONECTAR AO SERVIDOR E SEGUIR OS PASSOS ACIMA**

Ou seguir o guia completo em: **DEPLOY_INSTRUCTIONS.md**

---

**Data**: 25/06/2026  
**Commit**: ad8bcbc  
**Branch**: main  
**Status**: ✅ Código pronto, aguardando deploy no servidor
