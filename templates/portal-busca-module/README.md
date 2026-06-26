# Portal de Busca B2G - Modulo Isolado

Este pacote separa o codigo do modulo **Portal de Busca** para reutilizacao em outro sistema.

## Estrutura

```text
portal-busca-module/
  frontend/src/PortalBusca.jsx       # Tela React do Portal de Busca
  frontend/src/api.js                # Cliente minimo para montar URLs da API
  backend/routes/bll-proxy.js        # Proxy para BLL e ConLicitacao
  backend/routes/b2g-search.js       # API agregadora PNCP/ComprasNet opcional
  backend/example-server.js          # Exemplo Express para montar as rotas
  package.json                       # Dependencias necessarias
```

## O Que O Modulo Faz

- Busca editais no PNCP direto do browser.
- Permite configurar fontes autenticadas:
  - BLL Compras
  - ConLicitacao
- Salva favoritos no `localStorage`.
- Permite criar lead/oportunidade se o sistema destino expuser endpoints compativeis.

## Dependencias Frontend

Instale no sistema destino:

```bash
npm install lucide-react react-router-dom
```

O componente usa Tailwind CSS nas classes. Se o outro sistema nao usa Tailwind, sera necessario portar os estilos.

## Como Usar No Frontend

Copie:

```text
frontend/src/PortalBusca.jsx
frontend/src/api.js
```

Exemplo de rota React:

```jsx
import PortalBusca from './PortalBusca';

export default function App() {
  return <PortalBusca />;
}
```

Configure a API com:

```bash
VITE_API_URL=http://localhost:3002/api
```

Em producao, se frontend e backend estiverem no mesmo dominio, pode usar `/api`.

## Endpoints Que O Componente Usa

Obrigatorios para fontes autenticadas:

```text
GET /api/bll-proxy
GET /api/bll-proxy?action=login&portal=bll
GET /api/bll-proxy?action=login&portal=conlicitacao
```

Opcionais, usados apenas no fluxo "Salvar Lead":

```text
POST /api/companies
POST /api/opportunities
```

Se o sistema destino nao tiver CRM/leads/oportunidades, remova ou adapte as funcoes `salvarLead`, `abrirSalvarLead` e o modal `SalvarLeadModal` em `PortalBusca.jsx`.

## Como Usar No Backend Express

Copie:

```text
backend/routes/bll-proxy.js
backend/routes/b2g-search.js
```

Monte as rotas:

```js
const express = require('express');
const bllProxyRoutes = require('./routes/bll-proxy');
const b2gSearchRoutes = require('./routes/b2g-search');

const app = express();
app.use(express.json());
app.use('/api/bll-proxy', bllProxyRoutes);
app.use('/api/b2g-search', b2gSearchRoutes);
```

Ou rode o exemplo:

```bash
cd templates/portal-busca-module/backend
npm install express cors jsonwebtoken
JWT_SECRET=dev-secret node example-server.js
```

## Variaveis De Ambiente Backend

Para credenciais via ambiente, use:

```bash
BLL_EMAIL=
BLL_PASSWORD=
CONLICITACAO_EMAIL=
CONLICITACAO_PASSWORD=
JWT_SECRET=
```

As credenciais tambem podem ser enviadas pelo frontend via headers:

```text
x-bll-email
x-bll-password
x-conlicitacao-email
x-conlicitacao-password
```

## Observacoes De Integracao

- `b2g-search.js` exige token JWT no header `Authorization: Bearer <token>`.
- `PortalBusca.jsx` hoje chama PNCP diretamente pelo browser e usa `bll-proxy` somente para fontes pagas.
- O botao "Salvar Lead" depende do modelo de dados do CRM atual. No outro sistema, adapte esse fluxo para o seu cadastro de leads.
- O componente usa `useNavigate` de `react-router-dom`. Se o outro sistema nao usar React Router, remova o import e troque o redirecionamento por um callback.

## Arquivos Originais

- Frontend: `apps/web/src/pages/PortalBusca.jsx`
- Proxy fontes pagas: `backend/api/bll-proxy.js`
- Busca agregada opcional: `backend/api/b2g-search.js`
