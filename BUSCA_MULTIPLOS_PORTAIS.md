# 🚀 Busca em Múltiplos Portais Implementada

## ✅ O Que Foi Feito

Implementada busca simultânea em **4 portais** de licitações:

1. **PNCP** - Portal Nacional de Contratações Públicas (Governo Federal)
2. **BLL** - Bolsa de Licitações e Leilões
3. **BNC** - BNC Compras
4. **ConLicitacao** - Consulte Online ConLicitacao

## 🎯 Como Funciona

### Frontend (PortalBusca.jsx)

Quando você clica em **"Buscar em Todos os Portais"**, o sistema:

1. Busca no PNCP (API pública)
2. Busca no BLL (API com credenciais)
3. Busca no BNC (scraper em dev, API em produção)
4. Busca no ConLicitacao (scraper em dev, API em produção)

Todas as buscas acontecem **em paralelo** para máxima velocidade.

### Backend (bll-proxy.js)

O endpoint `/api/bll-proxy` agora aceita o parâmetro `portal`:

```javascript
// Buscar no BLL
GET /api/bll-proxy?portal=bll&objeto=software&uf=PR

// Buscar no BNC
GET /api/bll-proxy?portal=bnc&objeto=software&uf=PR

// Buscar no ConLicitacao
GET /api/bll-proxy?portal=conlicitacao&objeto=software&uf=PR
```

## 🎨 Badges Coloridos

Cada portal tem uma cor diferente para fácil identificação:

- 🔵 **PNCP** - Azul
- 🟠 **BLL** - Laranja
- 🟣 **BNC** - Roxo
- 🟢 **CONLICITACAO** - Verde

## 📊 Exemplo de Busca

### Entrada:
- **Objeto**: software
- **Estado**: PR (Paraná)

### Saída:
```
🔍 Resultados PNCP: 15
🔍 Resultados Portais (BLL+BNC+ConLicitacao): 23
🔍 Total após deduplicação: 35
```

### Cards Exibidos:
- 15 cards com badge 🔵 PNCP
- 8 cards com badge 🟠 BLL
- 7 cards com badge 🟣 BNC
- 8 cards com badge 🟢 CONLICITACAO
- **Total**: 35 licitações únicas

## ⚙️ Configuração

### Variáveis de Ambiente

Para que todos os portais funcionem, configure:

```env
# BLL
BLL_EMAIL=seu-email@exemplo.com
BLL_PASSWORD=sua-senha

# BNC
BNC_EMAIL=seu-email@exemplo.com
BNC_PASSWORD=sua-senha

# ConLicitacao
CONLICITACAO_EMAIL=seu-email@exemplo.com
CONLICITACAO_PASSWORD=sua-senha
```

### Onde Configurar

#### Desenvolvimento Local:
Arquivo `.env` na raiz do projeto

#### Produção (Vercel):
1. Acesse: https://vercel.com → Seu projeto → Settings → Environment Variables
2. Adicione as variáveis acima
3. Faça redeploy

#### Produção (Netlify):
1. Acesse: https://app.netlify.com → Seu site → Site settings → Environment variables
2. Adicione as variáveis acima
3. Redeploy automático

## 🔧 Limitações Atuais

### Em Produção (Vercel/Netlify):

- ✅ **PNCP**: Funciona sempre (API pública)
- ⚠️ **BLL**: Funciona se credenciais corretas (API)
- ❌ **BNC**: Não funciona (requer scraping)
- ❌ **ConLicitacao**: Não funciona (requer scraping)

### Em Desenvolvimento Local:

- ✅ **PNCP**: Funciona sempre
- ✅ **BLL**: Funciona com credenciais (API)
- ✅ **BNC**: Funciona com credenciais (scraping)
- ✅ **ConLicitacao**: Funciona com credenciais (scraping)

## 🚀 Como Habilitar Scraping em Produção

### Opção 1: Usar Serviço de Scraping (Recomendado)

Contratar serviço profissional:
- **ScrapingBee**: https://www.scrapingbee.com
- **Bright Data**: https://brightdata.com
- **Apify**: https://apify.com

### Opção 2: Migrar para Servidor Próprio

