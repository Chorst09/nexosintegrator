# Migração do Nexos: Vercel → Cloudflare Pages

## Por que migrar?
- ✅ Suporte nativo ao Cloudflare D1
- ✅ Melhor integração com Workers
- ✅ Sem necessidade de adaptadores
- ✅ Performance otimizada
- ✅ Gratuito para projetos pequenos/médios

## Pré-requisitos
- ✅ Banco D1 nexos criado (UUID: fc912a7b-5564-403c-9d78-146fb0999ae2)
- ✅ Tabelas criadas e usuário MASTER configurado
- ✅ Repositório GitHub com o código

---

## Passo 1: Criar Projeto no Cloudflare Pages

1. Acesse: https://dash.cloudflare.com/
2. Vá em **Workers & Pages**
3. Clique em **Create application**
4. Selecione a aba **Pages**
5. Clique em **Connect to Git**

### Conectar Repositório:
1. Selecione **GitHub**
2. Autorize o Cloudflare a acessar seus repositórios
3. Selecione o repositório: **crmautomatizadokvm_vercel**
4. Clique em **Begin setup**

### Configurar Build:
1. **Project name**: `nexos` (ou outro nome)
2. **Production branch**: `production-nexos`
3. **Framework preset**: Selecione **None** ou **Custom**
4. **Build command**: 
   ```bash
   npm run build
   ```
5. **Build output directory**: 
   ```
   apps/web/dist
   ```
6. **Root directory**: Deixe vazio (ou `/` se necessário)

### Variáveis de Ambiente:
Adicione estas variáveis:

```
NODE_VERSION=18
DATABASE_URL=file:./dev.db
MERCADO_PAGO_ACCESS_TOKEN=<seu_token>
MERCADO_PAGO_PUBLIC_KEY=<sua_chave>
MERCADO_PAGO_WEBHOOK_TOKEN=<seu_webhook_token>
URL_BASE_DA_API_EXTERNA=<sua_url>
```

7. Clique em **Save and Deploy**

---

## Passo 2: Vincular Banco D1 ao Projeto

Após o primeiro deploy:

1. Vá em **Workers & Pages**
2. Clique no projeto **nexos**
3. Vá na aba **Settings**
4. Clique em **Functions** no menu lateral
5. Role até **D1 database bindings**
6. Clique em **Add binding**

### Configurar Binding:
- **Variable name**: `DB`
- **D1 database**: Selecione **nexos** (fc912a7b-5564-403c-9d78-146fb0999ae2)
- Clique em **Save**

---

## Passo 3: Configurar Domínio Customizado

1. No projeto nexos, vá em **Custom domains**
2. Clique em **Set up a custom domain**
3. Digite: `nexos.chorstconsult.com.br`
4. Clique em **Continue**

### Configurar DNS:
O Cloudflare vai mostrar os registros DNS necessários:

**Se o domínio já está no Cloudflare:**
- O registro será criado automaticamente
- Aguarde alguns minutos para propagação

**Se o domínio não está no Cloudflare:**
1. Adicione um registro CNAME no seu provedor DNS:
   - **Name**: `nexos`
   - **Value**: `<seu-projeto>.pages.dev`
   - **TTL**: Automático

---

## Passo 4: Adaptar Código para Cloudflare Pages

### 4.1 Criar arquivo `wrangler.toml` na raiz:

```toml
name = "nexos"
compatibility_date = "2024-01-01"
pages_build_output_dir = "apps/web/dist"

[[d1_databases]]
binding = "DB"
database_name = "nexos"
database_id = "fc912a7b-5564-403c-9d78-146fb0999ae2"

[build]
command = "npm run build"

[build.upload]
format = "service-worker"
```

### 4.2 Criar `functions/_middleware.ts` (se necessário):

```typescript
export async function onRequest(context) {
  // Middleware para todas as funções
  return await context.next();
}
```

### 4.3 Adaptar API para usar D1:

No arquivo de configuração do Prisma ou conexão do banco, use:

```javascript
// Em vez de:
const prisma = new PrismaClient();

// Use:
const db = context.env.DB; // Binding do D1
```

---

