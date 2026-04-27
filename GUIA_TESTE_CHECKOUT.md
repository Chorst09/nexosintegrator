# Guia de Teste - Checkout Mercado Pago

## ✅ Testes Automatizados Passaram

Executei testes automatizados e todos passaram:
- ✅ Backend rodando na porta 3002
- ✅ Frontend rodando na porta 5174
- ✅ Preferência criada com sucesso
- ✅ SDK do Mercado Pago carregado
- ✅ Variáveis de ambiente configuradas

## 🧪 Como Testar Manualmente

### Passo 1: Acessar o Checkout
```
http://localhost:5174/checkout?plan=starter
```

### Passo 2: Preencher Dados da Empresa
- **Nome da Empresa**: Teste Empresa Ltda
- **CNPJ**: 12.345.678/0001-90
- **Email**: contato@teste.com
- **Telefone**: (11) 99999-9999

### Passo 3: Preencher Dados do Responsável
- **Nome**: João Silva
- **Email**: joao@teste.com
- **Telefone**: (11) 98888-8888

### Passo 4: Preencher Dados do Administrador
- **Nome**: Admin Teste
- **Email**: admin@teste.com
- **Senha**: teste123
- **Confirmar Senha**: teste123

### Passo 5: Clicar em "Continuar para Pagamento"

### Passo 6: Clicar em "Pagar R$ 297"

### Passo 7: Aguardar Redirecionamento

O sistema vai tentar abrir o modal do Mercado Pago. Se houver problemas de CORS (comum em modo de teste), o sistema vai redirecionar automaticamente para a página do Mercado Pago.

### Passo 8: Preencher Dados do Cartão de Teste

Na página do Mercado Pago, use estes dados:

#### Para Pagamento APROVADO:
```
Número do cartão: 5031 4332 1540 6351
Nome do titular: APRO
Vencimento: 11/30
Código de segurança: 123
CPF: 123.456.789-09
```

#### Para Pagamento RECUSADO (teste de erro):
```
Número do cartão: 5031 4332 1540 6351
Nome do titular: OTHE
Vencimento: 11/30
Código de segurança: 123
CPF: 123.456.789-09
```

### Passo 9: Confirmar Pagamento

Clique em "Pagar" ou "Continuar" no formulário do Mercado Pago.

### Passo 10: Aguardar Retorno

O Mercado Pago vai processar o pagamento e redirecionar de volta para:
```
http://localhost:5174/checkout?plan=starter&status=success&payment_id=...
```

### Passo 11: Verificar Criação da Conta

O sistema deve:
1. Confirmar o pagamento
2. Criar a empresa no banco de dados
3. Criar o usuário administrador
4. Redirecionar para a página de login

## 🔍 Logs para Verificar

### Console do Navegador (F12)

Você deve ver:
```
🔵 Iniciando pagamento...
📡 Response status: 200
📦 Resposta bruta: {...}
💳 Payment URL: https://www.mercadopago.com.br/...
💳 Preference ID: 606002420-...
✅ Tentando usar SDK do Mercado Pago...
```

Se o SDK falhar (comum em teste), você verá:
```
⚠️  Erro ao usar SDK do MP, usando fallback
✅ Redirecionando para URL do Mercado Pago...
```

### Terminal do Backend

Você deve ver:
```
🔵 Iniciando create-preference
   Plan ID: starter
   Company: Teste Empresa Ltda
   MP Token presente: true
💳 Mercado Pago configurado!
📤 Enviando preferência para MP: {...}
✅ Preferência criada no MP: 606002420-...
📤 Response final: {...}
```

## ⚠️ Problemas Conhecidos e Soluções

### Problema 1: Modal não abre (CORS)
**Sintoma**: Erros de CORS no console
**Solução**: O sistema detecta automaticamente e redireciona para a página do MP

### Problema 2: Página do MP não carrega
**Sintoma**: Página em branco ou erro 403
**Solução**: 
1. Limpe o cache do navegador
2. Tente em modo anônimo
3. Verifique se as credenciais de teste estão corretas

### Problema 3: Pagamento não confirma
**Sintoma**: Fica na página de pagamento
**Solução**:
1. Verifique se usou o nome "APRO" no cartão
2. Verifique se o CPF é válido
3. Tente outro cartão de teste

### Problema 4: Não redireciona de volta
**Sintoma**: Fica na página do MP após pagar
**Solução**:
1. Copie a URL de retorno manualmente
2. Verifique se o localStorage tem os dados salvos
3. Verifique os logs do webhook no backend

## 📊 Verificar no Banco de Dados

Após o pagamento, verifique se foi criado:

### PendingSubscription
```sql
SELECT * FROM "PendingSubscription" 
WHERE status = 'APPROVED' 
ORDER BY "createdAt" DESC 
LIMIT 1;
```

### TenantCompany
```sql
SELECT * FROM "TenantCompany" 
ORDER BY "createdAt" DESC 
LIMIT 1;
```

### User (Admin)
```sql
SELECT * FROM "User" 
WHERE role = 'ADMIN' 
ORDER BY "createdAt" DESC 
LIMIT 1;
```

## 🎯 Resultado Esperado

Após completar todos os passos:

1. ✅ Preferência criada no Mercado Pago
2. ✅ Pagamento processado com sucesso
3. ✅ Empresa criada no banco de dados
4. ✅ Usuário administrador criado
5. ✅ Redirecionamento para login
6. ✅ Possível fazer login com as credenciais criadas

## 🚀 Testar em Produção

Para testar em produção (https://crmautomatizadob2g.vercel.app):

1. Configure as credenciais de PRODUÇÃO do Mercado Pago na Vercel
2. Use cartões de teste de PRODUÇÃO (diferentes dos de sandbox)
3. Ou use um cartão real (será cobrado!)

## 📝 Checklist de Teste

- [ ] Servidores rodando (backend e frontend)
- [ ] Formulário carrega sem erros
- [ ] Dados são validados corretamente
- [ ] Botão "Pagar" funciona
- [ ] Preferência é criada no MP
- [ ] Redireciona para página/modal do MP
- [ ] Formulário de cartão aparece
- [ ] Cartão de teste é aceito
- [ ] Pagamento é processado
- [ ] Redireciona de volta para o sistema
- [ ] Empresa é criada no banco
- [ ] Usuário admin é criado
- [ ] Possível fazer login

## 🆘 Suporte

Se algo não funcionar:

1. Execute o script de teste: `./test-checkout-flow.sh`
2. Verifique os logs do console (F12)
3. Verifique os logs do backend
4. Verifique o banco de dados
5. Limpe cache e cookies
6. Tente em modo anônimo

## 📚 Documentação Adicional

- [Cartões de Teste do Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/test-cards)
- [Checkout Pro - Documentação](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/landing)
- [Integração via SDK](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/integrate-checkout-pro/web)
