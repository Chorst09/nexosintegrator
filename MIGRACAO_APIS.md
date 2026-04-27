# 📋 Guia de Migração de APIs para Netlify Functions

## 🎯 Objetivo

Este guia explica como migrar as APIs existentes do Express para Netlify Functions.

## 🏗️ Estrutura Atual vs Nova

### Antes (Express)
```
apps/api/
├── server.cjs (Express server)
├── api/
│   ├── auth.cjs
│   ├── clients.js
│   ├── opportunities.js
│   └── ...
└── lib/
    ├── auth.cjs
    └── permissions.cjs
```

### Depois (Netlify Functions)
```
netlify/functions/
├── auth.js (Netlify Function)
├── clients.js
├── opportunities.js
├── lib/
│   ├── prisma.js
│   ├── auth.js
│   ├── permissions.js
│   └── response.js
└── prisma/
    └── schema.prisma
```

## 🔄 Padrão de Migração

### 1. Estrutura Básica de uma Netlify Function

```javascript
import getPrisma from './lib/prisma.js';
import { success, error, handleCORS } from './lib/response.js';
import { authenticateUser } from './lib/auth.js';

export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return handleCORS();
  }

  const prisma = getPrisma();
  const method = event.httpMethod;
  const path = event.path.replace('/.netlify/functions/nome-funcao', '');

  try {
    // Autenticação (se necessário)
    let user = null;
    if (requiresAuth(path, method)) {
      user = await authenticateUser(event.headers);
    }

    // Roteamento
    if (path === '/list' && method === 'GET') {
      // Lógica aqui
      const data = await prisma.model.findMany();
      return success(data);
    }

    if (path === '/create' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      // Lógica aqui
      const created = await prisma.model.create({ data: body });
      return success(created, 201);
    }

    return error('Rota não encontrada', 404);
  } catch (err) {
    console.error('Erro:', err);
    return error(err.message || 'Erro interno', 500);
  }
}
```

### 2. Converter Express Router para Netlify Function

#### Antes (Express):
```javascript
const express = require('express');
const router = express.Router();

router.get('/clients', authenticateToken, async (req, res) => {
  const clients = await prisma.client.findMany();
  res.json(clients);
});

router.post('/clients', authenticateToken, async (req, res) => {
  const client = await prisma.client.create({ data: req.body });
  res.status(201).json(client);
});

module.exports = router;
```

#### Depois (Netlify Function):
```javascript
import getPrisma from './lib/prisma.js';
import { success, error, handleCORS } from './lib/response.js';
import { authenticateUser } from './lib/auth.js';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return handleCORS();
  }

  const prisma = getPrisma();
  const method = event.httpMethod;
  const path = event.path.replace('/.netlify/functions/clients', '');

  try {
    const user = await authenticateUser(event.headers);

    // GET /clients
    if (path === '' && method === 'GET') {
      const clients = await prisma.client.findMany();
      return success(clients);
    }

    // POST /clients
    if (path === '' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const client = await prisma.client.create({ data: body });
      return success(client, 201);
    }

    return error('Rota não encontrada', 404);
  } catch (err) {
    return error(err.message, 500);
  }
}
```

## 📝 Checklist de Migração por API

### APIs Prioritárias (Já Migradas)

- [x] `auth.js` - Autenticação e usuários
- [x] `health.js` - Health check

### APIs a Migrar

#### Módulo B2B
- [ ] `clients.js` - Gestão de clientes
- [ ] `companies.js` - Gestão de empresas
- [ ] `opportunities.js` - Gestão de oportunidades
- [ ] `activities.js` - Gestão de atividades
- [ ] `products.js` - Gestão de produtos
- [ ] `proposals.js` - Gestão de propostas
- [ ] `contracts.js` - Gestão de contratos
- [ ] `dashboard.js` - Dashboard e métricas

#### Módulo B2G
- [ ] `b2g.js` - Editais e licitações
- [ ] `ai-analysis.js` - Análise de documentos com IA
- [ ] `saved-analyses.js` - Histórico de análises

#### Módulo Pré-Vendas
- [ ] `pre-vendas.js` - Solicitações de orçamento
- [ ] `solicitacoes.js` - Gestão de solicitações

#### Módulos Avançados
- [ ] `integrations.js` - Integrações
- [ ] `workflows.js` - Automações
- [ ] `post-sales.js` - Pós-venda
- [ ] `licensing.js` - Licenciamento

## 🛠️ Helpers Disponíveis

### Response Helpers

```javascript
import { success, error, handleCORS } from './lib/response.js';

// Sucesso
return success({ data: 'value' }); // 200
return success({ data: 'value' }, 201); // 201 Created

// Erro
return error('Mensagem de erro', 400); // 400 Bad Request
return error('Não autorizado', 401); // 401 Unauthorized
return error('Não encontrado', 404); // 404 Not Found
return error('Erro interno', 500); // 500 Internal Server Error

// CORS
return handleCORS(); // Para OPTIONS requests
```

### Auth Helpers