## Passo 5: Testar Deploy

1. Aguarde o deploy concluir
2. Acesse: `https://<seu-projeto>.pages.dev`
3. Teste o login com:
   - **Email**: master@master.com
   - **Senha**: admin123

---

## Passo 6: Configurar Redirects (Opcional)

Se quiser redirecionar do domínio antigo para o novo:

1. Na Vercel, vá no projeto nexos
2. Settings → Domains
3. Adicione um redirect de `nexos.chorstconsult.com.br` para o novo domínio

Ou configure no Cloudflare:

1. Vá em **Rules** → **Redirect Rules**
2. Crie uma regra para redirecionar tráfego

---

## Passo 7: Migrar Variáveis de Ambiente

Copie todas as variáveis de ambiente da Vercel para o Cloudflare Pages:

### Da Vercel:
1. Settings → Environment Variables
2. Copie todas as variáveis

### Para Cloudflare:
1. Workers & Pages → nexos → Settings → Environment variables
2. Cole todas as variáveis

**Variáveis importantes:**
- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_PUBLIC_KEY`
- `MERCADO_PAGO_WEBHOOK_TOKEN`
- `URL_BASE_DA_API_EXTERNA`
- Qualquer outra variável customizada

---

## Passo 8: Configurar Webhooks

Se você usa webhooks (Mercado Pago, etc):

1. Atualize as URLs dos webhooks para o novo domínio
2. Exemplo: `https://nexos.chorstconsult.com.br/api/webhooks/mercadopago`

---

## Comparação: Vercel vs Cloudflare Pages

| Recurso | Vercel | Cloudflare Pages |
|---------|--------|------------------|
| D1 Database | ❌ Não suportado | ✅ Nativo |
| Build Time | 45 min/mês (free) | Ilimitado |
| Bandwidth | 100 GB/mês | Ilimitado |
| Requests | Ilimitado | Ilimitado |
| Edge Functions | Sim | Sim (Workers) |
| Preço Free | Limitado | Generoso |

---

## Troubleshooting

### Deploy falha no build
- Verifique se `NODE_VERSION=18` está configurado
- Verifique se o comando de build está correto
- Veja os logs de build para erros específicos

### Erro ao conectar no D1
- Verifique se o binding `DB` está configurado
- Confirme o UUID do banco: `fc912a7b-5564-403c-9d78-146fb0999ae2`
- Verifique se o banco tem as tabelas criadas

### Domínio não funciona
- Aguarde propagação DNS (até 24h, geralmente 5-10 min)
- Verifique se o registro CNAME está correto
- Teste com o domínio `.pages.dev` primeiro

### Variáveis de ambiente não funcionam
- Verifique se estão configuradas para o ambiente correto (Production)
- Faça um redeploy após adicionar variáveis
- Verifique se os nomes estão corretos (case-sensitive)

---

## Rollback (se necessário)

Se algo der errado, você pode voltar para a Vercel:

1. O projeto na Vercel continua funcionando
2. Basta apontar o DNS de volta para a Vercel
3. Ou manter ambos rodando em paralelo durante a transição

---

## Próximos Passos

Após a migração:
1. ✅ Teste todas as funcionalidades
2. ✅ Verifique se o login funciona
3. ✅ Teste criação de empresas
4. ✅ Verifique integrações (Mercado Pago, etc)
5. ✅ Monitore logs por alguns dias
6. ✅ Desative o projeto na Vercel (opcional)

---

## Suporte

Se encontrar problemas:
1. Verifique os logs do Cloudflare Pages
2. Teste a conexão com o D1 via Console
3. Verifique se todas as variáveis foram migradas
4. Teste com o domínio `.pages.dev` antes do customizado

---

## Vantagens da Migração

✅ **Performance**: Edge computing global  
✅ **Custo**: Plano gratuito mais generoso  
✅ **Integração**: D1 nativo, sem adaptadores  
✅ **Escalabilidade**: Suporta mais tráfego  
✅ **Simplicidade**: Menos configuração necessária  

---

**Tempo estimado de migração**: 30-60 minutos  
**Downtime**: ~5 minutos (durante troca de DNS)
