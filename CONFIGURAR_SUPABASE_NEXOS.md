# Configurar Supabase para Nexos

## Connection String
```
postgresql://postgres:Double%40%402026%21%40@db.fozahazpowzlrtqkxhur.supabase.co:5432/postgres
```

**Nota**: A senha foi URL-encoded:
- `@` → `%40`
- `!` → `%21`

---

## Passo 1: Executar Script SQL no Supabase

1. Acesse: https://supabase.com/dashboard
2. Abra o projeto **crmnexos**
3. Vá em **SQL Editor** (ícone </> no menu lateral)
4. Clique em **New query**
5. Copie e cole o conteúdo do arquivo `SETUP_SUPABASE_NEXOS.sql`
6. Clique em **Run** (ou pressione Ctrl+Enter)

O script irá criar:
- ✅ Todas as tabelas necessárias
- ✅ Índices para performance
- ✅ Usuário MASTER (master@master.com / admin123)

---

## Passo 2: Verificar Tabelas Criadas

Execute no SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Deve mostrar:
- users
- companies
- contacts
- products
- opportunities
- regions
- tenant_companies

---

## Passo 3: Verificar Usuário MASTER

```sql
SELECT id, name, email, role, active 
FROM users 
WHERE email = 'master@master.com';
```

---

## Passo 4: Configurar Variáveis na Vercel

1. Acesse: https://vercel.com/dashboard
2. Abra o projeto **nexos.chorstconsult.com.br**
3. Vá em **Settings** → **Environment Variables**
4. **REMOVA** as variáveis antigas do Cloudflare:
   - `CLOUDFLARE_D1_DATABASE_ID`
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

5. **ADICIONE** a nova variável:
   - **Name**: `DATABASE_URL`
   - **Value**: `postgresql://postgres:Double%40%402026%21%40@db.fozahazpowzlrtqkxhur.supabase.co:5432/postgres`
   - **Environment**: Marque todos (Production, Preview, Development)
   - Clique em **Save**

---

## Passo 5: Reverter Código para usar Prisma

O código precisa voltar a usar Prisma em vez do D1Client.

Execute localmente:

```bash
cd apps/api
npx prisma generate
npx prisma db push
```

---

## Passo 6: Fazer Deploy

Após configurar a variável DATABASE_URL na Vercel:

1. Vá em **Deployments**
2. Clique nos 3 pontinhos (...) do último deploy
3. Selecione **Redeploy**
4. Aguarde concluir

---

## Passo 7: Testar Login

1. Acesse: https://nexos.chorstconsult.com.br
2. Limpe o cache: F12 → Console → `localStorage.clear()`
3. Recarregue (F5)
4. Faça login com:
   - **Email**: master@master.com
   - **Senha**: admin123

---

## Vantagens do Supabase

✅ **Compatibilidade**: PostgreSQL padrão, funciona com Prisma  
✅ **Performance**: Mais rápido que D1 via API REST  
✅ **Simplicidade**: Sem adaptadores necessários  
✅ **Ferramentas**: SQL Editor, Table Editor, Auth integrado  
✅ **Escalabilidade**: Fácil upgrade de plano  

---

## Troubleshooting

### Erro ao executar script SQL
- Verifique se está no SQL Editor correto
- Execute em partes se necessário
- Verifique se a extensão uuid-ossp foi criada

### Erro de conexão na Vercel
- Verifique se a DATABASE_URL está correta
- Confirme que a senha foi URL-encoded
- Teste a conexão localmente primeiro

### Usuário não foi criado
- Execute manualmente o INSERT do usuário MASTER
- Verifique se não há conflito de email

---

## Próximos Passos

Após configurar:
1. ✅ Teste o login
2. ✅ Verifique se o role é MASTER
3. ✅ Teste criação de empresas
4. ✅ Migre dados do D1 se necessário (opcional)
