# 🚀 Testar em Produção

## ✅ Deploy Realizado

O código foi enviado para o GitHub e o Vercel está fazendo deploy automaticamente.

**Último commit**: `325c767` - fix: adicionar @napi-rs/canvas e playwright como módulos externos

## 🔍 Verificar Status do Deploy

### Opção 1: Via Dashboard Vercel

1. Acesse: https://vercel.com/chorstconsult/nexoscrm-main
2. Veja a aba **"Deployments"**
3. O deploy mais recente deve estar:
   - 🟡 **Building** (em andamento)
   - 🟢 **Ready** (concluído)
   - 🔴 **Error** (erro)

### Opção 2: Via CLI (se tiver instalado)

```bash
vercel ls
```

## ⏱️ Tempo Estimado

- **Build**: 3-5 minutos
- **Deploy**: 1-2 minutos
- **Total**: ~5-7 minutos

## 🧪 Como Testar em Produção

### Passo 1: Aguardar Deploy Concluir

Espere até o status no Vercel mostrar **"Ready"** (verde).

### Passo 2: Acessar URL de Produção

```
https://nexoscrm-main.vercel.app/b2g-portal-busca
```

Ou a URL personalizada se você configurou.

### Passo 3: Verificar Variáveis de Ambiente

Antes de testar, confirme que as variáveis estão configuradas no Vercel:

1. Acesse: https://vercel.com/chorstconsult/nexoscrm-main/settings/environment-variables
2. Verifique se existem:
   - ✅ `BLL_EMAIL`
   - ✅ `BLL_PASSWORD` (ou `SENHA_BLL`)
   - ✅ `BNC_EMAIL`
   - ✅ `BNC_PASSWORD`
   - ✅ `CONLICITACAO_EMAIL`
   - ✅ `CONLICITACAO_PASSWORD`

**IMPORTANTE**: Se os nomes estiverem errados (ex: `SENHA_BLL` em vez de `BLL_PASSWORD`), renomeie!

### Passo 4: Fazer Busca

1. Preencha os filtros:
   - **Objeto**: software
   - **Estado**: PR (Paraná)
2. Clique em **"Buscar em Todos os Portais"**
3. Aguarde os resultados

### Passo 5: Verificar Resultados

Abra o console do navegador (F12) e veja:

```
🔍 Resultados PNCP: X
🔍 Resultados Portais (BLL+BNC+ConLicitacao): Y
🔍 Total após deduplicação: Z
```

## 📊 Resultado Esperado em Produção

### ✅ O Que Deve Funcionar:

| Portal | Status | Motivo |
|--------|--------|--------|
| **PNCP** | ✅ Funciona | API pública |
| **BLL** | ✅ Funciona | API com credenciais |
| **BNC** | ❌ Não funciona | Requer scraping (desabilitado) |
| **ConLicitacao** | ❌ Não funciona | Requer scraping (desabilitado) |

### 📈 Resultados Típicos:

```
🔍 Resultados PNCP: 15-30
🔍 Resultados Portais (BLL+BNC+ConLicitacao): 5-15 (só BLL)
🔍 Total após deduplicação: 20-40
```

### 🎨 Badges Esperados:

- 🔵 **PNCP** - Azul (maioria dos resultados)
- 🟠 **BLL** - Laranja (alguns resultados)
- 🟣 **BNC** - Roxo (nenhum em produção)
- 🟢 **CONLICITACAO** - Verde (nenhum em produção)

## 🔧 Troubleshooting em Produção

### Problema: Nenhum resultado do BLL

**Possíveis causas**:
1. Credenciais não configuradas
2. Credenciais inválidas
3. API do BLL fora do ar

**Solução**:
1. Verifique variáveis de ambiente no Vercel
2. Teste credenciais manualmente: https://bllcompras.com/login
3. Veja logs do Vercel:
   - Acesse: https://vercel.com/chorstconsult/nexoscrm-main
   - Clique em **"Functions"**
   - Clique em **"bll-proxy"**
   - Veja os logs

### Problema: Erro 500

**Causa**: Erro no código ou configuração

**Solução**:
1. Veja logs do Vercel (Functions → bll-proxy)
2. Procure por erros no console do navegador (F12)
3. Verifique se todas as variáveis de ambiente estão configuradas

### Problema: Timeout

**Causa**: Função demora muito (>10 segundos)

