# 🔑 Configurar Credenciais Localmente

## 🎯 Problema Identificado

As credenciais estão configuradas no **Vercel** (produção), mas não estão configuradas **localmente** (desenvolvimento).

Por isso:
- ✅ PNCP funciona (não precisa de credenciais)
- ❌ BLL não funciona (precisa de credenciais)
- ❌ BNC não funciona (precisa de credenciais)
- ❌ ConLicitacao não funciona (precisa de credenciais)

## ✅ Solução

Você precisa adicionar as mesmas credenciais do Vercel no arquivo `.env` local.

### Passo 1: Copiar Credenciais do Vercel

1. Acesse: https://vercel.com/chorstconsult/nexoscrm-main/settings/environment-variables
2. Copie os valores de:
   - `BLL_EMAIL`
   - `BLL_PASSWORD` (ou `SENHA_BLL`)
   - `BNC_EMAIL`
   - `BNC_PASSWORD` (ou `SENHA_BNC`)
   - `CONLICITACAO_EMAIL`
   - `CONLICITACAO_PASSWORD` (ou `CONLICITACAO_SENHA`)

### Passo 2: Editar Arquivo .env Local

Abra o arquivo `.env` na raiz do projeto e preencha:

```env
# Portais de Licitação
# BLL - Bolsa de Licitações e Leilões
BLL_EMAIL=seu-email@exemplo.com
BLL_PASSWORD=sua-senha

# BNC - BNC Compras
BNC_EMAIL=seu-email@exemplo.com
BNC_PASSWORD=sua-senha

# ConLicitacao - Consulte Online
CONLICITACAO_EMAIL=seu-email@exemplo.com
CONLICITACAO_PASSWORD=sua-senha
```

**IMPORTANTE**: Use os mesmos valores que estão no Vercel!

### Passo 3: Reiniciar Backend

Após salvar o arquivo `.env`, reinicie o Netlify Dev:

```bash
# Parar (Ctrl+C no terminal)
# Depois reiniciar:
npm run dev:api
```

### Passo 4: Testar

1. Recarregue a página no navegador (F5)
2. Faça uma busca
3. Verifique os logs no console (F12)

## 📊 Resultado Esperado

Após configurar as credenciais, você deve ver:

### Console do Navegador:
```
🔍 Buscando em BLL... { hasCredentials: true }
📡 BLL response status: 200
✅ BLL retornou: 8 resultados

🔍 Buscando em BNC... { hasCredentials: true }
📡 BNC response status: 200
✅ BNC retornou: 5 resultados

🔍 Buscando em CONLICITACAO... { hasCredentials: true }
📡 CONLICITACAO response status: 200
✅ CONLICITACAO retornou: 7 resultados

🔍 Resultados PNCP: 15
🔍 Resultados Portais (BLL+BNC+ConLicitacao): 20
🔍 Total após deduplicação: 35
```

### Terminal do Backend:
```
[bll-proxy] Buscando no portal: bll
[bll-proxy] Credenciais configuradas: { hasEmail: true, hasPassword: true, source: 'env' }
[bll-proxy] API do BLL retornou 8 resultados

[bll-proxy] Buscando no portal: bnc
[bll-proxy] Credenciais configuradas: { hasEmail: true, hasPassword: true, source: 'env' }
[bll-proxy] BNC não tem API, tentando scraper...
[bll-proxy] Scraper desabilitado em produção para BNC
```

## ⚠️ Importante

### Desenvolvimento vs Produção

| Portal | Desenvolvimento Local | Produção (Vercel) |
|--------|----------------------|-------------------|
| **PNCP** | ✅ API pública | ✅ API pública |
| **BLL** | ✅ API com credenciais | ✅ API com credenciais |
| **BNC** | ✅ Scraping (se credenciais) | ❌ Scraping desabilitado |
| **ConLicitacao** | ✅ Scraping (se credenciais) | ❌ Scraping desabilitado |

### Por que BNC e ConLicitacao não funcionam em produção?

