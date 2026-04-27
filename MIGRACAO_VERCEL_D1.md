# Migracao Vercel + Cloudflare D1

Este projeto foi ajustado para publicar na Vercel com duas opcoes de backend:

1. Backend local do repositorio (`apps/api`, Prisma + PostgreSQL)
2. Backend externo (ex.: Cloudflare Workers + D1), usando proxy pela rota `/api` da Vercel

## O que foi ajustado no codigo

- `api/[...path].js` agora suporta proxy opcional:
  - Se `EXTERNAL_API_BASE_URL` ou `CLOUDFLARE_API_BASE_URL` estiver definido, a Vercel encaminha `/api/*` para essa API externa.
  - Se nao estiver definido, continua usando `apps/api/server.cjs` (com Prisma).
- Frontend padronizado para usar `buildApiUrl(...)`:
  - `apps/web/src/pages/Clientes.jsx`
  - `apps/web/src/pages/FuncionalidadesAvancadas.jsx`
  - `apps/web/src/pages/Relatorios.jsx`
- `apps/web/.env.example` atualizado para `VITE_API_URL=/api`.

## Importante sobre D1 neste repositorio

O backend atual (`apps/api`) usa Prisma com schema PostgreSQL e recursos nao suportados pelo conector SQLite/D1 nesta versao (Prisma 5.22 presente no projeto), como:

- `enum`
- `Json`
- listas de tipo primitivo (`String[]`)

Por isso, **nao e viavel ligar D1 diretamente no backend atual sem refatoracao maior**.

## Arquitetura recomendada para seu caso

- Frontend na Vercel
- API em Cloudflare Workers (conectada ao D1)
- Vercel fazendo proxy de `/api` para a API Cloudflare

Assim, o frontend continua usando URL relativa (`/api`) e voce troca apenas variaveis de ambiente.

## Variaveis na Vercel

No projeto da Vercel, configure:

- `VITE_API_URL=/api`
- `EXTERNAL_API_BASE_URL=https://<sua-api-cloudflare>`
  - (ou `CLOUDFLARE_API_BASE_URL` com o mesmo valor)

## Configuracao aplicada neste repositorio

Arquivos criados:

- `cloudflare/worker/wrangler.toml`
- `cloudflare/worker/src/index.js`
- `cloudflare/worker/package.json`
- `cloudflare/worker/.dev.vars.example`

Valores ja configurados:

- `account_id = 9359b3ca25a0035c211a8cbf3f76b851`
- `database_id = 0da49387-6ce6-42e0-9009-ac916816a95f`
- `database_name = crmcomercial`
- binding D1: `DB`

## Publicar Worker Cloudflare

```bash
cd cloudflare/worker
npm install
npx wrangler auth login
npx wrangler deploy
```

Depois do deploy, copie a URL do Worker (ex.: `https://crmcomercial-api.<subdominio>.workers.dev`) e configure no projeto da Vercel:

- `EXTERNAL_API_BASE_URL=<URL_DO_WORKER>`

## Checklist de deploy

1. Publicar API no Cloudflare (Workers + D1).
2. Configurar variaveis acima no Vercel.
3. Fazer deploy na Vercel.
4. Validar:
   - `GET /api/health` via dominio Vercel
   - login e listagens principais no frontend
