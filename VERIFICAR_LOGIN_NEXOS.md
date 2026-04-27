# Verificação de Login - nexos.chorstconsult.com.br

## Status Atual
- Banco Supabase criado: ✅
- Tabelas criadas: ✅
- Script executado: ✅

## Passos para Resolver

### 1. Verificar se o usuário MASTER existe no banco

Execute o script `CHECK_USER_NEXOS.sql` no Supabase SQL Editor:

1. Acesse: https://supabase.com/dashboard/project/fozahazpowzlrtqkxhur/sql/new
2. Cole o conteúdo do arquivo `CHECK_USER_NEXOS.sql`
3. Clique em "Run"
4. Verifique se retorna o usuário master@master.com

### 2. Verificar variáveis de ambiente na Vercel

Acesse: https://vercel.com/chorstconsult-6872s-projects/crmautomatizadob2g/settings/environment-variables

Verifique se existe a variável `DATABASE_URL` com o valor:
```
postgresql://postgres:Double%40%402026%21%40@db.fozahazpowzlrtqkxhur.supabase.co:5432/postgres
```

**IMPORTANTE**: A variável deve estar configurada para:
- Environment: Production
- Branch: production-nexos (ou All)

### 3. Verificar se o Prisma está gerando o client

O `package.json` já tem o script `postinstall` configurado:
```json
"postinstall": "prisma generate"
```

Isso garante que o Prisma Client será gerado no build da Vercel.

### 4. Testar o login

Após confirmar os passos acima:

1. Acesse: https://nexos.chorstconsult.com.br
2. Tente fazer login com:
   - Email: master@master.com
   - Senha: admin123

### 5. Se ainda não funcionar

Execute este comando no Supabase SQL Editor para forçar a criação do usuário:

```sql
DELETE FROM users WHERE email = 'master@master.com';

INSERT INTO users (
  email,
  name,
  password,
  role,
  company_id,
  active,
  "accessB2B",
  "accessB2G",
  "accessPreSales"
) VALUES (
  'master@master.com',
  'Master User',
  '$2b$10$lTKAs0VqeitQZRE5/t5ZtuLnZ83pcXURoJAmtBgB/zUlqaa4BnvTw.',
  'MASTER',
  NULL,
  true,
  true,
  true,
  true
);

SELECT id, name, email, role, active FROM users WHERE email = 'master@master.com';
```

## Credenciais de Login

- **Email**: master@master.com
- **Senha**: admin123
- **Role**: MASTER

## Informações do Banco

- **Host**: db.fozahazpowzlrtqkxhur.supabase.co
- **Database**: postgres
- **Port**: 5432
- **User**: postgres
- **Password**: Double@@2026!@

## Connection String (URL encoded)

```
postgresql://postgres:Double%40%402026%21%40@db.fozahazpowzlrtqkxhur.supabase.co:5432/postgres
```

Onde:
- `@` = `%40`
- `!` = `%21`
