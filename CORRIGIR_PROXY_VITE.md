# 🔧 Corrigir Erro de Proxy do Vite

## ❌ Erro Identificado

```
http proxy error: /api/pncp-proxy
AggregateError [ECONNREFUSED]
```

## 🔍 Causa

O Vite estava configurado para fazer proxy de **todos** os endpoints `/api/*` para a porta **3002** (API Express), mas os endpoints `pncp-proxy` e `bll-proxy` estão nas **Netlify Functions** (porta 8888).

## ✅ Correção Aplicada

Atualizado `apps/web/vite.config.js` para:

```javascript
proxy: {
  // Netlify Functions (PNCP, BLL, etc)
  '/api/pncp-proxy': {
    target: 'http://localhost:8888/.netlify/functions',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ''),
    secure: false
  },
  '/api/bll-proxy': {
    target: 'http://localhost:8888/.netlify/functions',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ''),
    secure: false
  },
  // API Express (outros endpoints)
  '/api': {
    target: 'http://localhost:3002',
    changeOrigin: true,
    secure: false
  }
}
```

## 🚀 Como Aplicar

### Passo 1: Parar o Vite

No terminal onde o Vite está rodando, pressione:
```
Ctrl + C
```

### Passo 2: Reiniciar o Vite

```bash
cd apps/web
npm run dev
```

Ou se estiver usando o comando raiz:
```bash
npm run dev
```

### Passo 3: Testar

1. Acesse: http://localhost:5173/b2g-portal-busca
2. Faça uma busca
3. Verifique se não há mais erros de proxy

## 🔍 Verificar se Está Funcionando

### 1. Backend (Netlify Dev) rodando?
```bash
lsof -i :8888
```

Deve mostrar processo `node` rodando.

### 2. Frontend (Vite) rodando?
```bash
lsof -i :5173
```

Deve mostrar processo `node` rodando.

### 3. Testar endpoint diretamente
```bash
# Testar Netlify Function
curl "http://localhost:8888/.netlify/functions/pncp-proxy?dataFinal=20260417&codigoModalidadeContratacao=6&pagina=1&tamanhoPagina=5"

# Testar via proxy do Vite
curl "http://localhost:5173/api/pncp-proxy?dataFinal=20260417&codigoModalidadeContratacao=6&pagina=1&tamanhoPagina=5"
```

## 📊 Arquitetura Atual

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (Vite) - Porta 5173                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    ┌───────┴───────┐
                    │               │
        /api/pncp-proxy      /api/outros
        /api/bll-proxy              │
                    │               │
                    ↓               ↓
┌─────────────────────────┐  ┌──────────────────┐
│ Netlify Functions       │  │ API Express      │
│ Porta 8888              │  │ Porta 3002       │
│                         │  │                  │
│ - pncp-proxy            │  │ - /api/auth      │
│ - bll-proxy             │  │ - /api/clients   │
│ - health                │  │ - /api/users     │
│ - etc                   │  │ - etc            │
└─────────────────────────┘  └──────────────────┘
```

## ⚠️ Importante

### Dois Backends Rodando

Você precisa ter **DOIS** processos rodando:

1. **Netlify Dev** (porta 8888)
   ```bash
   npm run dev:api
   # ou
   netlify dev
   ```

2. **Vite** (porta 5173)
   ```bash
   cd apps/web
   npm run dev
   ```

### Ou Usar Comando Único

Se tiver configurado no `package.json`:
```bash
npm run dev
```

Isso inicia ambos simultaneamente.

## 🔧 Troubleshooting

### Erro: "ECONNREFUSED :8888"

**Causa**: Netlify Dev não está rodando

**Solução**:
```bash
npm run dev:api
# ou
netlify dev
```

### Erro: "ECONNREFUSED :3002"

**Causa**: API Express não está rodando

**Solução**:
```bash
cd apps/api
npm run dev
```

### Erro: "Cannot GET /api/pncp-proxy"

**Causa**: Proxy não está configurado corretamente

**Solução**:
1. Verifique se `vite.config.js` foi atualizado
2. Reinicie o Vite (Ctrl+C e `npm run dev`)

### Erro: Ainda não funciona

**Solução**:
1. Pare todos os processos
2. Limpe cache:
   ```bash
   rm -rf apps/web/node_modules/.vite
   ```
3. Reinicie tudo:
   ```bash
   npm run dev
   ```

## ✅ Checklist

- [x] Arquivo `vite.config.js` atualizado
- [ ] Vite reiniciado
- [ ] Netlify Dev rodando (porta 8888)
- [ ] Teste de busca realizado
- [ ] Sem erros de proxy no console

## 📝 Próximos Passos

1. Reinicie o Vite
2. Teste a busca
3. Verifique se não há erros
4. Se funcionar, faça commit:
   ```bash
   git add apps/web/vite.config.js
   git commit -m "fix: corrigir proxy do Vite para Netlify Functions"
   git push origin main
   ```

---

**Desenvolvido com ❤️ para facilitar seu desenvolvimento**

Última atualização: 16 de Abril de 2026
