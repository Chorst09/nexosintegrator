# 🛠️ Comandos Úteis - Netlify + Supabase

Referência rápida de comandos para desenvolvimento e deploy.

---

## 📦 Instalação e Setup

```bash
# Setup completo automático
./setup.sh

# Instalar dependências manualmente
npm install                              # Raiz
cd apps/web && npm install && cd ../..   # Frontend
cd netlify/functions && npm install && cd ../..  # Functions

# Instalar Netlify CLI globalmente
npm install -g netlify-cli

# Login no Netlify
netlify login
```

---

## 🚀 Desenvolvimento

```bash
# Iniciar ambiente completo
npm run dev

# Apenas frontend (Vite)
npm run dev:web
# Acessa: http://localhost:5173

# Apenas API (Netlify Dev)
npm run dev:api
# Acessa: http://localhost:8888

# Netlify Dev (alternativa)
netlify dev
# Acessa: http://localhost:8888
```

---

## 🗄️ Prisma / Banco de Dados

```bash
# Gerar Prisma Client
npm run prisma:generate
# Ou:
cd netlify/functions && npx prisma generate

# Rodar migrations
npm run prisma:migrate
# Ou:
cd netlify/functions && npx prisma migrate deploy

# Criar nova migration
cd netlify/functions
npx prisma migrate dev --name nome_da_migration

# Abrir Prisma Studio (GUI do banco)
npm run prisma:studio
# Ou:
cd netlify/functions && npx prisma studio
# Acessa: http://localhost:5555

# Reset do banco (CUIDADO!)
cd netlify/functions
npx prisma migrate reset

# Seed do banco
cd netlify/functions
npx prisma db seed

# Validar schema
cd netlify/functions
npx prisma validate

# Formatar schema
cd netlify/functions
npx prisma format
```

---

## 🏗️ Build

```bash
# Build do frontend
npm run build
# Ou:
cd apps/web && npm run build

# Preview do build
cd apps/web && npm run preview

# Build das functions (automático no deploy)
# Netlify faz isso automaticamente
```

---

## 🚢 Deploy

```bash
# Deploy de teste (draft)
netlify deploy

# Deploy para produção
netlify deploy --prod

# Deploy com build
netlify deploy --build --prod

# Ver status do último deploy
netlify status

# Ver logs do deploy
netlify logs

# Abrir site no navegador
netlify open:site

# Abrir admin do Netlify
netlify open:admin
```

---

## 🔍 Debug e Logs

```bash
# Ver logs das functions em tempo real
netlify logs --live

# Ver logs de uma function específica
netlify logs --function=auth

# Ver logs do último deploy
netlify logs

# Debug local com logs detalhados
DEBUG=* netlify dev

# Ver variáveis de ambiente
netlify env:list

# Testar function localmente
curl http://localhost:8888/.netlify/functions/health
```

---

## 🔐 Variáveis de Ambiente

```bash
# Listar variáveis
netlify env:list

# Adicionar variável
netlify env:set DATABASE_URL "postgresql://..."

# Remover variável
netlify env:unset DATABASE_URL

# Importar de arquivo .env
netlify env:import .env

# Clonar variáveis de outro site
netlify env:clone --from site-id
```

---

## 🧪 Testes

```bash
# Testar health check
curl http://localhost:8888/.netlify/functions/health

# Testar login
curl -X POST http://localhost:8888/.netlify/functions/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@exemplo.com","password":"senha123"}'

# Testar com autenticação
curl -H "Authorization: Bearer SEU_TOKEN" \
  http://localhost:8888/.netlify/functions/clients

# Testar POST
curl -X POST http://localhost:8888/.netlify/functions/clients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{"name":"Novo Cliente","contact":"João"}'
```

---

## 🔧 Netlify CLI - Comandos Úteis

```bash
# Inicializar site
netlify init

# Linkar site existente
netlify link

# Deslinkar site
netlify unlink

# Ver informações do site
netlify status

# Abrir dashboard
netlify open

# Ver builds
netlify builds

# Cancelar build
netlify builds:cancel

# Ver functions
netlify functions:list

# Criar nova function
netlify functions:create nome-da-function

# Invocar function localmente
netlify functions:invoke auth --payload '{"email":"test@test.com"}'

# Ver sites
netlify sites:list

# Deletar site (CUIDADO!)
netlify sites:delete
```

---

## 🗃️ Supabase CLI (Opcional)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Inicializar projeto
supabase init

# Linkar projeto
supabase link --project-ref seu-project-ref

