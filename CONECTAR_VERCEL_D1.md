# Conectar Vercel ao Cloudflare D1

## Solução: Usar D1 HTTP API

Como a Vercel não suporta D1 nativamente, vamos usar a API REST do Cloudflare D1.

---

## Passo 1: Criar API Token no Cloudflare

1. Acesse: https://dash.cloudflare.com/profile/api-tokens
2. Clique em **Create Token**
3. Use o template **Edit Cloudflare Workers** ou crie customizado
4. Permissões necessárias:
   - Account > D1 > Edit
   - Account > Workers Scripts > Edit
5. Clique em **Continue to summary**
6. Clique em **Create Token**
7. **Copie o token** (você não verá novamente!)

---

## Passo 2: Obter Account ID

1. Acesse: https://dash.cloudflare.com/
2. Clique no seu perfil (canto superior direito)
3. Copie o **Account ID**

---

## Passo 3: Adicionar Variáveis na Vercel

Vá em Settings → Environment Variables e adicione:

```
CLOUDFLARE_ACCOUNT_ID=<seu_account_id>
CLOUDFLARE_API_TOKEN=<seu_api_token>
CLOUDFLARE_D1_DATABASE_ID=fc912a7b-5564-403c-9d78-146fb0999ae2
```

---

## Passo 4: Criar Adaptador D1 para Vercel

Crie o arquivo `apps/api/lib/d1-client.cjs`:

```javascript
const fetch = require('node-fetch');

class D1Client {
  constructor() {
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN;
    this.databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}`;
  }

  async query(sql, params = []) {
    try {
      const response = await fetch(`${this.baseUrl}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sql,
          params
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`D1 Query failed: ${error}`);
      }

      const data = await response.json();
      return data.result[0];
    } catch (error) {
      console.error('[D1 Client Error]', error);
      throw error;
    }
  }

  async execute(sql, params = []) {
    return this.query(sql, params);
  }

  async all(sql, params = []) {
    const result = await this.query(sql, params);
    return result.results || [];
  }

  async first(sql, params = []) {
    const result = await this.query(sql, params);
    return result.results && result.results.length > 0 ? result.results[0] : null;
  }
}

module.exports = { D1Client };
```

---

## Passo 5: Adaptar o Login para usar D1

Modifique `apps/api/api/auth.cjs`:

```javascript
const { D1Client } = require('../lib/d1-client.cjs');

// No início do arquivo, após as importações
const d1 = new D1Client();

// Na rota de login, substitua a busca do Prisma por:
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário no D1
    const user = await d1.first(
      `SELECT id, name, email, password, role, regionId, quota, tenantCompanyId,
              accessB2B, accessB2G, accessPreSales, permissionOverrides, isCompanyOwner, createdAt
       FROM users 
       WHERE LOWER(email) = LOWER(?)`,
      [normalizedEmail]
    );

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Verificar senha
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Gerar token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Remover senha da resposta
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      user: sanitizeUserPayload(userWithoutPassword),
      token
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});
```

---

## Passo 6: Instalar Dependência

```bash
npm install node-fetch@2
```

---

## Passo 7: Fazer Deploy

```bash
git add .
git commit -m "feat: adicionar suporte ao Cloudflare D1 via API REST"
git push origin production-nexos
```

---

## Alternativa: Usar Prisma com D1 Adapter

Se preferir manter o Prisma, use o adaptador oficial:

```bash
npm install @prisma/adapter-d1
```

E configure no código:

```javascript
const { PrismaD1 } = require('@prisma/adapter-d1');
const { PrismaClient } = require('@prisma/client');
const { D1Client } = require('./d1-client.cjs');

const d1Client = new D1Client();
const adapter = new PrismaD1(d1Client);
const prisma = new PrismaClient({ adapter });
```

---

## Limitações

⚠️ **Importante**: A API REST do D1 tem algumas limitações:
- Latência maior (chamada HTTP para cada query)
- Limite de requests por minuto
- Não suporta transações complexas

**Recomendação**: Para produção, migrar para Cloudflare Pages é a melhor opção.

---

## Teste

Após o deploy, teste:
1. Acesse: https://nexos.chorstconsult.com.br
2. Login: master@master.com / admin123
3. Verifique se funciona!
