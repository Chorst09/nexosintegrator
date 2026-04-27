# 🔧 Corrigir Deploy no Vercel

## ❌ Erro Identificado

```
Implantação bloqueada

A implantação foi bloqueada porque a chorstconsult não possui 
uma conta Vercel vinculada à sua conta GitHub.
```

## ✅ Soluções Disponíveis

### Opção 1: Vincular Conta Vercel ao GitHub (Recomendado)

#### Passo 1: Criar/Acessar Conta Vercel
1. Acesse: https://vercel.com/signup
2. Clique em **"Continue with GitHub"**
3. Autorize o Vercel a acessar sua conta GitHub

#### Passo 2: Importar Projeto
1. No dashboard do Vercel, clique em **"Add New..."** → **"Project"**
2. Selecione o repositório: `Chorst09/nexoscrm`
3. Configure o projeto:
   ```
   Framework Preset: Vite
   Root Directory: apps/web
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

#### Passo 3: Configurar Variáveis de Ambiente
Adicione as mesmas variáveis do `.env`:
- `DATABASE_URL`
- `JWT_SECRET`
- `MERCADOPAGO_ACCESS_TOKEN`
- `BLL_EMAIL` (opcional)
- `BLL_PASSWORD` (opcional)
- etc.

#### Passo 4: Deploy
Clique em **"Deploy"** e aguarde.

---

### Opção 2: Usar Netlify em Vez de Vercel

O projeto já está configurado para Netlify e funciona perfeitamente!

#### Passo 1: Criar Conta Netlify
1. Acesse: https://app.netlify.com/signup
2. Clique em **"Sign up with GitHub"**
3. Autorize o Netlify

#### Passo 2: Importar Projeto
1. Clique em **"Add new site"** → **"Import an existing project"**
2. Escolha **"GitHub"**
3. Selecione o repositório: `Chorst09/nexoscrm`
4. Configure:
   ```
   Build command: npm run build:web
   Publish directory: apps/web/dist
   Functions directory: netlify/functions
   ```

#### Passo 3: Configurar Variáveis de Ambiente
Em **Site settings** → **Environment variables**, adicione:
- `DATABASE_URL`
- `JWT_SECRET`
- `MERCADOPAGO_ACCESS_TOKEN`
- `BLL_EMAIL` (opcional)
- `BLL_PASSWORD` (opcional)

#### Passo 4: Deploy
O deploy acontece automaticamente após configuração.

---

### Opção 3: Remover Integração Vercel

Se você não quer usar Vercel, pode remover a configuração:

```bash
# Remover pasta .vercel
rm -rf .vercel

# Remover arquivo vercel.json (se existir)
rm -f vercel.json

# Commit
git add .
git commit -m "chore: remover configuração Vercel"
git push origin main
```

---

## 🎯 Recomendação

**Use Netlify** porque:
- ✅ Projeto já está 100% configurado para Netlify
- ✅ Suporta Netlify Functions (serverless)
- ✅ Build otimizado já configurado
- ✅ Redirects e headers já configurados
- ✅ Mais fácil de configurar

**Vercel** também funciona, mas requer:
- ⚠️ Reconfigurar estrutura de funções serverless
- ⚠️ Ajustar caminhos de build
- ⚠️ Migrar de Netlify Functions para Vercel Functions

---

## 🚀 Passo a Passo Rápido (Netlify)

### 1. Criar Conta
```
https://app.netlify.com/signup
→ Sign up with GitHub
```

### 2. Importar Projeto
```
Add new site → Import an existing project
→ GitHub → Chorst09/nexoscrm
```

### 3. Configurar Build
```
Build command: npm run build:web
Publish directory: apps/web/dist
Functions directory: netlify/functions
```

### 4. Adicionar Variáveis de Ambiente
```
Site settings → Environment variables
→ Adicionar todas as variáveis do .env
```

### 5. Deploy
```
Automático após configuração!
```

### 6. Acessar Site
```
https://seu-site.netlify.app
```

---

## 📊 Comparação: Netlify vs Vercel

| Recurso | Netlify | Vercel |
|---------|---------|--------|
| **Configuração atual** | ✅ Pronta | ❌ Precisa ajustar |
| **Serverless Functions** | ✅ Netlify Functions | ⚠️ Vercel Functions (diferente) |
| **Build** | ✅ Configurado | ⚠️ Precisa configurar |
| **Redirects** | ✅ netlify.toml | ⚠️ vercel.json |
| **Facilidade** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 🔧 Se Escolher Vercel

### Ajustes Necessários

1. **Converter Netlify Functions para Vercel Functions**
   ```bash
   # Mover de:
   netlify/functions/*.js
   
   # Para:
   api/*.js
   ```

2. **Criar vercel.json**
   ```json
   {
     "buildCommand": "npm run build:web",
     "outputDirectory": "apps/web/dist",
     "framework": "vite",
     "rewrites": [
       { "source": "/api/:path*", "destination": "/api/:path*" },
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```

3. **Ajustar package.json**
   ```json
   {
     "scripts": {
       "build": "npm run build:web",
       "vercel-build": "npm run build:web"
     }
   }
   ```

---

## ✅ Minha Recomendação Final

**Use Netlify!**

Motivos:
1. Projeto já está 100% configurado
2. Não precisa fazer nenhuma alteração
3. Deploy em 5 minutos
4. Suporte completo a serverless functions
5. Documentação já criada

---

## 📞 Próximos Passos

### Se escolher Netlify:
1. Acesse: https://app.netlify.com/signup
2. Siga o "Passo a Passo Rápido" acima
3. Pronto! ✅

### Se escolher Vercel:
1. Vincule conta GitHub ao Vercel
2. Aplique os "Ajustes Necessários" acima
3. Configure e faça deploy

### Se não quiser nenhum:
1. Execute `rm -rf .vercel`
2. Faça commit e push
3. Use apenas desenvolvimento local

---

**Tempo estimado**:
- Netlify: 5-10 minutos ⚡
- Vercel: 20-30 minutos 🔧
- Remover: 2 minutos 🗑️

---

**Desenvolvido com ❤️ para facilitar seu deploy**

Última atualização: 16 de Abril de 2026
