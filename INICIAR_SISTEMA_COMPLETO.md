# 🚀 Como Iniciar o Sistema Completo

## ⚠️ Problema Identificado

O backend (Netlify Dev) **NÃO está rodando**. Por isso as buscas nos portais não funcionam.

## ✅ Solução: Iniciar Backend e Frontend

### Opção 1: Iniciar Tudo de Uma Vez (Recomendado)

```bash
# Na raiz do projeto
npm run dev
```

Este comando inicia:
- ✅ Backend (Netlify Dev) na porta 8888
- ✅ Frontend (Vite) na porta 5174

### Opção 2: Iniciar Separadamente

#### Terminal 1: Backend
```bash
npm run dev:api
```

#### Terminal 2: Frontend
```bash
npm run dev:web
```

## 🔍 Verificar se Está Funcionando

### 1. Verificar Backend (porta 8888)

```bash
curl http://localhost:8888/.netlify/functions/health
```

**Resposta esperada:**
```json
{"status":"ok","timestamp":"..."}
```

### 2. Verificar Frontend (porta 5174)

Abra no navegador: http://localhost:5174

### 3. Testar Endpoints de Busca

```bash
# Testar PNCP
curl "http://localhost:8888/.netlify/functions/pncp-proxy?dataFinal=20260416&codigoModalidadeContratacao=6&pagina=1&tamanhoPagina=5"

# Testar BLL
curl "http://localhost:8888/.netlify/functions/bll-proxy?objeto=software&pagina=1&tamanhoPagina=5"
```

## 📋 Passo a Passo Completo

### 1️⃣ Parar Processos Antigos (se houver)

```bash
# Parar processos nas portas 8888 e 5174
lsof -ti:8888 | xargs kill -9 2>/dev/null
lsof -ti:5174 | xargs kill -9 2>/dev/null
```

### 2️⃣ Instalar Dependências (se necessário)

```bash
# Raiz do projeto
npm install

# Backend
cd netlify/functions
npm install
cd ../..

# Frontend
cd apps/web
npm install
cd ../..
```

### 3️⃣ Iniciar o Sistema

```bash
npm run dev
```

**Aguarde até ver:**
```
◈ Server now ready on http://localhost:8888
◈ Functions server is listening on 8888

  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5174/
```

### 4️⃣ Acessar a Interface

1. Abra: http://localhost:5174/b2g-portal-busca
2. Clique na aba **"Ingestão"**
3. Configure suas credenciais do BLL
4. Volte para **"Resultados"**
5. Faça uma busca

## 🎯 Testar Busca nos Portais

### Passo 1: Configurar Credenciais

1. Acesse: http://localhost:5174/b2g-portal-busca
2. Clique na aba **"Ingestão"**
3. Preencha:
   - **Email**: seu-email@bllcompras.com
   - **Senha**: sua-senha
4. Clique em **"Salvar"**
5. Clique em **"Testar"**

### Passo 2: Fazer Busca

1. Volte para a aba **"Resultados"**
2. Preencha:
   - **Objeto**: software
   - **Estado**: PR (Paraná)
3. Clique em **"Buscar no PNCP + BLL"**

### Passo 3: Verificar Resultados

Você deve ver cards com:
- 🔵 Badge **"PNCP"** (azul) - Portal Nacional
- 🟠 Badge **"BLL"** (laranja) - Bolsa de Licitações

## 🔧 Troubleshooting

### Problema: "Cannot GET /.netlify/functions/..."

**Causa**: Backend não está rodando

**Solução**:
```bash
npm run dev:api
```

### Problema: "Failed to fetch"

**Causa**: CORS ou backend não acessível

**Solução**:
1. Verifique se backend está rodando: `lsof -i :8888`
2. Reinicie o backend: `npm run dev:api`

### Problema: "Playwright not found"

**Solução**:
```bash
cd netlify/functions
npm install playwright @sparticuz/chromium
npx playwright install chromium
cd ../..
```

### Problema: Resultados do BLL não aparecem

**Possíveis causas**:
1. Credenciais não configuradas
2. Credenciais inválidas
3. Portal BLL fora do ar

**Solução**:
1. Configure credenciais na aba "Ingestão"
2. Teste as credenciais clicando em "Testar"
3. Verifique os logs do backend no terminal

## 📊 Logs do Backend

No terminal onde o backend está rodando, você verá:

```
[bll-proxy] API retornou X resultados
[bll-proxy] Scraper retornou Y resultados
[BLL Scraper] Iniciando scraping...
[BLL Scraper] Login realizado com sucesso
```

## ✅ Checklist Final

- [ ] Backend rodando (porta 8888)
- [ ] Frontend rodando (porta 5174)
- [ ] Playwright instalado
- [ ] @sparticuz/chromium instalado
- [ ] Credenciais configuradas
- [ ] Teste de busca realizado
- [ ] Resultados aparecem com badges

## 🎉 Resultado Esperado

Após seguir todos os passos:

```
Console do navegador (F12):
🔍 Resultados PNCP: 15
🔍 Resultados BLL: 8
🔍 Total após deduplicação: 23
```

Interface:
- Cards com badge azul "PNCP"
- Cards com badge laranja "BLL"
- Informações completas de cada licitação

## 📝 Comandos Úteis

```bash
# Ver processos rodando
lsof -i :8888  # Backend
lsof -i :5174  # Frontend

# Parar processos
lsof -ti:8888 | xargs kill -9
lsof -ti:5174 | xargs kill -9

# Reiniciar tudo
npm run dev

# Ver logs em tempo real
# (já aparecem no terminal onde executou npm run dev)

# Testar endpoints
curl http://localhost:8888/.netlify/functions/health
curl "http://localhost:8888/.netlify/functions/bll-proxy?objeto=teste"
```

## 🚨 Importante

1. **Sempre inicie o backend primeiro** (ou use `npm run dev` que inicia tudo)
2. **Aguarde o backend estar pronto** antes de acessar o frontend
3. **Configure credenciais** na interface para melhores resultados
4. **Scraping demora mais** que API (15-30 segundos)
5. **Logs são importantes** para debug - mantenha o terminal visível

---

**Desenvolvido com ❤️ para facilitar sua busca de licitações**

Última atualização: 16 de Abril de 2026
