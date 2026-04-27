# 💳 Fluxo de Contratação com Mercado Pago - CRM NEXOS

## 🎯 Visão Geral

Implementado fluxo completo de contratação de planos com integração ao Mercado Pago e criação automática de conta de administrador.

---

## 🔄 Fluxo Completo

### 1. Landing Page (/)
- Usuário visualiza os planos disponíveis
- Botão "Ver Planos" rola para a seção de planos
- Botão "Contratar Plano" redireciona para `/checkout?plan=ID`

### 2. Página de Checkout (/checkout)
**Etapa 1: Dados da Empresa**
- Nome da empresa
- CNPJ
- Email e telefone
- Dados do responsável (nome, email, telefone)

**Etapa 2: Pagamento**
- Resumo dos dados preenchidos
- Botão "Pagar" cria preferência no Mercado Pago
- Redireciona para página de pagamento do MP

### 3. Processamento do Pagamento
**Mercado Pago:**
- Cliente paga via Pix, cartão ou boleto
- MP envia webhook para `/api/checkout/webhook`
- Sistema atualiza status da assinatura

**Desenvolvimento (sem MP configurado):**
- Pagamento é aprovado automaticamente
- Pula para próxima etapa

### 4. Criação da Empresa
Após aprovação do pagamento:
- Cria registro em `TenantCompany`
- Gera token de setup (válido por 24h)
- Envia email com link de setup

### 5. Setup da Conta Admin (/setup?token=XXX)
- Cliente acessa link do email
- Preenche dados do administrador:
  - Nome completo
  - Email (pré-preenchido)
  - Senha
- Sistema cria usuário com role ADMIN
- Redireciona para login

### 6. Primeiro Acesso
- Admin faz login com credenciais criadas
- Acessa painel de administração
- Pode criar usuários adicionais

---

## 📁 Arquivos Criados/Modificados

### Frontend

#### Novos Arquivos
1. `apps/web/src/pages/Checkout.jsx`
   - Formulário de dados da empresa
   - Integração com API de checkout
   - Fluxo de 2 etapas

2. `apps/web/src/pages/Setup.jsx`
   - Verificação de token
   - Criação de conta admin
   - Validação de senha

#### Modificados
1. `apps/web/src/pages/DashboardHome.jsx`
   - Botão "Começar Grátis" → "Ver Planos"
   - Botão "Contratar plano" → redireciona para checkout
   - Scroll suave para seção de planos

2. `apps/web/src/App.jsx`
   - Adicionada rota `/checkout`
   - Adicionada rota `/setup`

3. `apps/web/src/config/api.js`
   - Endpoint `publicCheckoutConfirm` atualizado

### Backend

#### Novos Arquivos
1. `apps/api/api/checkout.cjs`
   - POST `/api/checkout/create-preference` - Criar preferência MP
   - POST `/api/checkout/webhook` - Receber notificações MP
   - GET `/api/checkout/success/:id` - Verificar status
   - GET `/api/checkout/verify-token/:token` - Verificar token setup
   - POST `/api/checkout/setup-admin` - Criar admin

#### Modificados
1. `apps/api/server.cjs`
   - Registrada rota `/api/checkout`

2. `apps/api/prisma/schema.prisma`
   - Adicionado model `PendingSubscription`

---

## 🗄️ Modelo de Dados

### PendingSubscription
```prisma
model PendingSubscription {
  id                String   @id @default(uuid())
  planId            String
  planName          String
  price             Float
  companyName       String
  document          String
  email             String
  phone             String
  responsibleName   String
  responsibleEmail  String
  responsiblePhone  String
  status            String   @default("PENDING")
  paymentData       Json     @default("{}")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

### Estrutura do paymentData
```json
{
  "preferenceId": "MP-123456",
  "initPoint": "https://mercadopago.com/...",
  "paymentId": "123456789",
  "status": "approved",
  "approvedAt": "2026-04-06T...",
  "companyId": "uuid-da-empresa",
  "setupToken": "token-aleatorio",
  "setupTokenExpiry": "2026-04-07T...",
  "adminCreated": true,
  "adminUserId": "uuid-do-admin",
  "adminCreatedAt": "2026-04-06T..."
}
```

---

## ⚙️ Configuração do Mercado Pago

### Variáveis de Ambiente (.env)

```bash
# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=seu-access-token-aqui
MERCADO_PAGO_PUBLIC_KEY=sua-public-key-aqui