Esses portais **não têm API pública** e dependem de **web scraping** com Playwright, que:
- ❌ Não funciona em ambientes serverless (Vercel/Netlify)
- ❌ Requer muito tempo (>10 segundos)
- ❌ Requer muita memória (>1GB)
- ❌ Chromium é muito pesado (~150MB)

### Soluções para Produção

#### Opção 1: Usar Apenas PNCP e BLL (Recomendado)
- ✅ Funcionam em produção
- ✅ Rápidos e confiáveis
- ✅ Cobrem a maioria das licitações

#### Opção 2: Contratar Serviço de Scraping
- ScrapingBee: https://www.scrapingbee.com
- Bright Data: https://brightdata.com
- Apify: https://apify.com

#### Opção 3: Migrar para Servidor Próprio
- Railway: https://railway.app
- Render: https://render.com
- DigitalOcean: https://www.digitalocean.com

## 🔧 Troubleshooting

### Problema: Ainda não funciona após configurar

**Verificar**:
1. Arquivo `.env` foi salvo?
2. Backend foi reiniciado?
3. Credenciais estão corretas?

**Testar credenciais manualmente**:
1. BLL: https://bllcompras.com/login
2. BNC: https://bnccompras.com/login
3. ConLicitacao: https://consulteonline.conlicitacao.com.br/login

### Problema: "Credenciais não configuradas"

**Logs mostram**:
```
[bll-proxy] Credenciais configuradas: { hasEmail: false, hasPassword: false }
```

**Solução**:
1. Verifique se o arquivo `.env` tem as variáveis
2. Verifique se os nomes estão corretos:
   - `BLL_EMAIL` (não `EMAIL_BLL`)
   - `BLL_PASSWORD` (não `SENHA_BLL`)
3. Reinicie o backend

### Problema: BNC e ConLicitacao retornam 0 resultados

**Causa**: Scraping desabilitado em produção

**Solução para desenvolvimento local**:
1. Configure credenciais no `.env`
2. Adicione `?useScraper=true` na URL (apenas para testes)
3. Aguarde mais tempo (scraping demora 15-30 segundos)

## 📝 Exemplo Completo

### Arquivo .env:

```env
# Database (Supabase)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# JWT
JWT_SECRET=seu-segredo-jwt

# Auth
AUTH_MASTER_KEY=sua-chave-mestra
MASTER_EMAILS=seu-email@exemplo.com

# Environment
NODE_ENV=development

# Portais de Licitação
# BLL - Bolsa de Licitações e Leilões
BLL_EMAIL=carlos.horst@doubletelecom.com.br
BLL_PASSWORD=180977

# BNC - BNC Compras
BNC_EMAIL=seu-email@bnc.com
BNC_PASSWORD=sua-senha-bnc

# ConLicitacao - Consulte Online
CONLICITACAO_EMAIL=seu-email@conlicitacao.com
CONLICITACAO_PASSWORD=sua-senha-conlicitacao
```

### Comandos:

```bash
# 1. Editar .env
nano .env
# ou
code .env

# 2. Salvar e fechar

# 3. Reiniciar backend
npm run dev:api

# 4. Testar
curl "http://localhost:8888/.netlify/functions/bll-proxy?portal=bll&objeto=software&uf=PR"
```

## ✅ Checklist

- [ ] Copiar credenciais do Vercel
- [ ] Editar arquivo `.env` local
- [ ] Salvar arquivo
- [ ] Reiniciar backend (Ctrl+C e `npm run dev:api`)
- [ ] Recarregar página no navegador (F5)
- [ ] Fazer busca
- [ ] Verificar logs no console (F12)
- [ ] Verificar resultados com badges coloridos

## 🎯 Resumo

**Problema**: Credenciais só no Vercel, não no `.env` local
**Solução**: Copiar credenciais do Vercel para `.env` local
**Tempo**: 2 minutos

Após configurar, você terá:
- ✅ PNCP funcionando
- ✅ BLL funcionando (com credenciais)
- ✅ BNC funcionando em dev (com scraping)
- ✅ ConLicitacao funcionando em dev (com scraping)

---

**Desenvolvido com ❤️ para facilitar seu desenvolvimento**

Última atualização: 16 de Abril de 2026
