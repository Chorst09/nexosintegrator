# 🤖 Guia de Scrapers - Portal B2G

## Visão Geral

O sistema agora possui scrapers automatizados usando Playwright para buscar editais em múltiplos portais de licitação quando as APIs não estão disponíveis ou não retornam resultados.

## Portais Suportados

### 1. BLL Compras
- **URL**: https://bllcompras.com
- **Método**: API + Scraper (fallback)
- **Credenciais**: Email e Senha

### 2. BNC Compras
- **URL**: https://bnccompras.com
- **Método**: Scraper
- **Credenciais**: Email e Senha

### 3. ConLicitacao
- **URL**: https://consulteonline.conlicitacao.com.br
- **Método**: Scraper
- **Credenciais**: Email e Senha

## Configuração

### Variáveis de Ambiente

Você pode configurar credenciais de três formas:

#### 1. Credenciais Específicas por Portal
```bash
# BLL Compras
BLL_EMAIL=seu-email@exemplo.com
BLL_PASSWORD=sua-senha

# BNC Compras
BNC_EMAIL=seu-email@exemplo.com
BNC_PASSWORD=sua-senha

# ConLicitacao
CONLICITACAO_EMAIL=seu-email@exemplo.com
CONLICITACAO_PASSWORD=sua-senha
```

#### 2. Credenciais Padrão (para todos os portais)
```bash
SCRAPER_EMAIL=seu-email@exemplo.com
SCRAPER_PASSWORD=sua-senha
```

#### 3. Via Interface (Headers HTTP)
As credenciais podem ser enviadas via headers HTTP:
- `X-BLL-Email` e `X-BLL-Password`
- `X-BNC-Email` e `X-BNC-Password`
- `X-ConLicitacao-Email` e `X-ConLicitacao-Password`

### Prioridade de Credenciais

1. **Headers HTTP** (configuração do usuário via interface)
2. **Variáveis de ambiente específicas** (BLL_EMAIL, BNC_EMAIL, etc.)
3. **Variáveis de ambiente padrão** (SCRAPER_EMAIL, SCRAPER_PASSWORD)

## Como Funciona

### Fluxo de Busca

```
1. Usuário faz busca no Portal B2G
   ↓
2. Sistema tenta API do BLL primeiro
   ↓
3. Se API falhar ou não retornar resultados:
   ↓
4. Sistema ativa scrapers em paralelo:
   - BLL Compras (scraper)
   - BNC Compras (scraper)
   - ConLicitacao (scraper)
   ↓
5. Resultados são combinados e deduplicados
   ↓
6. Retorna para o usuário
```

### Gestão de Sessão

Os scrapers salvam cookies após o primeiro login bem-sucedido:
- **Localização**: `/tmp/[portal]-cookies.json`
- **Validade**: Reutilizados em buscas futuras
- **Renovação**: Automática quando expiram

### Screenshots para Debug

Em caso de erro, screenshots são salvos automaticamente:
- **Localização**: `/tmp/screenshots/`
- **Formato**: `[tipo]-[timestamp].png`
- **Tipos**: `login-failed`, `login-error`, `error`

## API

### Endpoint Principal

```
GET /api/bll-proxy
```

### Parâmetros

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `objeto` | string | Palavra-chave de busca |
| `uf` | string | UF para filtrar (ex: PR, SP) |
| `pagina` | number | Número da página (padrão: 1) |
| `tamanhoPagina` | number | Itens por página (padrão: 20) |
| `useScraper` | boolean | Forçar uso do scraper (padrão: true) |
| `action` | string | Ação especial (ex: check-credentials) |

### Exemplos de Uso

#### Busca Simples
```javascript
fetch('/api/bll-proxy?objeto=software&uf=PR')
  .then(r => r.json())
  .then(data => console.log(data));
```

#### Busca com Credenciais Personalizadas
```javascript
fetch('/api/bll-proxy?objeto=saneamento&uf=SP', {
  headers: {
    'X-BLL-Email': 'meu-email@exemplo.com',
    'X-BLL-Password': 'minha-senha',
    'X-BNC-Email': 'meu-email@exemplo.com',
    'X-BNC-Password': 'minha-senha'
  }
})
  .then(r => r.json())
  .then(data => console.log(data));
```

#### Verificar Status das Credenciais
```javascript
fetch('/api/bll-proxy?action=check-credentials')
  .then(r => r.json())
  .then(data => console.log(data.status));
```

### Resposta

```json
{
  "data": [
    {
      "id": "bll-scraped-1234567890-0",
      "objetoCompra": "Aquisição de software",
      "orgaoEntidade": {
        "razaoSocial": "Prefeitura Municipal"
      },
      "modalidadeNome": "Pregão Eletrônico",
      "valorTotalEstimado": 50000.00,
      "dataAberturaProposta": "2026-05-01",
      "unidadeOrgao": {
        "ufSigla": "PR"
      },
      "linkSistemaOrigem": "https://bllcompras.com/licitacao/123",
      "fonte": "BLL",
      "numeroCompra": "001/2026",
      "_scraped": true
    }
  ],
  "total": 1,
  "fonte": "Scraper (BLL+BNC+ConLicitacao)",
  "autenticado": true,
  "method": "scraper"
}
```

