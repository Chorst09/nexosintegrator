# ✅ Correção da Ingestão de Portais

## 🔍 Problema Identificado

As buscas nos portais (BLL, BNC, ConLicitacao) não estavam funcionando porque:

1. ❌ **Playwright não estava instalado** (necessário para scraping)
2. ❌ **@sparticuz/chromium não estava instalado** (necessário para rodar em produção)

## ✅ Correções Aplicadas

### 1. Instalação do Playwright
```bash
cd netlify/functions
npm install playwright
npx playwright install chromium
```

### 2. Instalação do @sparticuz/chromium
```bash
cd netlify/functions
npm install @sparticuz/chromium
```

## 🚀 Como Testar Agora

### Passo 1: Reiniciar o Backend

Se o backend estiver rodando, pare e reinicie:

```bash
# Parar o processo atual (Ctrl+C no terminal onde está rodando)

# Reiniciar
npm run dev
```

### Passo 2: Configurar Credenciais na Interface

1. Abra o navegador: http://localhost:5174/b2g-portal-busca
2. Clique na aba **"Ingestão"**
3. Role até a seção **"BLL — Bolsa de Licitações e Leilões"**
4. Preencha suas credenciais:
   - **Email**: seu-email@exemplo.com
   - **Senha**: sua-senha
5. Clique em **"Salvar"**
6. Clique em **"Testar"** para verificar se as credenciais funcionam

### Passo 3: Fazer uma Busca

1. Volte para a aba **"Resultados"**
2. Preencha os filtros:
   - **Objeto**: software (ou qualquer termo)
   - **Estado**: Selecione um ou mais estados
3. Clique em **"Buscar no PNCP + BLL"**

### Passo 4: Verificar os Resultados

Você deve ver:
- Cards com badge **azul "PNCP"** (resultados do Portal Nacional)
- Cards com badge **laranja "BLL"** (resultados do BLL)

## 🔧 Troubleshooting

### Problema: Ainda não aparecem resultados do BLL

**Solução 1: Verificar logs do backend**
No terminal onde o backend está rodando, você deve ver:
```
[bll-proxy] API retornou X resultados
[bll-proxy] Scraper retornou Y resultados
```

**Solução 2: Verificar credenciais**
- Certifique-se de que o email e senha estão corretos
- Teste o login manualmente no site: https://bllcompras.com/login

**Solução 3: Usar scraper forçado**
Se a API do BLL não funcionar, o sistema automaticamente usa o scraper como fallback.

### Problema: Erro "playwright not found"

```bash
cd netlify/functions
npm install playwright
npx playwright install chromium
```

### Problema: Erro "@sparticuz/chromium not found"

```bash
cd netlify/functions
npm install @sparticuz/chromium
```

## 📊 Como Funciona o Sistema

### Fluxo de Busca

```
1. Usuário clica em "Buscar"
   ↓
2. Frontend envia requisição para /api/bll-proxy
   ↓
3. Backend tenta API do BLL primeiro
   ↓
4. Se API falhar ou não retornar resultados:
   ↓
5. Backend usa Playwright para fazer scraping
   ↓
6. Resultados são combinados com PNCP
   ↓
7. Frontend exibe cards com badges (PNCP/BLL)
```

### Portais Suportados

1. **PNCP** (Portal Nacional de Contratações Públicas)
   - ✅ API pública (sempre funciona)
   - ✅ Sem necessidade de credenciais

2. **BLL** (Bolsa de Licitações e Leilões)
   - 🔐 Requer credenciais
   - 🔄 API + Scraping (fallback automático)

3. **BNC** (BNC Compras)
   - 🔐 Requer credenciais
   - 🔄 Scraping com Playwright

4. **ConLicitacao** (Consulte Online)
   - 🔐 Requer credenciais
   - 🔄 Scraping com Playwright

## 🎯 Próximos Passos

### Configurar Outros Portais (Opcional)

Se quiser buscar também no BNC e ConLicitacao:

1. Crie contas nesses portais:
   - BNC: https://bnccompras.com
   - ConLicitacao: https://consulteonline.conlicitacao.com.br

2. Configure as credenciais via variáveis de ambiente:

```bash
# No arquivo .env
BNC_EMAIL=seu-email@exemplo.com
BNC_PASSWORD=sua-senha

CONLICITACAO_EMAIL=seu-email@exemplo.com
CONLICITACAO_PASSWORD=sua-senha
```

3. Reinicie o backend

## ✅ Checklist de Verificação

- [x] Playwright instalado
- [x] @sparticuz/chromium instalado
- [x] Chromium baixado
- [ ] Backend reiniciado
- [ ] Credenciais configuradas na interface
- [ ] Teste de busca realizado
- [ ] Resultados do BLL aparecem com badge laranja

## 📝 Notas Importantes

1. **Credenciais são salvas localmente** no navegador (localStorage)
2. **Scraping é automático** - você não precisa fazer nada
3. **Fallback inteligente** - se API falhar, usa scraping
4. **Deduplicação automática** - resultados duplicados são removidos
5. **Performance** - scraping pode demorar mais que API (15-30 segundos)

## 🎉 Resultado Esperado

Após seguir todos os passos, você deve ver:

```
🔵 Resultados PNCP: 15
🟠 Resultados BLL: 8
📊 Total após deduplicação: 23
```

E os cards devem mostrar:
- Badge azul "PNCP" para resultados do Portal Nacional
- Badge laranja "BLL" para resultados do BLL

---

**Desenvolvido com ❤️ para facilitar sua busca de licitações**

Última atualização: 16 de Abril de 2026
