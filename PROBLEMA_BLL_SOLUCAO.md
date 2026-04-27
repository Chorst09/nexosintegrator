# 🔧 Problema: Só PNCP Funciona, BLL/BNC/ConLicitacao Não

## ❌ Problema Identificado

Apenas o **PNCP** retorna resultados. Os outros portais (BLL, BNC, ConLicitacao) não funcionam.

## 🔍 Causa Raiz

### 1. Scraping Desabilitado em Produção
O web scraping com Playwright **não funciona** em ambientes serverless (Vercel/Netlify) sem configuração especial porque:
- Chromium é muito pesado (~150MB)
- Timeout de 10 segundos é insuficiente
- Memória limitada (1GB)
- Cold start demora muito

### 2. API do BLL Requer Autenticação
A API do BLL precisa de:
- Email válido
- Senha válida
- Token de autenticação

### 3. Credenciais Não Configuradas
As variáveis de ambiente no Vercel estão configuradas, mas:
- Podem estar com valores incorretos
- Podem não estar sendo lidas corretamente
- API do BLL pode estar rejeitando

## ✅ Soluções Aplicadas

### 1. Desabilitar Scraper em Produção
```javascript
// Scraper só funciona em desenvolvimento local
if (results.length === 0 && process.env.NODE_ENV !== 'production') {
  // Usar scraper
}
```

### 2. Melhorar Logs de Debug
```javascript
console.log('[bll-proxy] Credenciais configuradas:', {
  hasEmail: !!email,
  hasPassword: !!password,
  source: headers['x-bll-email'] ? 'headers' : 'env'
});
```

### 3. Remover Credenciais Hardcoded
Removidas credenciais padrão do código por segurança.

## 🎯 Como Fazer Funcionar

### Opção 1: Configurar Credenciais Corretas (Recomendado)

#### No Vercel:
1. Acesse: https://vercel.com/chorstconsult/nexoscrm-main/settings/environment-variables
2. Verifique se as variáveis estão corretas:
   ```
   BLL_EMAIL=seu-email-valido@exemplo.com
   BLL_PASSWORD=sua-senha-correta
   ```
3. **IMPORTANTE**: Teste as credenciais manualmente em https://bllcompras.com/login
4. Faça redeploy após alterar variáveis

#### No Netlify:
1. Acesse: https://app.netlify.com → Seu site → Site settings → Environment variables
2. Adicione:
   ```
   BLL_EMAIL=seu-email-valido@exemplo.com
   BLL_PASSWORD=sua-senha-correta
   ```
3. Redeploy automático

### Opção 2: Usar Apenas PNCP

Se não tiver credenciais dos outros portais, use apenas o PNCP:
- ✅ PNCP é gratuito e não requer credenciais
- ✅ Tem a maioria das licitações públicas do Brasil
- ✅ API oficial do governo

### Opção 3: Habilitar Scraping (Avançado)

Para habilitar scraping em produção:

#### 1. Usar Serviço Externo de Scraping
- ScrapingBee: https://www.scrapingbee.com
- Bright Data: https://brightdata.com
- Apify: https://apify.com

#### 2. Configurar Playwright no Vercel
```javascript
// vercel.json
{
  "functions": {
    "api/**/*.js": {
      "memory": 3008,
      "maxDuration": 60
    }
  }
}
```

#### 3. Usar Docker Container
Deploy em:
- Railway: https://railway.app
- Render: https://render.com
- Fly.io: https://fly.io

## 🧪 Testar Credenciais

### Teste Manual
1. Acesse: https://bllcompras.com/login
2. Tente fazer login com suas credenciais
3. Se funcionar, as credenciais estão corretas

### Teste via API
```bash
curl -X POST https://bll.org.br/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"seu-email@exemplo.com","password":"sua-senha"}'
```

### Teste no Sistema
1. Acesse: https://seu-site.vercel.app/b2g-portal-busca
2. Vá na aba "Ingestão"
3. Configure credenciais
4. Clique em "Testar"

## 📊 Verificar Logs

