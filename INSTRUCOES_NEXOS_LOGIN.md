# Instruções para Configurar Login MASTER no Nexos

## Status Atual
- ✅ Branch `production-nexos` atualizada para commit 07a23d3 (com correções de login)
- ✅ Push forçado realizado
- ⏳ Aguardando deploy automático da Vercel
- ⚠️ Usuário chorstconsult@gmail.com existe mas senha pode estar incorreta

## Passo 1: Verificar Deploy da Vercel

1. Acesse: https://vercel.com/dashboard
2. Localize o projeto **nexos.chorstconsult.com.br**
3. Verifique se há um deploy em andamento ou recente
4. Aguarde até que o status seja "Ready" (verde)

## Passo 2: Verificar Usuário no Banco D1

Execute no Cloudflare D1 (banco do nexos):

```sql
-- Arquivo: CHECK_USER_NEXOS.sql
SELECT 
  id,
  email,
  name,
  role,
  company_id,
  active,
  substr(password, 1, 20) || '...' as password_hash_preview
FROM users 
WHERE email = 'chorstconsult@gmail.com';
```

**Como executar:**
1. Acesse: https://dash.cloudflare.com/
2. Vá em "Workers & Pages" > "D1"
3. Selecione o banco do nexos
4. Clique em "Console"
5. Cole o SQL acima e execute

## Passo 3: Atualizar Senha (se necessário)

Se o login não funcionar, execute este script no D1:

```sql
-- Arquivo: UPDATE_CHORSTCONSULT_PASSWORD_NEXOS.sql
UPDATE users 
SET 
  password = '$2b$10$lTKAs0VqeitQZRE5/t5ZtuLnZ83pcXURoJAmtBgB/zUlqaa4BnvTw.',
  role = 'MASTER',
  company_id = NULL,
  active = 1,
  accessB2B = 1,
  accessB2G = 1,
  accessPreSales = 1,
  quota = 999999
WHERE email = 'chorstconsult@gmail.com';
```

Isso configurará a senha como: **admin123**

## Passo 4: Testar Login

1. Acesse: https://nexos.chorstconsult.com.br
2. Faça login com:
   - Email: **chorstconsult@gmail.com**
   - Senha: **admin123**
3. Verifique se consegue acessar
4. Vá em "Administração" e verifique se vê a tab "Gestão de Empresas"

## Passo 5: Alterar Senha (opcional)

Se quiser usar a senha <ADMIN_PASSWORD>, execute no D1:

```sql
UPDATE users 
SET password = '$2a$10$lEFTEG7UgssVpXdXZateveMCXj.sptPgchR3NPZezkDaRZRIUACBq'
WHERE email = 'chorstconsult@gmail.com';
```

## Resumo dos 3 Domínios

| Domínio | Usuário MASTER | Senha | Status |
|---------|---------------|-------|--------|
| crmautomatizadob2g.vercel.app | admin@crm.com | <ADMIN_PASSWORD> | ✅ Funcionando |
| crmcomercial.chorstconsult.com.br | admin@crm.com | admin123 | ✅ Funcionando |
| nexos.chorstconsult.com.br | chorstconsult@gmail.com | admin123 | ⏳ Aguardando teste |

## Troubleshooting

### Erro 401 ao fazer login
- Verifique se o deploy da Vercel foi concluído
- Confirme que a branch `production-nexos` está configurada no projeto Vercel
- Execute o script de atualização de senha no D1

### Erro "FrameDoesNotExistError"
- Esses erros são de extensões do navegador (ex: LastPass, Grammarly)
- Podem ser ignorados - não afetam o funcionamento do sistema
- Se quiser eliminar, desative extensões do navegador temporariamente

### Tab "Gestão de Empresas" não aparece
- Confirme que o usuário tem role='MASTER' no banco
- Limpe o cache do navegador (Ctrl+Shift+R ou Cmd+Shift+R)
- Faça logout e login novamente

## Arquivos Criados

- `CHECK_USER_NEXOS.sql` - Verificar usuário no D1
- `UPDATE_CHORSTCONSULT_PASSWORD_NEXOS.sql` - Atualizar senha e permissões
- `INSTRUCOES_NEXOS_LOGIN.md` - Este arquivo
