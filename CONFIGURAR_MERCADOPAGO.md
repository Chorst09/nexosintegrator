# 💳 Configurar Mercado Pago - Guia Completo

## 🎯 Credenciais Necessárias

Para o sistema funcionar com pagamentos reais, você precisa de **2 credenciais**:

### 1. Access Token (Obrigatório)
- **Nome da variável**: `MERCADO_PAGO_ACCESS_TOKEN`
- **Uso**: Autenticação da API do Mercado Pago
- **Onde usar**: Backend (API)

### 2. Public Key (Opcional - para checkout transparente)
- **Nome da variável**: `MERCADO_PAGO_PUBLIC_KEY`
- **Uso**: Checkout transparente (se implementar no futuro)
- **Onde usar**: Frontend

---

## 📋 Passo a Passo para Obter as Credenciais

### 1. Criar/Acessar Conta no Mercado Pago

1. Acesse: https://www.mercadopago.com.br
2. Faça login ou crie uma conta
3. Complete o cadastro da sua empresa

### 2. Acessar o Painel de Desenvolvedores

1. Acesse: https://www.mercadopago.com.br/developers
2. Faça login com sua conta
3. Clique em "Suas integrações"

### 3. Criar uma Aplicação

1. Clique em "Criar aplicação"
2. Preencha os dados:
   - **Nome**: CRM NEXOS
   - **Descrição**: Sistema de CRM com checkout integrado
   - **Modelo de integração**: Checkout Pro
3. Clique em "Criar aplicação"

### 4. Copiar as Credenciais

Após criar a aplicação, você verá duas abas:

#### Credenciais de Teste (Sandbox)
- Use para testar sem cobrar de verdade
- Access Token começa com: `TEST-`
- Public Key começa com: `TEST-`

#### Credenciais de Produção
- Use para pagamentos reais
- Access Token começa com: `APP_USR-`
- Public Key começa com: `APP_USR-`

**Copie o Access Token de Produção** (é o mais importante!)

---

## ⚙️ Configurar no Sistema

### Opção 1: Desenvolvimento Local

Edite o arquivo `apps/api/.env`:

```bash
# Mercado Pago - Produção
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-1234567890123456-123456-1234567890abcdef1234567890abcdef-123456789
MERCADO_PAGO_PUBLIC_KEY=APP_USR-abcd1234-1234-1234-1234-abcdef123456

# URLs
FRONTEND_URL=http://localhost:5174
API_URL=http://localhost:3002
```

### Opção 2: Produção (Vercel)

1. Acesse: https://vercel.com/chorstconsult-6872s-projects/crmautomatizadob2g/settings/environment-variables

2. Adicione as variáveis:

| Nome | Valor | Ambiente |
|------|-------|----------|
| `MERCADO_PAGO_ACCESS_TOKEN` | `APP_USR-...` | Production, Preview, Development |
| `MERCADO_PAGO_PUBLIC_KEY` | `APP_USR-...` | Production, Preview, Development |
| `FRONTEND_URL` | `https://crmautomatizadob2g.vercel.app` | Production |
| `API_URL` | `https://crmautomatizadob2g.vercel.app/api` | Production |

3. Clique em "Save"

4. Faça um novo deploy:
```bash
vercel --prod
```

---

## 🔔 Configurar Webhook (Importante!)

O webhook é necessário para receber notificações de pagamento aprovado.

### 1. No Painel do Mercado Pago

1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Selecione sua aplicação
3. Vá em "Webhooks" no menu lateral
4. Clique em "Configurar notificações"

### 2. Configurar URL do Webhook

**Produção:**
```
https://crmautomatizadob2g.vercel.app/api/checkout/webhook
```

**Desenvolvimento (usando ngrok):**
```bash
# Instalar ngrok
brew install ngrok  # Mac
# ou baixe em: https://ngrok.com/download

# Expor porta 3002
ngrok http 3002

# Use a URL gerada:
https://abc123.ngrok.io/api/checkout/webhook
```

### 3. Selecionar Eventos

Marque apenas:
- ✅ `payment` - Pagamentos

### 4. Salvar

Clique em "Salvar" e teste o webhook.

---

## 🧪 Testar a Integração

### Teste com Credenciais de Teste (Sandbox)

Use estas credenciais para testar sem cobrar:

**Cartões de Teste:**

| Cartão | Número | CVV | Validade | Nome | Resultado |
|--------|--------|-----|----------|------|-----------|
| Mastercard | 5031 4332 1540 6351 | 123 | 11/25 | APRO | ✅ Aprovado |
| Visa | 4235 6477 2802 5682 | 123 | 11/25 | APRO | ✅ Aprovado |
| Mastercard | 5031 4332 1540 6351 | 123 | 11/25 | OTHE | ⏳ Pendente |
| Visa | 4235 6477 2802 5682 | 123 | 11/25 | CALL | ❌ Recusado |

