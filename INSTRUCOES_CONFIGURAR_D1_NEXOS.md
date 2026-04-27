# Instruções: Configurar Banco D1 Nexos

## Informações do Banco
- **Nome**: nexos
- **UUID**: fc912a7b-5564-403c-9d78-146fb0999ae2
- **Plataforma**: Cloudflare D1

## Passo 1: Executar Script de Criação das Tabelas

1. Acesse: https://dash.cloudflare.com/
2. Vá em **Workers & Pages** → **D1**
3. Selecione o banco **nexos** (UUID: fc912a7b-5564-403c-9d78-146fb0999ae2)
4. Clique em **Console**
5. Copie e cole o conteúdo completo do arquivo `SETUP_NEXOS_D1_COMPLETO.sql`
6. Execute o script

O script irá criar:
- ✅ Todas as tabelas necessárias
- ✅ Índices para performance
- ✅ Usuário MASTER padrão (master@master.com / admin123)
- ✅ Configurações iniciais do app

## Passo 2: Verificar Criação das Tabelas

Execute este SQL no Console do D1:

```sql
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
```

Deve mostrar todas as tabelas criadas:
- users
- companies
- contacts
- products
- opportunities
- opportunity_products
- activities
- proposals
- proposal_items
- commissions
- contracts
- regions
- tenant_companies
- license_plans
- company_licenses
- support_tickets
- ticket_responses
- nps_surveys
- churn_alerts
- pre_sales_requests
- app_settings

## Passo 3: Verificar Usuário MASTER

```sql
SELECT id, name, email, role, active FROM users WHERE email = 'master@master.com';
```

Deve retornar:
- **Email**: master@master.com
- **Role**: MASTER
- **Active**: 1

## Passo 4: Configurar Variáveis de Ambiente na Vercel

1. Acesse: https://vercel.com/dashboard
2. Abra o projeto **nexos.chorstconsult.com.br**
3. Vá em **Settings** → **Environment Variables**
4. Adicione/atualize estas variáveis:

### Variáveis Obrigatórias:

```
DATABASE_URL=file:./dev.db
CLOUDFLARE_D1_DATABASE_ID=fc912a7b-5564-403c-9d78-146fb0999ae2
CLOUDFLARE_ACCOUNT_ID=<seu_account_id>
CLOUDFLARE_API_TOKEN=<seu_api_token>
```

### Como obter as credenciais:

**CLOUDFLARE_ACCOUNT_ID**:
1. No Cloudflare Dashboard, clique no seu perfil (canto superior direito)
2. Copie o **Account ID**

**CLOUDFLARE_API_TOKEN**:
1. Vá em **My Profile** → **API Tokens**
2. Clique em **Create Token**
3. Use o template **Edit Cloudflare Workers**
4. Ou crie um token customizado com permissões:
   - Account > D1 > Edit
   - Account > Workers Scripts > Edit
5. Copie o token gerado

## Passo 5: Configurar Binding do D1 no Vercel

No arquivo `vercel.json` (ou criar se não existir):

```json
{
  "build": {
    "env": {
      "DATABASE_URL": "file:./dev.db"
    }
  },
  "env": {
    "CLOUDFLARE_D1_DATABASE_ID": "fc912a7b-5564-403c-9d78-146fb0999ae2"
  }
}
```

## Passo 6: Redeploy do Projeto

1. Na Vercel Dashboard, vá em **Deployments**
2. Clique nos 3 pontinhos (...) do último deploy
3. Selecione **Redeploy**
4. Aguarde o deploy concluir

## Passo 7: Testar Login

1. Acesse: https://nexos.chorstconsult.com.br
2. Limpe o cache: F12 → Console → `localStorage.clear()`
3. Recarregue a página (F5)
4. Faça login com:
   - **Email**: master@master.com
   - **Senha**: admin123
5. Verifique se o role é MASTER:
   ```javascript
   console.log(JSON.parse(localStorage.getItem('user')));
   ```

## Passo 8: Criar Outros Usuários (Opcional)

### Criar usuário ADMIN para uma empresa:

```sql
INSERT INTO users (
  id, email, name, password, role, company_id, active,
  accessB2B, accessB2G, accessPreSales, created_at, updated_at
) VALUES (
  lower(hex(randomblob(16))),
  'admin@empresa.com',
  'Administrador',
  '$2b$10$lTKAs0VqeitQZRE5/t5ZtuLnZ83pcXURoJAmtBgB/zUlqaa4BnvTw.',
  'ADMIN',
  '<company_id>',
  1, 1, 1, 1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
```

Senha padrão: **admin123**

## Troubleshooting

### Erro: "no such table: users"
- Execute o script `SETUP_NEXOS_D1_COMPLETO.sql` novamente
- Verifique se está no banco correto (nexos)

### Erro 401 no login
- Verifique se o usuário existe: `SELECT * FROM users WHERE email = 'master@master.com';`
- Verifique se a senha está correta (hash bcrypt)
- Limpe o cache do navegador

### Role aparece como ADMIN em vez de MASTER
- Verifique no banco: `SELECT role FROM users WHERE email = 'master@master.com';`
- Se estiver correto no banco mas errado na API, aguarde o próximo deploy com o workaround

### Variáveis de ambiente não funcionam
- Verifique se as variáveis estão configuradas para o ambiente correto (Production)
- Faça um redeploy após adicionar/modificar variáveis

## Estrutura de Dados

### Roles Disponíveis:
- **MASTER**: Acesso total ao sistema, sem restrições
- **ADMIN**: Administrador de empresa, acesso completo à sua empresa
- **MANAGER**: Gerente, pode gerenciar equipe
- **DIRECTOR**: Diretor, acesso a relatórios estratégicos
- **SELLER**: Vendedor, acesso básico
- **USER**: Usuário padrão
- **PRE_SALES**: Pré-vendas, acesso ao módulo de precificação

### Módulos do Sistema:
- **B2B**: Vendas Business-to-Business
- **B2G**: Vendas Business-to-Government
- **Pré-Vendas**: Cotações e precificação
- **Pós-Vendas**: Suporte, NPS, Churn
- **Licenciamento**: Gestão de empresas e licenças

## Próximos Passos

Após configurar o banco:
1. Teste todas as funcionalidades principais
2. Crie empresas de teste via "Gestão de Empresas"
3. Configure integrações se necessário
4. Ajuste as configurações do app em "Administração"

## Suporte

Se encontrar problemas:
1. Verifique os logs da Vercel
2. Verifique os dados no Console do D1
3. Teste a API diretamente com curl/Postman
4. Verifique se as variáveis de ambiente estão corretas