```javascript
import { authenticateUser, requireRole, generateToken } from './lib/auth.js';

// Autenticar usuário
const user = await authenticateUser(event.headers);

// Verificar role
requireRole(user, ['ADMIN', 'MANAGER']); // Throws error se não autorizado

// Gerar token
const token = generateToken(userId);
```

### Prisma Helper

```javascript
import getPrisma from './lib/prisma.js';

const prisma = getPrisma();
const users = await prisma.user.findMany();
```

## 🔍 Diferenças Importantes

### 1. Request Object

**Express:**
```javascript
req.body // Já parseado
req.query // Query params
req.params // URL params
req.headers // Headers
req.user // Usuário autenticado (via middleware)
```

**Netlify:**
```javascript
JSON.parse(event.body || '{}') // Body precisa ser parseado
event.queryStringParameters // Query params
event.pathParameters // URL params (não usado, usamos path parsing)
event.headers // Headers
await authenticateUser(event.headers) // Autenticação manual
```

### 2. Response Object

**Express:**
```javascript
res.json({ data: 'value' })
res.status(201).json({ data: 'value' })
res.status(404).json({ error: 'Not found' })
```

**Netlify:**
```javascript
return success({ data: 'value' })
return success({ data: 'value' }, 201)
return error('Not found', 404)
```

### 3. Middleware

**Express:**
```javascript
router.get('/route', authenticateToken, requireRole(['ADMIN']), handler);
```

**Netlify:**
```javascript
// Dentro do handler
const user = await authenticateUser(event.headers);
requireRole(user, ['ADMIN']);
```

### 4. Error Handling

**Express:**
```javascript
try {
  // código
} catch (error) {
  res.status(500).json({ error: error.message });
}
```

**Netlify:**
```javascript
try {
  // código
} catch (err) {
  return error(err.message, 500);
}
```

## 📦 Template para Nova Function

Crie um arquivo `netlify/functions/nome-da-api.js`:

```javascript
import getPrisma from './lib/prisma.js';
import { success, error, handleCORS } from './lib/response.js';
import { authenticateUser, requireRole } from './lib/auth.js';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return handleCORS();
  }

  const prisma = getPrisma();
  const method = event.httpMethod;
  const path = event.path.replace('/.netlify/functions/nome-da-api', '').replace('/api/nome-da-api', '');

  try {
    // Autenticação (remova se a rota for pública)
    const user = await authenticateUser(event.headers);

    // GET /
    if (path === '' && method === 'GET') {
      const items = await prisma.model.findMany({
        where: {
          // Filtros baseados no usuário
          ...(user.tenantCompanyId && { tenantCompanyId: user.tenantCompanyId })
        }
      });
      return success(items);
    }

    // GET /:id
    if (path.startsWith('/') && method === 'GET') {
      const id = path.substring(1);
      const item = await prisma.model.findUnique({
        where: { id }
      });
      
      if (!item) {
        return error('Item não encontrado', 404);
      }
      
      return success(item);
    }

    // POST /
    if (path === '' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      
      // Validação
      if (!body.requiredField) {
        return error('Campo obrigatório ausente', 400);
      }
      
      const item = await prisma.model.create({
        data: {
          ...body,
          // Adicionar campos automáticos
          ...(user.tenantCompanyId && { tenantCompanyId: user.tenantCompanyId })
        }
      });
      
      return success(item, 201);
    }

    // PUT /:id
    if (path.startsWith('/') && method === 'PUT') {
      const id = path.substring(1);
      const body = JSON.parse(event.body || '{}');
      
      const item = await prisma.model.update({
        where: { id },
        data: body
      });
      
      return success(item);
    }

    // DELETE /:id
    if (path.startsWith('/') && method === 'DELETE') {
      const id = path.substring(1);
      
      await prisma.model.delete({
        where: { id }
      });
      
      return success({ message: 'Item deletado com sucesso' });
    }

    return error('Rota não encontrada', 404);
  } catch (err) {
    console.error('Erro na função nome-da-api:', err);
    return error(err.message || 'Erro interno do servidor', 500);
  }
}
```

## 🧪 Testando Localmente

```bash
# Iniciar Netlify Dev
netlify dev

# Testar endpoint
curl http://localhost:8888/.netlify/functions/nome-da-api

# Com autenticação
curl -H "Authorization: Bearer SEU_TOKEN" \
     http://localhost:8888/.netlify/functions/nome-da-api
```

## 📊 Prioridade de Migração

1. **Alta Prioridade** (Funcionalidades Core)
   - auth ✅
   - clients
   - opportunities
   - products
   - proposals

2. **Média Prioridade** (Funcionalidades Importantes)
   - companies
   - activities
   - contracts
   - dashboard

3. **Baixa Prioridade** (Funcionalidades Avançadas)
   - integrations
   - workflows
   - ai-analysis
   - licensing

## 🎯 Próximos Passos

1. Escolha uma API da lista acima
2. Copie o template
3. Migre a lógica do Express para o handler
4. Teste localmente com `netlify dev`
5. Faça commit e push
6. Verifique o deploy no Netlify

---

💡 **Dica**: Comece pelas APIs mais simples (CRUD básico) antes de migrar as mais complexas.