# URLs
FRONTEND_URL=https://crmautomatizadob2g.vercel.app
API_URL=https://crmautomatizadob2g.vercel.app/api
```

### Obter Credenciais

1. Acesse: https://www.mercadopago.com.br/developers
2. Vá em "Suas integrações"
3. Crie uma aplicação
4. Copie:
   - Access Token (Production)
   - Public Key (Production)

### Configurar Webhook

1. No painel do MP, vá em "Webhooks"
2. Adicione URL: `https://seu-dominio.com/api/checkout/webhook`
3. Selecione eventos: `payment`

---

## 🧪 Testando o Fluxo

### Desenvolvimento (Sem Mercado Pago)

O sistema detecta automaticamente se o MP não está configurado e simula a aprovação:

```bash
# Não configure MERCADO_PAGO_ACCESS_TOKEN
# O pagamento será aprovado automaticamente
```

**Fluxo:**
1. Acesse: http://localhost:5174
2. Clique em "Ver Planos"
3. Escolha um plano e clique em "Contratar Plano"
4. Preencha os dados
5. Clique em "Continuar para Pagamento"
6. Clique em "Pagar"
7. Sistema aprova automaticamente
8. Você receberá o link de setup no console

### Produção (Com Mercado Pago)

**Teste com Cartão de Teste:**
```
Número: 5031 4332 1540 6351
CVV: 123
Validade: 11/25
Nome: APRO (aprovado) ou OTHE (outro status)
```

**Fluxo:**
1. Cliente escolhe plano
2. Preenche dados
3. É redirecionado para MP
4. Paga com cartão/pix/boleto
5. MP envia webhook
6. Sistema cria empresa
7. Cliente recebe email com link
8. Cliente cria conta admin
9. Cliente faz login

---

## 📧 Email de Setup (TODO)

Implementar envio de email com:
- Link de setup: `https://dominio.com/setup?token=XXX`
- Validade: 24 horas
- Instruções de acesso

**Serviços sugeridos:**
- SendGrid
- AWS SES
- Mailgun
- Resend

---

## 🔒 Segurança

### Token de Setup
- Gerado com `crypto.randomBytes(32)`
- Válido por 24 horas
- Uso único (marcado após criação do admin)
- Armazenado em JSON criptografado

### Senha do Admin
- Mínimo 6 caracteres
- Hash com bcrypt (10 rounds)
- Validação de confirmação

### Webhook do Mercado Pago
- Verificar assinatura (TODO)
- Validar origem da requisição
- Processar apenas eventos válidos

---

## 📊 Planos Disponíveis

### Starter - R$ 297/mês
- Até 3 usuários
- 1 produto (B2B ou B2G)
- Suporte por email
- Relatórios básicos

### Professional - R$ 697/mês (Mais Popular)
- Até 10 usuários
- 2 produtos inclusos
- Suporte prioritário
- Relatórios avançados
- Integrações API

### Enterprise - Sob Consulta
- Usuários ilimitados
- Todos os produtos
- Suporte dedicado 24/7
- Customizações
- SLA garantido

---

## 🚀 Próximos Passos

### Imediato
- [ ] Executar migração do banco: `npx prisma migrate dev`
- [ ] Testar fluxo completo em desenvolvimento
- [ ] Configurar credenciais do Mercado Pago

### Curto Prazo
- [ ] Implementar envio de email
- [ ] Adicionar validação de webhook do MP
- [ ] Criar página de sucesso/falha customizada
- [ ] Adicionar analytics de conversão

### Médio Prazo
- [ ] Implementar assinaturas recorrentes
- [ ] Adicionar upgrade/downgrade de planos
- [ ] Criar painel de billing para admin
- [ ] Implementar cancelamento de assinatura

---

## 🐛 Troubleshooting

### Erro: "Token inválido"
- Verificar se o token está correto na URL
- Verificar se não expirou (24h)
- Verificar se já foi usado

### Erro: "Email já cadastrado"
- Email já existe no sistema
- Usar outro email ou fazer login

### Pagamento não aprovado
- Verificar webhook do MP
- Verificar logs da API
- Verificar status no painel do MP

### Setup não funciona
- Verificar se empresa foi criada
- Verificar se token foi gerado
- Verificar logs do backend

---

## 📝 Comandos Úteis

### Executar Migração
```bash
cd apps/api
npx prisma migrate dev --name add_checkout_tables
```

### Ver Banco de Dados
```bash
cd apps/api
npx prisma studio
```

### Testar Webhook Localmente
```bash
# Usar ngrok para expor localhost
ngrok http 3002

# Configurar webhook no MP com URL do ngrok
https://xxx.ngrok.io/api/checkout/webhook
```

### Verificar Logs
```bash
# Backend
tail -f apps/api/logs/app.log

# Frontend (console do navegador)
```

---

**Status**: ✅ Implementado  
**Testado**: ⏳ Aguardando testes  
**Pronto para Produção**: ⏳ Após configurar MP e testar
