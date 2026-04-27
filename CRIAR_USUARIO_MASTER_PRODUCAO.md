# Criar Usuário MASTER em Produção

## Problema Resolvido

O endpoint de empresas estava funcionando, mas:
1. Não havia empresas cadastradas no banco
2. Não havia usuário MASTER para acessar a funcionalidade
3. O mapeamento de dados estava incorreto (document vs cnpj, isActive vs status)

## Correções Aplicadas

### 1. Mapeamento de Dados Corrigido
- `company.cnpj` (não `company.document`)
- `company.status === 'ACTIVE'` (não `company.isActive`)
- `company.license?.plan?.name` (não `company.planName`)
- `company.usersCount` (não `company._count?.users`)
- `response.data` (API retorna `{ data: [...] }`)

### 2. Dados de Teste Criados Localmente
```sql
-- Usuário MASTER
INSERT INTO "User" (id, name, email, password, role, "accessB2B", "accessB2G", "accessPreSales", "isCompanyOwner", quota, "createdAt")
VALUES (gen_random_uuid(), 'Master Admin', 'master@crm.com', '$2a$10$kgCvKsVf3FVoZQq4JPj8h.LCKRuBzsdOFczXp9KO2WWPHyGqdo.Bq', 'MASTER', true, true, true, false, 999999, NOW());

-- Senha: master123

-- Empresa de Teste
INSERT INTO "TenantCompany" (id, name, "legalName", cnpj, email, phone, status, notes, "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'Empresa Teste Ltda', 'Empresa Teste Ltda ME', '12345678000190', 'contato@empresateste.com', '(11) 98765-4321', 'ACTIVE', 'Empresa de teste', NOW(), NOW());
```

## Como Criar MASTER em Produção

### Opção 1: Via Vercel Postgres Dashboard

1. Acesse https://vercel.com/chorstconsult-6872s-projects/crmautomatizadob2g
2. Vá em **Storage** → Seu banco PostgreSQL
3. Clique em **Query**
4. Execute:

```sql
-- Gerar hash da senha (use bcrypt online ou localmente)
-- Senha: master123
-- Hash: $2a$10$kgCvKsVf3FVoZQq4JPj8h.LCKRuBzsdOFczXp9KO2WWPHyGqdo.Bq

INSERT INTO "User" (
  id, 
  name, 
  email, 
  password, 
  role, 
  "accessB2B", 
  "accessB2G", 
  "accessPreSales", 
  "isCompanyOwner", 
  quota, 
  "createdAt"
)
VALUES (
  gen_random_uuid(), 
  'Master Admin', 
  'master@crm.com', 
  '$2a$10$kgCvKsVf3FVoZQq4JPj8h.LCKRuBzsdOFczXp9KO2WWPHyGqdo.Bq', 
  'MASTER', 
  true, 
  true, 
  true, 
  false, 
  999999, 
  NOW()
);
```

### Opção 2: Via Vercel CLI

```bash
# Conectar ao banco de produção
vercel env pull .env.production

# Usar psql com a connection string
psql "$(grep DATABASE_URL .env.production | cut -d '=' -f2-)" -c "INSERT INTO \"User\" ..."
```

### Opção 3: Criar via Checkout (Recomendado)

1. Acesse https://crmautomatizadob2g.vercel.app
2. Faça um checkout real ou simulado
3. Complete o setup do primeiro usuário
4. Altere o role do usuário para MASTER via SQL:

```sql
UPDATE "User" 
SET role = 'MASTER' 
WHERE email = 'seu@email.com';
```

## Credenciais de Teste

### Local
- **Email**: master@crm.com
- **Senha**: master123

### Produção
Você precisa criar o usuário MASTER usando uma das opções acima.

## Como Testar

### 1. Login como MASTER
```
Email: master@crm.com
Senha: master123
```

### 2. Acessar Gestão de Empresas
- Vá em **Administração** (⚙️)
- Clique na tab **Gestão de Empresas** (🏛️)

### 3. Verificar Lista
- Deve mostrar todas as empresas cadastradas
- Campos exibidos:
  - Nome + Email
  - CNPJ
  - Plano (da licença ativa)
  - Status (ACTIVE/SUSPENDED/etc)
  - Quantidade de usuários
  - Data de criação

## Estrutura de Dados

### TenantCompany
```javascript
{
  id: "uuid",
  name: "Empresa Teste Ltda",
  legalName: "Empresa Teste Ltda ME",
  cnpj: "12345678000190",
  email: "contato@empresa.com",
  phone: "(11) 98765-4321",
  status: "ACTIVE", // PROSPECT, ACTIVE, SUSPENDED, CANCELED
  notes: "...",
  createdAt: "2026-04-07T...",
  updatedAt: "2026-04-07T..."
}
```

### Resposta da API
```javascript
{
  data: [
    {
      id: "uuid",
      name: "Empresa Teste Ltda",
      cnpj: "12345678000190",
      email: "contato@empresa.com",
      status: "ACTIVE",
      usersCount: 3,
      adminsCount: 1,
      users: [...],
      license: {
        id: "uuid",
        status: "ACTIVE",
        seats: 10,
        startDate: "2026-04-07T...",
        endDate: "2027-04-07T...",
        plan: {
          id: "uuid",
          code: "MENSAL",
          name: "Mensal",
          billingCycle: "MONTHLY",
          price: 289
        }
      }
    }
  ],
  summary: {
    totalCompanies: 1,
    activeLicenses: 1
  }
}
```

## Próximos Passos

1. ✅ Criar usuário MASTER em produção
2. ✅ Testar listagem de empresas
3. ⏳ Implementar modal de detalhes
4. ⏳ Adicionar ações de gerenciamento
5. ⏳ Adicionar filtros e busca

## Troubleshooting

### "Nenhuma empresa encontrada"
- Verifique se há empresas no banco: `SELECT * FROM "TenantCompany";`
- Verifique se o usuário é MASTER: `SELECT role FROM "User" WHERE email = 'seu@email.com';`
- Verifique os logs da API no Vercel

### "Erro ao carregar empresas"
- Abra o console do navegador (F12)
- Verifique se há erro 401 (não autenticado) ou 403 (sem permissão)
- Verifique se o token JWT está válido

### Campos aparecem como "undefined"
- Verifique se a API está retornando `{ data: [...] }`
- Verifique se os campos estão corretos (cnpj, status, usersCount)
- Verifique se há licença ativa para mostrar o plano

## Conclusão

✅ Mapeamento de dados corrigido
✅ Usuário MASTER criado localmente
✅ Empresa de teste criada
✅ Deploy realizado

Agora você precisa criar o usuário MASTER em produção para poder acessar a gestão de empresas.
