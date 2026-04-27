# 🚀 Deploy no Vercel - CRM Comercial

## ⚠️ Atualizacao para Cloudflare D1

Para usar Vercel + Cloudflare D1 com este repositorio, veja o guia:

- `MIGRACAO_VERCEL_D1.md`

Resumo rapido:
- O backend atual em Prisma (`apps/api`) segue PostgreSQL.
- Para D1, use API externa (Cloudflare Workers + D1) e configure proxy na Vercel com `EXTERNAL_API_BASE_URL`.

## ✅ Correções Implementadas

O erro `vite: comando não encontrado` foi corrigido com as seguintes alterações:

### 1. **Movido Vite para Dependencies**
- Movido `vite` de `devDependencies` para `dependencies` no `apps/web/package.json`
- Isso garante que o Vite esteja disponível durante o build no Vercel

### 2. **Configuração do Vercel Otimizada**
- Criado `vercel.json` na raiz do projeto
- Configurado para usar o monorepo corretamente
- Definido comandos de instalação e build apropriados

### 3. **Configuração do Node.js**
- Adicionado `.nvmrc` com Node.js 18 para compatibilidade
- Configurado build otimizado no `vite.config.js`

### 4. **Scripts de Build Atualizados**
- Script `build` na raiz executa o build do frontend
- Script `install:all` instala dependências de ambos os projetos

## 📋 Instruções para Deploy

### **Opção 1: Deploy Automático (Recomendado)**

1. **Conecte seu repositório ao Vercel:**
   - Acesse [vercel.com](https://vercel.com)
   - Clique em "New Project"
   - Conecte seu repositório GitHub

2. **Configurações automáticas:**
   - O Vercel detectará automaticamente as configurações do `vercel.json`
   - Build Command: `npm run build`
   - Install Command: `npm run install:all`
   - Output Directory: `apps/web/dist`

3. **Deploy:**
   - Clique em "Deploy"
   - O Vercel fará o build automaticamente

### **Opção 2: Deploy Manual**

1. **Build local:**
   ```bash
   npm run install:all
   npm run build
   ```

2. **Deploy da pasta dist:**
   ```bash
   cd apps/web
   npx vercel --prod
   ```

## 🔧 Configurações Importantes

### **Variáveis de Ambiente**
Configure no Vercel Dashboard:
- `VITE_API_URL`: URL da sua API (se diferente de localhost)

### **Domínio Personalizado**
- Configure seu domínio personalizado no Vercel Dashboard
- Atualize as URLs da API no frontend se necessário

### **Monitoramento**
- Verifique os logs de build no Vercel Dashboard
- Configure alertas para falhas de deploy

## ✅ Verificações Pós-Deploy

1. **Teste o frontend:**
   - Acesse a URL do Vercel
   - Verifique se todas as páginas carregam
   - Teste o login com `admin@crm.com / admin123`

2. **Teste as funcionalidades:**
   - Dashboard com gráficos
   - Oportunidades (Kanban)
   - Propostas e cotações
   - Todas as outras páginas

3. **Verifique o console:**
   - Abra F12 no navegador
   - Verifique se não há erros no console
   - Confirme que as requisições para API estão funcionando

## 🚨 Troubleshooting

### **Se ainda houver erro de build:**

1. **Limpe o cache do Vercel:**
   - No dashboard, vá em Settings → Functions
   - Clique em "Clear Cache"

2. **Verifique as versões:**
   - Node.js: 18.x (definido no .nvmrc)
   - Vite: 7.3.0 (nas dependencies)

3. **Logs detalhados:**
   - Verifique os logs completos no Vercel Dashboard
   - Procure por erros específicos

### **Se a API não funcionar:**

1. **Configure variáveis de ambiente:**
   - Atualize URLs da API no frontend
   - Configure CORS na API para aceitar o domínio do Vercel

2. **Deploy da API separadamente:**
   - A API pode precisar ser deployada em outro serviço
   - Configure as URLs corretas no frontend

## 📁 Estrutura de Arquivos Modificados

```
├── vercel.json                 # Configuração do Vercel (NOVO)
├── apps/web/
│   ├── .nvmrc                 # Versão do Node.js (NOVO)
│   ├── package.json           # Vite movido para dependencies
│   ├── vercel.json           # Configuração específica do web
│   └── vite.config.js        # Build otimizado
└── package.json              # Scripts de build atualizados
```

## 🎉 Resultado

Após essas correções, o deploy no Vercel deve funcionar perfeitamente:
- ✅ Build sem erros
- ✅ Frontend funcionando
- ✅ Todas as páginas carregando
- ✅ Interface moderna e responsiva

O CRM está pronto para produção! 🚀
