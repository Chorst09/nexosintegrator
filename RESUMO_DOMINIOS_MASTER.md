# Resumo: Configuração de Usuários MASTER nos Domínios

## 📋 Domínios e Status

| Domínio | Usuário | Status Atual | Ação Necessária |
|---------|---------|--------------|-----------------|
| **crmautomatizadob2g.vercel.app** | admin@crm.com | ✅ MASTER | Nenhuma (já configurado) |
| **crmcomercial.chorstconsult.com.br** | admin@crm.com | ⚠️ ADMIN | Executar `UPDATE_ADMIN_TO_MASTER_D1.sql` |
| **nexos.chorstconsult.com.br** | admin@crm.com | ⚠️ ADMIN ou não existe | Executar `UPDATE_NEXOS_ADMIN_TO_MASTER_D1.sql` |

## 🚀 Instruções por Domínio

### 1. crmautomatizadob2g.vercel.app
✅ **Já está configurado como MASTER**
- Nenhuma ação necessária
- Usuário: admin@crm.com
- Role: MASTER

### 2. crmcomercial.chorstconsult.com.br
⚠️ **Precisa atualizar de ADMIN para MASTER**

**Via Cloudflare Dashboard:**
1. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Vá em **Workers & Pages** → **D1**
3. Selecione o banco de dados do **crmcomercial**
4. Clique em **Console**
5. Execute o script `UPDATE_ADMIN_TO_MASTER_D1.sql`

**Via Wrangler CLI:**
```bash
wrangler d1 execute <DATABASE_CRMCOMERCIAL> --file=UPDATE_ADMIN_TO_MASTER_D1.sql
```

### 3. nexos.chorstconsult.com.br
⚠️ **Precisa atualizar de ADMIN para MASTER**

**Via Cloudflare Dashboard:**
1. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Vá em **Workers & Pages** → **D1**
3. Selecione o banco de dados do **nexos**
4. Clique em **Console**
5. Execute o script `UPDATE_NEXOS_ADMIN_TO_MASTER_D1.sql`

**Via Wrangler CLI:**
```bash
wrangler d1 execute <DATABASE_NEXOS> --file=UPDATE_NEXOS_ADMIN_TO_MASTER_D1.sql
```

## 📝 Script SQL Único (Para Qualquer Domínio)

Se preferir, você pode executar este comando SQL diretamente em qualquer banco:

```sql
UPDATE User 
SET 
  role = 'MASTER',
  tenantCompanyId = NULL,
  accessB2B = 1,
  accessB2G = 1,
  accessPreSales = 1,
  quota = 999999
WHERE email = 'admin@crm.com';
```

## ✅ Verificar se Funcionou

Após executar o script em cada domínio, verifique:

```sql
SELECT id, name, email, role, tenantCompanyId 
FROM User 
WHERE email = 'admin@crm.com';
```

Deve retornar:
- **role**: MASTER
- **tenantCompanyId**: NULL (ou vazio)

## 🔄 Após Atualizar em Cada Domínio

1. Faça **logout** do sistema
2. Faça **login** novamente com admin@crm.com
3. Vá em **Administração** → **Gestão de Empresas**
4. Você verá o botão **"➕ Nova Empresa"**
5. Poderá cadastrar empresas manualmente!

## 📊 Diferenças entre ADMIN e MASTER

| Permissão | ADMIN | MASTER |
|-----------|-------|--------|
| Gestão de Usuários | ✅ | ✅ |
| Gestão de Empresas | ❌ | ✅ |
| Licenciamento | ❌ | ✅ |
| Políticas por Role | ❌ | ✅ |
| Acesso Global (sem empresa) | ❌ | ✅ |
| Cadastro Manual de Empresas | ❌ | ✅ |

## 🔑 Credenciais

- **Email**: admin@crm.com
- **Senha**: (sua senha atual - não será alterada)

## 📁 Arquivos Disponíveis

1. `CREATE_MASTER_USER_D1.sql` - Criar novo usuário MASTER
2. `UPDATE_ADMIN_TO_MASTER_D1.sql` - Atualizar para MASTER (crmcomercial)
3. `UPDATE_NEXOS_ADMIN_TO_MASTER_D1.sql` - Atualizar para MASTER (nexos)
4. `INSTRUCOES_D1.md` - Instruções gerais para D1
5. `INSTRUCOES_UPDATE_MASTER.md` - Instruções de atualização
6. `RESUMO_DOMINIOS_MASTER.md` - Este arquivo (resumo geral)

## 🆘 Troubleshooting

### Problema: Ainda aparece como ADMIN após atualizar
**Solução:**
1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Faça logout e login novamente
3. Verifique se executou o script no banco correto

### Problema: Erro 500 ao acessar Gestão de Empresas
**Solução:**
1. Verifique se o role está como MASTER no banco
2. Verifique se tenantCompanyId está NULL
3. Faça logout e login novamente

### Problema: Não vê a tab "Gestão de Empresas"
**Solução:**
1. Verifique se o role está como MASTER
2. Limpe o cache do navegador
3. Faça logout e login novamente

## 📞 Suporte

Se após seguir todos os passos ainda houver problemas:
1. Verifique os logs do console do navegador (F12)
2. Verifique se está no domínio correto
3. Confirme que o banco de dados está correto
