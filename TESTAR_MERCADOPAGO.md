# Como Testar Pagamento com Mercado Pago

## Status Atual

✅ Credenciais do Mercado Pago configuradas no `.env.local`
✅ Token de acesso: `TEST-295373260675697-121217-...` (70 caracteres)
✅ Chave pública: `TEST-ea423066-0567-48a7-800c-f1a39833ce5e`
✅ Webhook token: `webhook_secure_token_2026_mp_crm_b2g_production`

## Credenciais Configuradas

```env
MERCADO_PAGO_PUBLIC_KEY=TEST-ea423066-0567-48a7-800c-f1a39833ce5e
MERCADO_PAGO_ACCESS_TOKEN=TEST-295373260675697-121217-6e2dd435f6708fc53d0de81b5627652a-606002420
MERCADO_PAGO_WEBHOOK_TOKEN=webhook_secure_token_2026_mp_crm_b2g_production
```

## Como Funciona

### Fluxo com Mercado Pago Configurado

1. **Usuário preenche dados** → Checkout.jsx
2. **Clica em "Pagar"** → POST `/api/checkout/create-preference`
3. **Backend cria preferência no MP** → Retorna URL de pagamento
4. **Redireciona para Mercado Pago** → Usuário paga no site do MP
5. **MP processa pagamento** → Envia webhook para `/api/checkout/webhook`
6. **Backend cria empresa** → Gera token de setup
7. **Envia email** → Com link `/setup?token=abc123`
8. **Usuário acessa link** → Cria conta de administrador

### URLs de Retorno Configuradas

```javascript
back_urls: {
  success: 'http://localhost:5173/checkout/success?subscription=ID',
  failure: 'http://localhost:5173/checkout/failure',
  pending: 'http://localhost:5173/checkout/pending'
}
```

## Cartões de Teste do Mercado Pago

### Cartão Aprovado
- **Número**: 5031 4332 1540 6351
- **CVV**: 123
- **Validade**: 11/25
- **Nome**: APRO (qualquer nome)
- **CPF**: Qualquer CPF válido

### Outros Cartões de Teste

| Status | Número do Cartão | CVV | Validade |
|--------|------------------|-----|----------|
| Aprovado | 5031 4332 1540 6351 | 123 | 11/25 |
| Recusado | 5031 4332 1540 6351 | 123 | 11/25 |
| Pendente | 5031 4332 1540 6351 | 123 | 11/25 |

**Dica**: Use o nome do titular para controlar o resultado:
- `APRO` → Aprovado
- `OTHE` → Recusado (fundos insuficientes)
- `CONT` → Pendente

## Passo a Passo para Testar

### 1. Iniciar Servidores

```bash
# Terminal 1 - Backend
cd apps/api
npm run dev

# Terminal 2 - Frontend
cd apps/web
npm run dev
```

### 2. Acessar Checkout

1. Abra `http://localhost:5173`
2. Clique em "Começar Agora" ou escolha um plano
3. Preencha os dados:
   - Nome da Empresa: `Empresa Teste Ltda`
   - CNPJ: `12.345.678/0001-90`
   - Email: `contato@empresateste.com`
   - Telefone: `(11) 98765-4321`
   - Nome do Responsável: `João Silva`
   - Email do Responsável: `joao@empresateste.com`
   - Telefone do Responsável: `(11) 98765-4321`

### 3. Processar Pagamento

1. Clique em "Continuar para Pagamento"
2. Clique em "Pagar R$ 297" (ou valor do plano)
3. **Você será redirecionado para o Mercado Pago**
4. Use o cartão de teste:
   - Número: `5031 4332 1540 6351`
   - CVV: `123`
   - Validade: `11/25`
   - Nome: `APRO`
   - CPF: Qualquer CPF válido

### 4. Verificar Logs

**No terminal do backend**, você deve ver:

```
💳 Mercado Pago configurado! Criando preferência de pagamento...
   Access Token: TEST-295373260675697...
📤 Enviando preferência para MP: {...}
```

**Após o pagamento**, o webhook será chamado:

```
📥 Webhook recebido: { type: 'payment', data: { id: '...' } }
💳 Pagamento: { id: '...', status: 'approved', subscriptionId: '...' }
✅ Pagamento aprovado! Criando empresa...
🎉 Empresa criada com sucesso!
✉️  Email de setup:
Para: joao@empresateste.com
Link: http://localhost:5173/setup?token=abc123...
```

### 5. Criar Conta Admin

Como o email não está configurado, você precisa:

1. Copiar o token do log: `abc123...`
2. Acessar manualmente: `http://localhost:5173/setup?token=abc123...`
3. Preencher dados do administrador
4. Clicar em "Criar Conta de Administrador"
5. Fazer login com as credenciais criadas

## Troubleshooting

### Problema: Pagamento simulado em vez de real

**Sintoma**: Redireciona direto para `/setup` sem ir para Mercado Pago

**Causa**: Token do MP não está sendo lido

**Solução**:
```bash
# Verificar se variáveis estão carregadas
node -e "require('./apps/api/lib/load-env.cjs'); console.log('MP Token:', process.env.MERCADO_PAGO_ACCESS_TOKEN ? 'OK' : 'FALTANDO');"

# Reiniciar backend
cd apps/api
npm run dev
```

### Problema: Erro 401 do Mercado Pago

**Sintoma**: `Erro ao criar preferência no Mercado Pago`

**Causa**: Token inválido ou expirado

**Solução**: Gerar novo token no painel do Mercado Pago

### Problema: Webhook não é chamado

**Sintoma**: Pagamento aprovado mas empresa não é criada

**Causa**: Webhook URL não acessível (localhost)

**Solução**: 
- Em desenvolvimento, use ngrok ou similar
- Ou acesse manualmente `/api/checkout/success/:subscriptionId`

## Configuração para Produção

### 1. Obter Credenciais de Produção

1. Acesse https://www.mercadopago.com.br/developers
2. Vá em "Suas integrações" → "Credenciais"
3. Copie as credenciais de PRODUÇÃO (não TEST)

### 2. Configurar na Vercel

```bash
vercel env add MERCADO_PAGO_ACCESS_TOKEN
# Cole o token de PRODUÇÃO

vercel env add MERCADO_PAGO_PUBLIC_KEY
# Cole a chave pública de PRODUÇÃO

vercel env add MERCADO_PAGO_WEBHOOK_TOKEN
# Crie um token seguro aleatório
```

### 3. Configurar Webhook no Mercado Pago

1. Acesse https://www.mercadopago.com.br/developers
2. Vá em "Suas integrações" → "Webhooks"
3. Adicione URL: `https://crmautomatizadob2g.vercel.app/api/checkout/webhook`
4. Selecione eventos: `payment`

## Próximos Passos

1. ✅ Testar pagamento com cartão de teste
2. ⏳ Configurar envio de email com link de setup
3. ⏳ Criar páginas de sucesso/falha/pendente
4. ⏳ Adicionar credenciais de produção na Vercel
5. ⏳ Configurar webhook no painel do Mercado Pago

## Referências

- [Documentação Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs)
- [Cartões de Teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-api/testing)
- [Webhooks](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks)
