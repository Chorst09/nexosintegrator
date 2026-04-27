# Solução Definitiva - Checkout Mercado Pago

## Problema Identificado

O erro estava ocorrendo porque:

1. **CORS no Mercado Pago**: Ao redirecionar para a página do Mercado Pago, o navegador bloqueava requisições para `secure-fields.mercadopago.com` devido a políticas de CORS
2. **Tokenização de Cartão**: O MP não conseguia criar tokens de cartão devido aos bloqueios de CORS
3. **Modo de Teste**: Em credenciais de teste, o MP tem limitações adicionais de segurança

## Solução Implementada

### 1. Checkout Pro (Modal) ao invés de Redirecionamento

Mudamos de:
- ❌ Redirecionar para página do Mercado Pago (causava CORS)

Para:
- ✅ Abrir checkout em modal do Mercado Pago na própria página (sem CORS)

### 2. SDK do Mercado Pago

Adicionado no `apps/web/index.html`:
```html
<!-- Mercado Pago SDK -->
<script src="https://sdk.mercadopago.com/js/v2"></script>
```

### 3. Modificação no Frontend

No `apps/web/src/pages/Checkout.jsx`:

```javascript
// Inicializar Mercado Pago SDK
const mp = new window.MercadoPago(mpPublicKey, {
  locale: 'pt-BR'
});

// Abrir checkout do Mercado Pago em modal
mp.checkout({
  preference: {
    id: preferenceId
  },
  autoOpen: true
});
```

### 4. Chave Pública no Frontend

Criado `apps/web/.env.local`:
```env
VITE_MERCADO_PAGO_PUBLIC_KEY=TEST-ea423066-0567-48a7-800c-f1a39833ce5e
```

### 5. Melhorias no Backend

No `apps/api/api/checkout.cjs`:
- Adicionado suporte para modo de teste
- Configuração de métodos de pagamento permitidos
- Melhor tratamento de URLs de retorno

## Como Funciona Agora

### Fluxo Completo

1. **Usuário preenche dados** → Formulário validado
2. **Clica em "Pagar"** → Frontend chama `/api/checkout/create-preference`
3. **Backend cria preferência** → Salva no banco e chama API do MP
4. **Backend retorna preferenceId** → ID da preferência criada
5. **Frontend inicializa SDK** → `new MercadoPago(publicKey)`
6. **Modal abre** → Checkout do MP abre na mesma página
7. **Usuário paga** → Preenche dados do cartão no modal
8. **MP processa** → Pagamento aprovado/recusado
9. **MP redireciona** → Volta para `/checkout?status=success&payment_id=...`
10. **Frontend confirma** → Chama `/api/licensing/public/checkout/confirm`
11. **Backend cria conta** → Empresa e usuário criados
12. **Redireciona para login** → Usuário pode acessar o sistema

## Vantagens da Solução

### 1. Sem Problemas de CORS
- Modal do MP carrega na mesma origem
- Não há bloqueios de recursos externos
- Funciona em todos os navegadores

### 2. Melhor UX
- Usuário não sai da página
- Processo mais rápido
- Visual mais profissional

### 3. Mais Seguro
- SDK oficial do Mercado Pago
- Tokenização segura de cartões
- PCI Compliance automático

### 4. Compatível com Teste e Produção
- Funciona com credenciais TEST-
- Funciona com credenciais de produção
- Mesma implementação para ambos

## Cartões de Teste do Mercado Pago

Para testar pagamentos, use estes cartões:

### Cartão Aprovado
```
Número: 5031 4332 1540 6351
CVV: 123
Validade: 11/25
Nome: APRO
CPF: Qualquer CPF válido
```

### Cartão Recusado
```
Número: 5031 4332 1540 6351
CVV: 123
Validade: 11/25
Nome: OTHE
CPF: Qualquer CPF válido
```

### Outros Cartões de Teste
- **APRO**: Pagamento aprovado
- **CONT**: Pagamento pendente
- **CALL**: Recusado, ligar para autorizar
- **FUND**: Recusado por saldo insuficiente
- **SECU**: Recusado por código de segurança
- **EXPI**: Recusado por data de validade
- **FORM**: Recusado por erro no formulário
- **OTHE**: Recusado geral

Documentação completa: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/test-cards

## Configuração

### Desenvolvimento (Local)

#### Frontend (.env.local)
```env
VITE_MERCADO_PAGO_PUBLIC_KEY=TEST-ea423066-0567-48a7-800c-f1a39833ce5e
```

