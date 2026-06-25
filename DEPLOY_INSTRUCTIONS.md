# Instruções de Deploy - Adição de Cliente e Modalidade ao Cadastro de Orçamento

## Data: 25 de Junho de 2026

## Alterações Implementadas

Foram adicionados dois novos campos ao cadastro de orçamento (Pré-Vendas):

1. **Nome do Cliente** (`nomeCliente`) - Campo texto para identificar o cliente
2. **Modalidade** (`modalidade`) - Seleção entre: Venda, Locação ou Serviço

## Arquivos Modificados

### 1. Schema do Banco de Dados
- `apps/api/prisma/schema.prisma`
- `netlify/functions/prisma/schema.prisma`

### 2. Backend API
- `netlify/functions/pre-vendas.js`

### 3. Frontend
- `apps/web/src/pages/OrcamentosPrevendas.jsx`

## Passos para Deploy

### Passo 1: Conectar ao Servidor de Produção

```bash
ssh root@209.50.241.25
```

### Passo 2: Navegar até o diretório do projeto

```bash
cd /path/to/nexosintegrator-main
```

### Passo 3: Fazer backup do banco de dados

```bash
# Entrar no container do PostgreSQL
docker exec -it postgres psql -U nexoscrm -d nexoscrm

# Fazer backup da tabela (dentro do psql)
\copy "PreSalesRequest" TO '/tmp/presales_backup_20260625.csv' CSV HEADER;

# Sair do psql
\q
```

### Passo 4: Executar a Migração do Banco de Dados

```bash
# Copiar o arquivo de migração para o servidor se necessário
# O arquivo está em: migration_add_cliente_modalidade.sql

# Entrar no container do PostgreSQL
docker exec -it postgres psql -U nexoscrm -d nexoscrm

# Executar a migração
\i /path/to/migration_add_cliente_modalidade.sql

# OU executar diretamente:
ALTER TABLE "PreSalesRequest" ADD COLUMN IF NOT EXISTS "nomeCliente" TEXT;
ALTER TABLE "PreSalesRequest" ADD COLUMN IF NOT EXISTS "modalidade" TEXT;

# Verificar as alterações
\d "PreSalesRequest"

# Sair
\q
```

### Passo 5: Atualizar o código da aplicação

```bash
# Fazer pull das alterações do repositório
git pull origin main

# OU copiar os arquivos modificados manualmente
```

### Passo 6: Reinstalar dependências (se necessário)

```bash
# Se houver novas dependências
cd apps/web
npm install

cd ../api
npm install
```

### Passo 7: Gerar o Prisma Client atualizado

```bash
cd apps/api
npx prisma generate

cd ../../netlify/functions
npx prisma generate
```

### Passo 8: Reconstruir o Frontend

```bash
cd apps/web
npm run build
```

### Passo 9: Reiniciar os serviços

```bash
# Se usar Docker Compose
docker-compose restart

# OU reiniciar serviços específicos
docker restart nexoscrm-api
docker restart nexoscrm-web

# Se usar Netlify Functions
# Deploy via Netlify CLI ou interface web
```

### Passo 10: Verificar o funcionamento

1. Acesse: https://nexos.chorstconsult.com.br
2. Navegue para: Pré-Vendas > Orçamentos
3. Clique em "Novo orçamento"
4. Verifique se os campos "Nome do Cliente" e "Modalidade" aparecem no formulário
5. Teste criar um novo orçamento com esses campos preenchidos
6. Verifique se os dados aparecem na listagem

## Rollback (se necessário)

Se algo der errado, você pode reverter as alterações:

```bash
# Remover as colunas do banco
docker exec -it postgres psql -U nexoscrm -d nexoscrm

ALTER TABLE "PreSalesRequest" DROP COLUMN IF EXISTS "nomeCliente";
ALTER TABLE "PreSalesRequest" DROP COLUMN IF EXISTS "modalidade";

\q

# Reverter o código
git revert <commit-hash>
# OU restaurar backup dos arquivos
```

## Notas Importantes

1. **Campos Opcionais**: Os campos são opcionais (nullable) para não quebrar registros existentes
2. **Valores Padrão**: O campo modalidade tem valor padrão "VENDA" no formulário
3. **Compatibilidade**: Os registros antigos continuarão funcionando sem esses campos
4. **Validação**: Não há validação obrigatória no backend, mas são recomendados para novos registros

## Suporte

Em caso de problemas durante o deploy:
- Verificar logs: `docker logs nexoscrm-api`
- Verificar banco: `docker exec -it postgres psql -U nexoscrm -d nexoscrm`
- Verificar se todas as variáveis de ambiente estão corretas no `.env`

## Checklist de Deploy

- [ ] Backup do banco de dados realizado
- [ ] Migração SQL executada com sucesso
- [ ] Código atualizado no servidor
- [ ] Prisma Client regenerado
- [ ] Frontend reconstruído
- [ ] Serviços reiniciados
- [ ] Testes funcionais realizados
- [ ] Campos aparecem no formulário
- [ ] Campos são salvos corretamente
- [ ] Campos aparecem na listagem
