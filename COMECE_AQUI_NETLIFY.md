# 🎯 COMECE AQUI - Deploy no Netlify + Supabase

## ✅ O Que Foi Feito

Seu projeto NexosCRM foi **completamente reestruturado** para rodar no Netlify com Supabase. Tudo está pronto para deploy!

---

## 🚀 Opção 1: Deploy Rápido (6 minutos)

### Passo 1: Supabase (2 min)
1. Acesse [supabase.com](https://supabase.com)
2. Crie novo projeto: `nexoscrm`
3. Copie as connection strings

### Passo 2: Netlify (4 min)
1. Acesse [app.netlify.com](https://app.netlify.com)
2. Import from Git → Selecione este repositório
3. Configure:
   - Base: `apps/web`
   - Build: `npm run build`
   - Publish: `apps/web/dist`
4. Adicione variáveis de ambiente:
   ```
   DATABASE_URL=postgresql://...@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require
   DIRECT_URL=postgresql://...@db.seu-project-ref.supabase.co:5432/postgres?sslmode=require
   JWT_SECRET=gere-um-hash-aleatorio
   AUTH_MASTER_KEY=codigo-recuperacao-123
   MASTER_EMAILS=seu-email@exemplo.com
   NODE_ENV=production
   ```
5. Deploy!

**Pronto!** Seu CRM está no ar! 🎉

📖 **Guia Detalhado**: [DEPLOY_NETLIFY_SUPABASE.md](./DEPLOY_NETLIFY_SUPABASE.md)

---

## 💻 Opção 2: Testar Localmente Primeiro (5 min)

```bash
# 1. Setup automático
./setup.sh

# 2. Editar .env com suas credenciais do Supabase

# 3. Rodar migrations
cd netlify/functions
npx prisma migrate deploy
cd ../..

# 4. Iniciar
npm run dev
```

**Acesse**: http://localhost:5173

📖 **Guia Detalhado**: [INICIO_RAPIDO.md](./INICIO_RAPIDO.md)

---

## 📁 Estrutura do Projeto

```
✅ netlify/functions/     # API Serverless (3 APIs prontas)
✅ apps/web/              # Frontend React
✅ netlify.toml           # Configuração Netlify
✅ .env.example           # Template de variáveis
✅ Documentação completa  # 6 guias detalhados
```

---

## 📚 Documentação Disponível

| Arquivo | Quando Usar |
|---------|-------------|
| **[RESUMO_EXECUTIVO.md](./RESUMO_EXECUTIVO.md)** | 📊 Visão geral executiva |
| **[INICIO_RAPIDO.md](./INICIO_RAPIDO.md)** | ⚡ Setup rápido local |
| **[DEPLOY_NETLIFY_SUPABASE.md](./DEPLOY_NETLIFY_SUPABASE.md)** | 🚀 Deploy em produção |
| **[MIGRACAO_APIS.md](./MIGRACAO_APIS.md)** | 🔧 Migrar APIs restantes |
| **[COMANDOS_UTEIS_NETLIFY.md](./COMANDOS_UTEIS_NETLIFY.md)** | 🛠️ Referência de comandos |
| **[README.md](./README.md)** | 📖 Documentação completa |

---

## ✅ APIs Prontas

- ✅ `/api/auth/*` - Autenticação (login, registro, recuperação)
- ✅ `/api/clients/*` - CRUD de clientes
- ✅ `/api/health` - Health check

**27 APIs restantes** para migrar (guia disponível)

---

## 🎯 Próximos Passos

### Agora (5 minutos)
1. Escolha: Deploy direto OU Testar local
2. Siga o guia correspondente
3. Crie seu primeiro usuário

### Depois (quando quiser)
1. Migrar APIs restantes
2. Personalizar interface
3. Configurar integrações

---

## 💰 Custos

**Plano Gratuito**: R$ 0/mês
- Netlify: 100GB bandwidth + 125k functions
- Supabase: 500MB database + 1GB storage

**Suficiente para começar!** ✅

---

## 🆘 Precisa de Ajuda?

1. **Leia a documentação** (6 guias disponíveis)
2. **Veja comandos úteis**: [COMANDOS_UTEIS_NETLIFY.md](./COMANDOS_UTEIS_NETLIFY.md)
3. **Abra uma issue** no GitHub

---

## 🎉 Está Tudo Pronto!

✅ Código reestruturado
✅ Configuração completa
✅ Documentação detalhada
✅ Scripts de automação
✅ 3 APIs funcionais

**Escolha uma opção acima e comece!** 🚀

---

**Dúvidas?** Leia: [RESUMO_EXECUTIVO.md](./RESUMO_EXECUTIVO.md)