# Ver status
supabase status

# Migrations
supabase db push
supabase db pull
supabase db reset

# Gerar types TypeScript
supabase gen types typescript --project-id seu-project-id > types/supabase.ts
```

---

## 🐛 Troubleshooting

```bash
# Limpar cache do Netlify
rm -rf .netlify

# Limpar node_modules
rm -rf node_modules apps/web/node_modules netlify/functions/node_modules
npm run install:all

# Regenerar Prisma Client
cd netlify/functions
rm -rf node_modules/.prisma
npx prisma generate

# Matar processos nas portas
lsof -ti:8888 | xargs kill -9  # Netlify Dev
lsof -ti:5173 | xargs kill -9  # Vite
lsof -ti:5555 | xargs kill -9  # Prisma Studio

# Ver processos rodando
lsof -i :8888
lsof -i :5173

# Verificar versão do Node
node -v

# Verificar versão do npm
npm -v

# Verificar versão do Netlify CLI
netlify --version

# Atualizar Netlify CLI
npm update -g netlify-cli
```

---

## 📊 Monitoramento

```bash
# Ver analytics
netlify analytics

# Ver bandwidth usage
netlify bandwidth

# Ver function invocations
netlify functions:list --json

# Ver logs em tempo real
netlify logs --live

# Ver logs de erro
netlify logs --level error
```

---

## 🔄 Git e Deploy Automático

```bash
# Configurar deploy automático
# 1. Conecte repositório no Netlify Dashboard
# 2. Cada push para main faz deploy automático

# Ver status do Git
git status

# Commit e push
git add .
git commit -m "Sua mensagem"
git push origin main

# Ver branches
git branch -a

# Criar branch de feature
git checkout -b feature/nova-funcionalidade

# Merge para main
git checkout main
git merge feature/nova-funcionalidade
git push origin main
```

---

## 🎯 Workflows Comuns

### Adicionar Nova Function

```bash
# 1. Criar arquivo
cp netlify/functions/clients.js netlify/functions/nova-api.js

# 2. Editar lógica
code netlify/functions/nova-api.js

# 3. Testar localmente
netlify dev

# 4. Testar endpoint
curl http://localhost:8888/.netlify/functions/nova-api

# 5. Commit e deploy
git add netlify/functions/nova-api.js
git commit -m "Add nova-api function"
git push origin main
```

### Atualizar Schema do Banco

```bash
# 1. Editar schema
code netlify/functions/prisma/schema.prisma

# 2. Criar migration
cd netlify/functions
npx prisma migrate dev --name adicionar_campo

# 3. Gerar client
npx prisma generate

# 4. Testar localmente
cd ../..
npm run dev

# 5. Deploy
git add .
git commit -m "Update database schema"
git push origin main
```

### Rollback de Deploy

```bash
# 1. Ver deploys
netlify builds

# 2. Fazer rollback via dashboard
netlify open:admin
# Ou via CLI (se disponível)
netlify rollback
```

---

## 📝 Aliases Úteis (Adicione ao ~/.bashrc ou ~/.zshrc)

```bash
# Aliases para desenvolvimento
alias ndev="npm run dev"
alias ndevw="npm run dev:web"
alias ndeva="npm run dev:api"

# Aliases para Prisma
alias pgen="cd netlify/functions && npx prisma generate && cd ../.."
alias pmig="cd netlify/functions && npx prisma migrate deploy && cd ../.."
alias pstudio="cd netlify/functions && npx prisma studio"

# Aliases para Netlify
alias ndeploy="netlify deploy --prod"
alias nlogs="netlify logs --live"
alias nopen="netlify open:site"

# Aliases para Git
alias gs="git status"
alias ga="git add ."
alias gc="git commit -m"
alias gp="git push origin main"
```

---

## 🔗 Links Úteis

- **Netlify Dashboard**: https://app.netlify.com
- **Supabase Dashboard**: https://app.supabase.com
- **Prisma Studio**: http://localhost:5555 (quando rodando)
- **Frontend Local**: http://localhost:5173
- **API Local**: http://localhost:8888/.netlify/functions

---

## 📚 Documentação

- [Netlify CLI Docs](https://docs.netlify.com/cli/get-started/)
- [Netlify Functions Docs](https://docs.netlify.com/functions/overview/)
- [Supabase Docs](https://supabase.com/docs)
- [Prisma Docs](https://www.prisma.io/docs)

---

💡 **Dica**: Salve este arquivo nos favoritos para referência rápida!
