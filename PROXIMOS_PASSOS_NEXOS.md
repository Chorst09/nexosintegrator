# Próximos Passos - Login nexos.chorstconsult.com.br

## ✅ Concluído

1. Banco Supabase criado (projeto: crmnexos)
2. Tabelas criadas com sucesso
3. Script SQL executado
4. Variável `DATABASE_URL` adicionada na Vercel (Production)
5. Código commitado e push feito para `production-nexos`
6. Deploy em andamento

## 🔄 Aguardando

O deploy está sendo processado pela Vercel. Aguarde 2-3 minutos.

## ✅ Verificações Necessárias

### 1. Verificar se o usuário MASTER existe no Supabase

Acesse o SQL Editor do Supabase:
https://supabase.com/dashboard/project/fozahazpowzlrtqkxhur/sql/new

Execute:
```sql
SELECT id, name, email, role, active, company_id 
FROM users 
WHERE email = 'master@master.com';
```

**Resultado esperado:**
- email: master@master.com
- role: MASTER
- active: true
- company_id: NULL

Se não retornar nada, execute:
```sql
INSERT INTO users (
  email, name, password, role, company_id, active,
  "accessB2B", "accessB2G", "accessPreSales"
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
) ON CONFLICT (email) DO UPDATE SET
  role = 'MASTER',
  active = true,
  company_id = NULL;
```

### 2. Verificar variável DATABASE_URL na Vercel

Acesse: https://vercel.com/chorstconsult-6872s-projects/crmautomatizadob2g/settings/environment-variables

Confirme que existe:
- Nome: `DATABASE_URL`
- Valor: `postgresql://postgres:Double%40%402026%21%40@db.fozahazpowzlrtqkxhur.supabase.co:5432/postgres`
- Environment: Production
- Sensitive: Yes

### 3. Aguardar deploy completar

Verifique em: https://vercel.com/chorstconsult-6872s-projects/crmautomatizadob2g/deployments

Aguarde até o status ficar "Ready" (verde).

### 4. Testar o login

Após o deploy completar:

1. Acesse: https://nexos.chorstconsult.com.br
2. Faça login com:
   - **Email**: master@master.com
   - **Senha**: admin123

### 5. Se ainda não funcionar

Verifique os logs da Vercel:
```bash
vercel logs --scope chorstconsult-6872s-projects
```

Procure por erros relacionados a:
- Prisma connection
- DATABASE_URL
- Authentication

## 📋 Informações Importantes

### Credenciais do Banco Supabase
- **Host**: db.fozahazpowzlrtqkxhur.supabase.co
- **Database**: postgres
- **Port**: 5432
- **User**: postgres
- **Password**: Double@@2026!@

### Connection String (URL encoded)
```
postgresql://postgres:Double%40%402026%21%40@db.fozahazpowzlrtqkxhur.supabase.co:5432/postgres
```

### Credenciais de Login MASTER
- **Email**: master@master.com
- **Senha**: admin123
- **Role**: MASTER

### Hash da Senha (bcrypt)
```
$2b$10$lTKAs0VqeitQZRE5/t5ZtuLnZ83pcXURoJAmtBgB/zUlqaa4BnvTw.
```

## 🔍 Troubleshooting

### Erro: "Credenciais inválidas"
- Verifique se o usuário existe no banco (passo 1)
- Verifique se a senha está correta: admin123
- Verifique se o campo `active` está como `true`

### Erro: "Erro interno do servidor"
- Verifique se DATABASE_URL está configurada na Vercel
- Verifique os logs da Vercel
- Verifique se o Prisma Client foi gerado no build

### Erro: "Cannot connect to database"
- Verifique se a connection string está correta
- Verifique se a senha está URL-encoded corretamente
- Verifique se o Supabase está online

## 📝 Arquivos Criados

- `SETUP_SUPABASE_NEXOS_CLEAN.sql` - Script SQL completo
- `CHECK_USER_NEXOS.sql` - Script para verificar/criar usuário
- `VERIFICAR_LOGIN_NEXOS.md` - Documentação de verificação
- `CONFIGURAR_SUPABASE_NEXOS.md` - Instruções de configuração
- `PROXIMOS_PASSOS_NEXOS.md` - Este arquivo

## ⏱️ Tempo Estimado

- Deploy da Vercel: 2-3 minutos
- Verificação do banco: 1 minuto
- Teste de login: 1 minuto

**Total: ~5 minutos**