#### Backend (.env.local)
```env
MERCADO_PAGO_PUBLIC_KEY=TEST-ea423066-0567-48a7-800c-f1a39833ce5e
MERCADO_PAGO_ACCESS_TOKEN=TEST-295373260675697-121217-6e2dd435f6708fc53d0de81b5627652a-606002420
MERCADO_PAGO_WEBHOOK_TOKEN=webhook_secure_token_2026_mp_crm_b2g_production
FRONTEND_URL=http://localhost:5174
API_URL=http://localhost:3002
```

### Produção (Vercel)

Configurar variáveis de ambiente na Vercel:

#### Frontend
```env
VITE_MERCADO_PAGO_PUBLIC_KEY=<sua-chave-publica-de-producao>
```

#### Backend
```env
MERCADO_PAGO_PUBLIC_KEY=<sua-chave-publica-de-producao>
MERCADO_PAGO_ACCESS_TOKEN=<seu-token-de-acesso-de-producao>
MERCADO_PAGO_WEBHOOK_TOKEN=<token-seguro-para-webhook>
FRONTEND_URL=https://crmautomatizadob2g.vercel.app
API_URL=https://crmautomatizadob2g.vercel.app/api
```

## Como Testar

### 1. Iniciar Servidores
```bash
# Backend
cd apps/api
npm run dev

# Frontend (em outro terminal)
cd apps/web
npm run dev
```

### 2. Acessar Checkout
```
http://localhost:5174/checkout?plan=starter
```

### 3. Preencher Dados
- Dados da empresa
- Dados do responsável
- Dados do administrador

### 4. Clicar em "Pagar"
- Modal do Mercado Pago abre
- Preencher dados do cartão de teste
- Confirmar pagamento

### 5. Verificar Logs

#### Console do Navegador (F12)
```
🔵 Iniciando pagamento...
📡 Response status: 200
📦 Resposta bruta: {...}
💳 Preference ID: 606002420-...
🔑 MP Public Key: TEST-ea423066...
✅ Inicializando Mercado Pago SDK...
✅ Abrindo checkout do Mercado Pago...
```

#### Terminal do Backend
```
🔵 Iniciando create-preference
💳 Mercado Pago configurado!
📤 Enviando preferência para MP: {...}
✅ Preferência criada no MP: 606002420-...
📤 Response final: {...}
```

## Troubleshooting

### Modal não abre
- Verifique se o SDK foi carregado: `console.log(window.MercadoPago)`
- Verifique se a chave pública está correta
- Verifique se o preferenceId foi recebido

### Erro de CORS
- Se ainda houver erro de CORS, limpe o cache do navegador
- Verifique se está usando o SDK v2 do MP
- Confirme que não está redirecionando para outra página

### Pagamento não confirma
- Verifique os logs do webhook na Vercel
- Confirme que o webhook está configurado corretamente
- Teste o endpoint de confirmação manualmente

### Cartão de teste não funciona
- Use exatamente os dados fornecidos acima
- Nome do titular deve ser "APRO" para aprovação
- CPF pode ser qualquer um válido

## Arquivos Modificados

1. `apps/web/index.html` - Adicionado SDK do MP
2. `apps/web/src/pages/Checkout.jsx` - Implementado modal do MP
3. `apps/web/.env.local` - Adicionada chave pública
4. `apps/api/api/checkout.cjs` - Melhorias no backend
5. `apps/api/.env.local` - Atualizada URL do frontend

## Status Atual

✅ SDK do Mercado Pago carregado
✅ Modal abre corretamente
✅ Sem erros de CORS
✅ Cartões de teste funcionando
✅ Fluxo completo implementado
✅ Logs detalhados para debug

## Próximos Passos

1. ✅ Testar com cartão de teste APRO
2. ✅ Verificar se o modal abre
3. ✅ Confirmar que não há erros de CORS
4. ✅ Testar fluxo completo até criação da conta
5. ⚠️ Configurar credenciais de produção na Vercel
6. ⚠️ Testar em produção

## Observações Importantes

- O modal do MP é responsivo e funciona em mobile
- Os dados do cartão nunca passam pelo nosso servidor
- O MP cuida de toda a segurança e tokenização
- Webhook é opcional mas recomendado para produção
- Em teste, alguns métodos de pagamento são desabilitados automaticamente

## Suporte

Se houver problemas:
1. Verifique os logs do console (F12)
2. Verifique os logs do backend
3. Confirme que o SDK foi carregado
4. Teste com cartões de teste oficiais do MP
5. Limpe cache e cookies do navegador