**CPF de Teste:** 123.456.789-01

### Fluxo de Teste

1. Acesse: https://crmautomatizadob2g.vercel.app
2. Clique em "Ver Planos"
3. Escolha "Starter" ou "Professional"
4. Preencha os dados da empresa
5. Clique em "Continuar para Pagamento"
6. Clique em "Pagar"
7. Você será redirecionado para o Mercado Pago
8. Use um cartão de teste
9. Complete o pagamento
10. Você será redirecionado de volta
11. Verifique se recebeu o email de setup

---

## 🔍 Verificar se Está Funcionando

### 1. Verificar Logs da API

```bash
# Ver logs da Vercel
vercel logs https://crmautomatizadob2g.vercel.app

# Procurar por:
# - "Criando preferência no Mercado Pago"
# - "Webhook recebido"
# - "Pagamento aprovado"
```

### 2. Verificar no Painel do Mercado Pago

1. Acesse: https://www.mercadopago.com.br/activities
2. Veja os pagamentos recebidos
3. Verifique o status

### 3. Verificar no Banco de Dados

```sql
-- Ver assinaturas pendentes
SELECT * FROM "PendingSubscription" 
ORDER BY "createdAt" DESC 
LIMIT 10;

-- Ver assinaturas aprovadas
SELECT * FROM "PendingSubscription" 
WHERE status = 'APPROVED'
ORDER BY "createdAt" DESC;

-- Ver empresas criadas
SELECT * FROM "TenantCompany" 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

---

## ⚠️ Modo Simulado (Sem Mercado Pago)

Se você **NÃO configurar** as credenciais do Mercado Pago, o sistema funciona em **modo simulado**:

- ✅ Pagamento é aprovado automaticamente
- ✅ Empresa é criada
- ✅ Token de setup é gerado
- ✅ Email é "enviado" (aparece no console)
- ⚠️ Não há cobrança real

**Útil para:**
- Desenvolvimento
- Testes internos
- Demonstrações

---

## 💰 Taxas do Mercado Pago

### Checkout Pro (o que estamos usando)

| Método | Taxa |
|--------|------|
| Cartão de Crédito | 4,99% + R$ 0,39 |
| Cartão de Débito | 3,99% + R$ 0,39 |
| Pix | 0,99% |
| Boleto | R$ 3,49 |

**Exemplo:**
- Plano Starter: R$ 297,00
- Taxa (cartão): R$ 15,19
- Você recebe: R$ 281,81

### Recebimento

- **Cartão**: D+14 ou D+30 (configurável)
- **Pix**: Imediato
- **Boleto**: D+2 após compensação

---

## 🔒 Segurança

### Boas Práticas

1. ✅ **Nunca** commite as credenciais no Git
2. ✅ Use variáveis de ambiente
3. ✅ Mantenha o Access Token secreto
4. ✅ Valide o webhook (verificar assinatura)
5. ✅ Use HTTPS em produção

### Validar Webhook (TODO)

Adicione validação de assinatura no webhook:

```javascript
// apps/api/api/checkout.cjs
const crypto = require('crypto');

function validateWebhook(req) {
  const xSignature = req.headers['x-signature'];
  const xRequestId = req.headers['x-request-id'];
  
  // Validar assinatura
  // Documentação: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
  
  return true; // Implementar validação real
}
```

---

## 📞 Suporte

### Documentação Oficial
- Guia: https://www.mercadopago.com.br/developers/pt/docs
- API Reference: https://www.mercadopago.com.br/developers/pt/reference
- Webhooks: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks

### Suporte Mercado Pago
- Email: developers@mercadopago.com
- Fórum: https://www.mercadopago.com.br/developers/pt/support

### Testar Cartões
- Lista completa: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/test-cards

---

## ✅ Checklist de Configuração

- [ ] Criar conta no Mercado Pago
- [ ] Criar aplicação no painel de desenvolvedores
- [ ] Copiar Access Token de Produção
- [ ] Copiar Public Key de Produção
- [ ] Adicionar variáveis na Vercel
- [ ] Configurar webhook
- [ ] Testar com cartão de teste
- [ ] Verificar logs
- [ ] Verificar banco de dados
- [ ] Testar fluxo completo
- [ ] Validar recebimento de email
- [ ] Testar criação de conta admin

---

## 🚀 Resumo Rápido

**Mínimo necessário para funcionar:**

1. Access Token: `MERCADO_PAGO_ACCESS_TOKEN`
2. Configurar na Vercel
3. Configurar webhook
4. Testar!

**Sem configurar:** Sistema funciona em modo simulado (aprovação automática)

---

**Última atualização**: 06/04/2026  
**Status**: ✅ Pronto para configurar
