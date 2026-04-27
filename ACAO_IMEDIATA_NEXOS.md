# 🚀 Ação Imediata: Configurar Nexos

## O que foi feito até agora
✅ Branch `production-nexos` atualizada com commit c2d416f (correções de login)  
✅ Push realizado para GitHub  
✅ Scripts SQL criados para atualizar banco D1  
✅ Documentação completa fornecida  

## O que você precisa fazer AGORA

### 1️⃣ Configurar Branch na Vercel (2 minutos)

1. Acesse: https://vercel.com/dashboard
2. Abra o projeto: **nexos.chorstconsult.com.br**
3. Vá em: **Settings** → **Git**
4. Em **Production Branch**, altere para: `production-nexos`
5. Clique em **Save**
6. Aguarde o deploy automático iniciar

### 2️⃣ Atualizar Usuário no Banco D1 (3 minutos)

1. Acesse: https://dash.cloudflare.com/
2. Vá em: **Workers & Pages** → **D1**
3. Selecione o banco do **nexos**
4. Clique em **Console**
5. Cole e execute este SQL:

```sql
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

6. Verifique se retornou: `1 row affected`

### 3️⃣ Testar Login (1 minuto)

1. Aguarde o deploy da Vercel terminar (status "Ready")
2. Acesse: https://nexos.chorstconsult.com.br
3. Faça login com:
   - **Email**: chorstconsult@gmail.com
   - **Senha**: admin123
4. Verifique se consegue acessar
5. Vá em **Administração** → deve ver **Gestão de Empresas**

## ✅ Checklist Rápido

- [ ] Vercel: Branch production-nexos configurada
- [ ] Vercel: Deploy concluído (status Ready)
- [ ] D1: Script UPDATE executado (1 row affected)
- [ ] Login: Acesso com chorstconsult@gmail.com funcionando
- [ ] Admin: Tab "Gestão de Empresas" visível

## 🆘 Se algo der errado

### Erro 401 no login
→ Verifique se o deploy foi concluído  
→ Execute o script SQL novamente no D1  
→ Limpe o cache do navegador (Ctrl+Shift+R)

### Branch não aparece na Vercel
→ Aguarde 30 segundos e recarregue a página  
→ Verifique se a branch existe: `git branch -r | grep nexos`

### Deploy não inicia
→ Force manualmente: Deployments → ... → Redeploy

## 📞 Resumo dos 3 Domínios

| Domínio | Usuário | Senha | Status |
|---------|---------|-------|--------|
| crmautomatizadob2g.vercel.app | admin@crm.com | Double@@2026 | ✅ OK |
| crmcomercial.chorstconsult.com.br | admin@crm.com | admin123 | ✅ OK |
| nexos.chorstconsult.com.br | chorstconsult@gmail.com | admin123 | ⏳ Configurar |

## 📚 Documentação Completa

Para mais detalhes, consulte:
- `INSTRUCOES_NEXOS_LOGIN.md` - Instruções passo a passo
- `CONFIGURAR_VERCEL_NEXOS.md` - Detalhes da configuração Vercel
- `RESUMO_CONFIGURACAO_MASTER_COMPLETO.md` - Resumo completo do projeto

---

**Tempo estimado total: 6 minutos** ⏱️