## Desenvolvimento Local

### Modo Headless Desabilitado

Para ver o navegador em ação durante o desenvolvimento:

1. Edite o arquivo do scraper
2. Altere `headless: true` para `headless: false`
3. Execute a busca

```javascript
// Em bll-scraper.js, bnc-scraper.js ou conlicitacao-scraper.js
browser = await initBrowser(false); // false = mostra navegador
```

### Instalar Dependências

```bash
npm install
```

### Testar Localmente

```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Em outro terminal, testar endpoint
curl "http://localhost:8888/api/bll-proxy?objeto=teste&uf=PR"
```

## Troubleshooting

### Problema: "Falha no login"

**Causas possíveis:**
- Credenciais incorretas
- Portal alterou seletores HTML
- Captcha ou proteção anti-bot

**Solução:**
1. Verifique credenciais no portal manualmente
2. Veja screenshot em `/tmp/screenshots/login-failed-*.png`
3. Atualize seletores no código se necessário

### Problema: "Nenhum resultado encontrado"

**Causas possíveis:**
- Seletores HTML desatualizados
- Portal alterou estrutura da página
- Busca realmente não tem resultados

**Solução:**
1. Teste busca manual no portal
2. Veja screenshot em `/tmp/screenshots/error-*.png`
3. Atualize seletores de extração no código

### Problema: "Timeout"

**Causas possíveis:**
- Portal lento
- Conexão instável
- Página com muito JavaScript

**Solução:**
1. Aumente `DEFAULT_TIMEOUT` no scraper
2. Adicione mais `waitForTimeout` após ações
3. Use `waitForLoadState('networkidle')`

### Problema: "Cookies não salvam"

**Causas possíveis:**
- Permissões de escrita em `/tmp`
- Ambiente serverless limpa `/tmp`

**Solução:**
1. Verifique permissões: `ls -la /tmp`
2. Em produção, cookies são voláteis (normal)
3. Sistema faz novo login automaticamente

## Manutenção

### Atualizar Seletores

Quando um portal muda sua estrutura HTML:

1. Acesse o portal manualmente
2. Inspecione elementos (F12)
3. Identifique novos seletores
4. Atualize no arquivo do scraper

```javascript
// Exemplo: atualizar seletor de email
const emailSelector = await page.locator(
  'input[name="email"], ' +      // Seletor antigo
  'input[name="usuario"], ' +    // Novo seletor
  'input[type="email"], ' +      // Fallback
  '#email, #usuario'             // IDs
).first();
```

### Adicionar Novo Portal

1. Crie arquivo `netlify/functions/scrapers/[portal]-scraper.js`
2. Copie estrutura de um scraper existente
3. Adapte URLs e seletores
4. Adicione ao `scrapers/index.js`
5. Teste localmente
6. Documente aqui

## Performance

### Otimizações Implementadas

- ✅ Cache de cookies (evita logins repetidos)
- ✅ Busca paralela em múltiplos portais
- ✅ Deduplicação de resultados
- ✅ Timeout configurável
- ✅ Headless mode em produção

### Métricas Esperadas

| Operação | Tempo Médio |
|----------|-------------|
| Login (primeira vez) | 5-10s |
| Login (com cookies) | 1-2s |
| Busca simples | 3-5s |
| Busca em 3 portais | 8-15s |

## Segurança

### Boas Práticas

- ✅ Credenciais via variáveis de ambiente
- ✅ Cookies salvos em `/tmp` (volátil)
- ✅ Screenshots não contêm dados sensíveis
- ✅ Headers CORS configurados
- ✅ Validação de entrada

### Recomendações

- Use credenciais específicas para integração
- Não compartilhe credenciais entre usuários
- Monitore logs para detectar falhas de login
- Rotacione senhas periodicamente

## Logs

### Formato

```
[Portal Scraper] Mensagem
```

### Exemplos

```
[BLL Scraper] Inicializando navegador...
[BLL Scraper] Email preenchido
[BLL Scraper] Login bem-sucedido!
[BLL Scraper] 15 editais extraídos
[bll-proxy] Scraper retornou 15 resultados
```

### Monitoramento

Logs estão disponíveis em:
- **Desenvolvimento**: Console do terminal
- **Produção**: Vercel Logs ou Netlify Logs

## Roadmap

### Próximas Melhorias

- [ ] Cache de resultados (Redis)
- [ ] Retry automático em caso de falha
- [ ] Notificações de erro via email
- [ ] Dashboard de monitoramento
- [ ] Testes automatizados
- [ ] Suporte a mais portais
- [ ] Extração de anexos (editais PDF)
- [ ] OCR para editais escaneados

---

**Desenvolvido com ❤️ para facilitar buscas de licitações**

Última atualização: 16 de Abril de 2026