### No Vercel:
1. Acesse: https://vercel.com/chorstconsult/nexoscrm-main
2. Vá em "Deployments" → Último deploy → "Functions"
3. Clique em "bll-proxy"
4. Veja os logs

Procure por:
```
[bll-proxy] Credenciais configuradas: { hasEmail: true, hasPassword: true }
[bll-proxy] API retornou X resultados
```

### No Netlify:
1. Acesse: https://app.netlify.com → Seu site → Functions
2. Clique em "bll-proxy"
3. Veja os logs em tempo real

## 🔧 Troubleshooting

### Problema: "Credenciais não configuradas"

**Logs mostram**:
```
[bll-proxy] Credenciais configuradas: { hasEmail: false, hasPassword: false }
```

**Solução**:
1. Verifique variáveis de ambiente no Vercel/Netlify
2. Certifique-se que os nomes estão corretos: `BLL_EMAIL` e `BLL_PASSWORD`
3. Faça redeploy após adicionar

### Problema: "API retornou 0 resultados"

**Logs mostram**:
```
[bll-proxy] API retornou 0 resultados
```

**Possíveis causas**:
1. Credenciais inválidas
2. API do BLL fora do ar
3. Termo de busca não encontrou nada

**Solução**:
1. Teste credenciais manualmente no site
2. Tente buscar por termo genérico: "software"
3. Verifique se API do BLL está online

### Problema: "Login falhou"

**Logs mostram**:
```
[bll-proxy] Tentando login no BLL...
[bll-proxy] Erro no login: ...
```

**Solução**:
1. Verifique se email e senha estão corretos
2. Tente fazer login manual no site
3. Verifique se conta não está bloqueada
4. Tente resetar a senha

### Problema: "Timeout"

**Logs mostram**:
```
Function execution timed out
```

**Solução**:
1. Aumente timeout no `netlify.toml`:
   ```toml
   [functions]
     timeout = 30
   ```
2. Ou no `vercel.json`:
   ```json
   {
     "functions": {
       "api/**/*.js": {
         "maxDuration": 30
       }
     }
   }
   ```

## 📝 Resumo das Alterações

### Arquivos Modificados:
- `netlify/functions/bll-proxy.js`
  - ✅ Removidas credenciais hardcoded
  - ✅ Adicionados logs de debug
  - ✅ Desabilitado scraper em produção
  - ✅ Melhorado tratamento de erros

### O Que Funciona Agora:
- ✅ PNCP (sempre funcionou)
- ⚠️ BLL via API (se credenciais corretas)
- ❌ BLL via Scraping (desabilitado em produção)
- ❌ BNC (requer scraping)
- ❌ ConLicitacao (requer scraping)

### O Que Precisa Fazer:
1. ✅ Configurar credenciais corretas no Vercel/Netlify
2. ✅ Testar credenciais manualmente
3. ✅ Fazer redeploy
4. ✅ Verificar logs

## 🎯 Próximos Passos

### Imediato:
1. Verificar se credenciais do BLL estão corretas
2. Testar login manual em https://bllcompras.com
3. Atualizar variáveis de ambiente
4. Fazer redeploy

### Curto Prazo:
1. Considerar usar apenas PNCP (mais confiável)
2. Ou contratar serviço de scraping profissional
3. Ou migrar para servidor próprio com Docker

### Longo Prazo:
1. Implementar cache de resultados
2. Implementar fila de scraping assíncrona
3. Usar serviço dedicado para scraping

## 📚 Documentação Relacionada

- **CORRECAO_INGESTAO.md** - Correção inicial
- **INICIAR_SISTEMA_COMPLETO.md** - Como rodar localmente
- **SCRAPERS_IMPLEMENTADOS.md** - Como funcionam os scrapers

## ✅ Checklist

- [x] Identificar problema
- [x] Desabilitar scraper em produção
- [x] Adicionar logs de debug
- [x] Remover credenciais hardcoded
- [ ] Configurar credenciais corretas
- [ ] Testar em produção
- [ ] Verificar logs

---

**Desenvolvido com ❤️ para facilitar sua busca de licitações**

Última atualização: 16 de Abril de 2026