**Solução**:
1. Verifique se não está tentando usar scraping (desabilitado)
2. Aumente timeout no `vercel.json` (se necessário):
   ```json
   {
     "functions": {
       "api/**/*.js": {
         "maxDuration": 30
       }
     }
   }
   ```

### Problema: CORS Error

**Causa**: Headers não configurados

**Solução**: Já está configurado no `netlify.toml`, mas se usar Vercel, adicione `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET, POST, PUT, DELETE, OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type, Authorization" }
      ]
    }
  ]
}
```

## 📝 Checklist de Teste

### Antes de Testar:
- [ ] Deploy concluído (status "Ready")
- [ ] Variáveis de ambiente configuradas
- [ ] Nomes das variáveis corretos (`BLL_PASSWORD`, não `SENHA_BLL`)

### Durante o Teste:
- [ ] Página carrega sem erros
- [ ] Formulário de busca funciona
- [ ] Botão "Buscar em Todos os Portais" clicável
- [ ] Loading aparece durante busca

### Após o Teste:
- [ ] Resultados do PNCP aparecem (badge azul)
- [ ] Resultados do BLL aparecem (badge laranja)
- [ ] Total de resultados > 0
- [ ] Cards exibem informações corretas
- [ ] Links "Ver Edital" funcionam

## 🎯 Teste Completo

### 1. Teste Básico (PNCP)

```
Objeto: software
Estado: (nenhum)
Resultado esperado: 10-20 resultados PNCP
```

### 2. Teste com Estado (PNCP + BLL)

```
Objeto: software
Estado: PR
Resultado esperado: 5-15 PNCP + 3-8 BLL
```

### 3. Teste com Múltiplos Estados

```
Objeto: software
Estados: PR, SC, RS
Resultado esperado: 15-30 PNCP + 5-15 BLL
```

### 4. Teste sem Objeto

```
Objeto: (vazio)
Estado: PR
Resultado esperado: 20-50 resultados
```

## 📊 Monitoramento

### Logs em Tempo Real

1. Acesse: https://vercel.com/chorstconsult/nexoscrm-main
2. Vá em **"Functions"**
3. Clique em **"bll-proxy"**
4. Veja logs em tempo real

### Métricas

- **Invocations**: Quantas vezes a função foi chamada
- **Duration**: Tempo médio de execução
- **Errors**: Taxa de erro
- **Bandwidth**: Uso de dados

## ✅ Resultado Final Esperado

Após o teste, você deve ter:

- ✅ PNCP funcionando (10-30 resultados)
- ✅ BLL funcionando (3-10 resultados)
- ✅ Interface mostrando badges coloridos
- ✅ Total de 15-40 licitações únicas
- ✅ Links para editais funcionando

## 🚨 Se Não Funcionar

### 1. Verificar Logs

```bash
# Via CLI (se tiver)
vercel logs
```

### 2. Verificar Variáveis

```bash
# Via CLI (se tiver)
vercel env ls
```

### 3. Fazer Redeploy

Se mudou variáveis de ambiente:

1. Acesse: https://vercel.com/chorstconsult/nexoscrm-main
2. Vá em **"Deployments"**
3. Clique nos 3 pontos do último deploy
4. Clique em **"Redeploy"**

## 📞 Suporte

Se encontrar problemas:

1. **Logs do Vercel**: Veja erros específicos
2. **Console do navegador**: Veja erros de frontend
3. **Teste local**: Compare com ambiente local
4. **Documentação**: Consulte arquivos criados

## 🎉 Sucesso!

Se tudo funcionar:

- ✅ Sistema em produção
- ✅ Busca em múltiplos portais
- ✅ Deploy automático configurado
- ✅ Pronto para uso!

---

## 🔗 Links Úteis

- **Produção**: https://nexoscrm-main.vercel.app
- **Dashboard Vercel**: https://vercel.com/chorstconsult/nexoscrm-main
- **GitHub**: https://github.com/Chorst09/nexoscrm
- **Documentação**: Arquivos `.md` no repositório

---

**Desenvolvido com ❤️ para facilitar sua busca de licitações**

Última atualização: 16 de Abril de 2026

---

## 🚀 COMECE AGORA!

1. Aguarde deploy concluir (~5 minutos)
2. Acesse: https://nexoscrm-main.vercel.app/b2g-portal-busca
3. Faça uma busca
4. Veja os resultados!

**BOA SORTE!** 🍀