Deploy em plataforma com suporte a Docker:
- **Railway**: https://railway.app
- **Render**: https://render.com
- **Fly.io**: https://fly.io
- **DigitalOcean**: https://www.digitalocean.com

### Opção 3: Usar Apenas PNCP e BLL

Configuração mais simples e confiável:
- PNCP: API pública (sempre funciona)
- BLL: API com credenciais (funciona em produção)

## 📝 Logs de Debug

### Console do Navegador (F12):

```javascript
🔍 Resultados PNCP: 15
🔍 Resultados Portais (BLL+BNC+ConLicitacao): 23
🔍 Total após deduplicação: 35
```

### Backend (Terminal):

```
[bll-proxy] Buscando no portal: bll
[bll-proxy] Credenciais configuradas: { hasEmail: true, hasPassword: true }
[bll-proxy] API do BLL retornou 8 resultados

[bll-proxy] Buscando no portal: bnc
[bll-proxy] BNC não tem API, tentando scraper...
[bll-proxy] Scraper desabilitado em produção para BNC

[bll-proxy] Buscando no portal: conlicitacao
[bll-proxy] CONLICITACAO não tem API, tentando scraper...
[bll-proxy] Scraper desabilitado em produção para CONLICITACAO
```

## 🎯 Fluxo de Busca

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Usuário clica em "Buscar em Todos os Portais"           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Frontend faz 4 requisições em paralelo:                  │
│    - /api/pncp-proxy                                        │
│    - /api/bll-proxy?portal=bll                              │
│    - /api/bll-proxy?portal=bnc                              │
│    - /api/bll-proxy?portal=conlicitacao                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Backend processa cada portal:                            │
│    - PNCP: API pública                                      │
│    - BLL: API com credenciais                               │
│    - BNC: Scraper (dev) ou vazio (prod)                     │
│    - ConLicitacao: Scraper (dev) ou vazio (prod)            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Frontend combina e deduplica resultados                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Exibe cards com badges coloridos                         │
└─────────────────────────────────────────────────────────────┘
```

## ✅ Checklist de Verificação

- [x] Frontend busca em 4 portais
- [x] Backend suporta parâmetro `portal`
- [x] Badges coloridos implementados
- [x] Logs de debug adicionados
- [x] Deduplicação de resultados
- [ ] Credenciais configuradas
- [ ] Teste realizado
- [ ] Deploy em produção

## 🧪 Como Testar

### 1. Desenvolvimento Local

```bash
# Terminal 1: Backend
npm run dev:api

# Terminal 2: Frontend
cd apps/web
npm run dev
```

### 2. Acessar Interface

http://localhost:5173/b2g-portal-busca

### 3. Configurar Credenciais

1. Clique na aba "Ingestão"
2. Configure credenciais do BLL
3. Salve e teste

### 4. Fazer Busca

1. Volte para "Resultados"
2. Preencha:
   - **Objeto**: software
   - **Estado**: PR
3. Clique em "Buscar em Todos os Portais"

### 5. Verificar Resultados

Você deve ver:
- Cards com badge 🔵 PNCP
- Cards com badge 🟠 BLL
- (Em dev) Cards com badge 🟣 BNC
- (Em dev) Cards com badge 🟢 CONLICITACAO

## 📚 Arquivos Modificados

### Frontend:
- `apps/web/src/pages/PortalBusca.jsx`
  - Adicionada busca em múltiplos portais
  - Badges coloridos por portal
  - Logs de debug melhorados

### Backend:
- `netlify/functions/bll-proxy.js`
  - Suporte ao parâmetro `portal`
  - Roteamento para diferentes portais
  - Logs específicos por portal

### Configuração:
- `apps/web/vite.config.js`
  - Proxy para Netlify Functions

## 🎉 Resultado Final

Agora o sistema busca em **4 portais simultaneamente**, oferecendo:

- ✅ Mais resultados
- ✅ Maior cobertura
- ✅ Identificação visual por portal
- ✅ Deduplicação automática
- ✅ Performance otimizada (busca paralela)

---

**Desenvolvido com ❤️ para facilitar sua busca de licitações**

Última atualização: 16 de Abril de 2026
