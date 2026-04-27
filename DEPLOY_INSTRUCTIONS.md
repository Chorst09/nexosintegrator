# Instruções de Deploy no Vercel

## 🚀 Opção 1: Deploy da pasta apps/web (Recomendado)

1. No terminal, navegue até a pasta do frontend:
   ```bash
   cd apps/web
   ```

2. Faça o deploy usando o Vercel CLI:
   ```bash
   vercel --prod
   ```

3. Quando perguntado sobre as configurações:
   - **Set up and deploy**: Yes
   - **Which scope**: Escolha sua conta
   - **Link to existing project**: No (para novo projeto)
   - **Project name**: crm-comercial (ou o nome que preferir)
   - **In which directory is your code located**: ./
   - **Want to override the settings**: No

## 🌐 Opção 2: Deploy via Dashboard do Vercel

1. Acesse https://vercel.com/dashboard
2. Clique em "New Project"
3. Conecte seu repositório GitHub
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
   - **Node.js Version**: 18.x

## 🔧 Opção 3: Deploy Manual (Se as outras falharem)

1. Faça build local:
   ```bash
   cd apps/web
   npm install
   npm run build
   ```

2. Faça upload da pasta `dist` diretamente no Vercel

## ⚠️ Troubleshooting

Se ainda houver erro "vite: comando não encontrado":

1. **Verifique a versão do Node.js**: O Vercel deve usar Node.js 18+
2. **Limpe o cache**: No dashboard do Vercel, vá em Settings > Functions e limpe o cache
3. **Force redeploy**: Faça um novo commit e push
4. **Verifique as dependências**: Certifique-se que vite está em dependencies, não devDependencies

## 📝 Configurações importantes

- ✅ Vite está em `dependencies` (necessário para build no Vercel)
- ✅ Node.js 18 especificado no `.nvmrc`
- ✅ Configuração correta no `vercel.json`
- ✅ SPA routing configurado

## 🔗 Configuração da API

⚠️ **IMPORTANTE**: Este deploy é apenas para o frontend. Para a API funcionar em produção:

1. **Deploy da API** em Railway, Render, ou Heroku
2. **Atualizar URL da API** em `apps/web/src/config/api.js`
3. **Configurar CORS** na API para aceitar requests do domínio do Vercel

## 🌍 Variáveis de Ambiente no Vercel

No dashboard do Vercel, adicione:
- `VITE_API_URL`: URL da sua API em produção (ex: https://sua-api.railway.app/api)