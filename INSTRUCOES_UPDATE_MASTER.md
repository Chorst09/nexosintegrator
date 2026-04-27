# Instruções para Atualizar admin@crm.com para MASTER

## Objetivo
Atualizar o usuário **admin@crm.com** no domínio **crmcomercial.chorstconsult.com.br** de ADMIN para MASTER.

## Opção 1: Via Cloudflare Dashboard (Recomendado)

1. Acesse o [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Vá em **Workers & Pages** → **D1**
3. Selecione seu banco de dados do domínio **crmcomercial.chorstconsult.com.br**
4. Clique em **Console** ou **Query**
5. Cole e execute o SQL do arquivo `UPDATE_ADMIN_TO_MASTER_D1.sql`

## Opção 2: Via Wrangler CLI

```bash
# Execute no terminal (na raiz do projeto)
wrangler d1 execute <SEU_DATABASE_NAME> --file=UPDATE_ADMIN_TO_MASTER_D1.sql
```

Substitua `<SEU_DATABASE_NAME>` pelo nome do seu banco D1 do domínio crmcomercial.

## Opção 3: Via Wrangler CLI (comando direto)

```bash
wrangler d1 execute <SEU_DATABASE_NAME> --command="UPDATE User SET role = 'MASTER', tenantCompanyId = NULL, accessB2B = 1, accessB2G = 1, accessPreSales = 1, quota = 999999 WHERE email = 'admin@crm.com';"
```

## Verificar se a atualização foi bem-sucedida

```bash
wrangler d1 execute <SEU_DATABASE_NAME> --command="SELECT id, name, email, role, tenantCompanyId FROM User WHERE email = 'admin@crm.com';"
```

Você deve ver:
- **role**: MASTER
- **tenantCompanyId**: NULL (ou vazio)
- **accessB2B**: 1
- **accessB2G**: 1
- **accessPreSales**: 1
- **quota**: 999999

## O que será alterado

| Campo | Antes (ADMIN) | Depois (MASTER) |
|-------|---------------|-----------------|
| role | ADMIN | MASTER |
| tenantCompanyId | (algum ID) | NULL |
| accessB2B | 1 | 1 |
| accessB2G | 1 | 1 |
| accessPreSales | 1 | 1 |
| quota | (valor atual) | 999999 |

## Após a Atualização

1. Faça logout do sistema
2. Faça login novamente com:
   - Email: admin@crm.com
   - Senha: (sua senha atual)
3. Vá em **Administração** → **Gestão de Empresas**
4. Agora você verá o botão **"➕ Nova Empresa"** e poderá cadastrar empresas!

## Observações Importantes

- **tenantCompanyId = NULL**: Usuários MASTER não pertencem a uma empresa específica, têm acesso global
- **quota = 999999**: Quota ilimitada para usuários MASTER
- A senha do usuário **não será alterada**, apenas o role e permissões

## Troubleshooting

Se após a atualização ainda aparecer como ADMIN:

1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Faça logout e login novamente
3. Verifique no banco se o role foi atualizado:
   ```sql
   SELECT role FROM User WHERE email = 'admin@crm.com';
   ```
4. Se ainda não funcionar, verifique se está no banco de dados correto (crmcomercial)
