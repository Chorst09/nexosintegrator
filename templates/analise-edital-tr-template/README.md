# Template Completo - Analise de Edital e Termo de Referencia (TR)

Este template entrega um fluxo completo e pronto para copiar para outro sistema:

- API de analise de `edital` e `tr`
- Validacao forte com Zod
- Fluxos de IA com Genkit + Gemini
- Retry automatico para quota (`429`)
- Fallback de contingencia para TR
- Persistencia de resumos salvos com escopo por empresa/usuario
- Frontend de referencia (HTML + JS) para testar ponta a ponta

## 1. Arquitetura

Pipeline principal:

1. Upload de PDF no frontend (Data URI)
2. `POST /api/ai-analysis/edital` ou `POST /api/ai-analysis/tr`
3. Backend valida payload
4. Backend executa fluxo de IA (prompt + schema de saida)
5. Frontend recebe JSON estruturado
6. Frontend salva resumo via `POST /api/analyses/saved`
7. Backend persiste com escopo (`companyId`, `createdByUserId`)

## 2. Estrutura

```txt
templates/analise-edital-tr-template/
  .env.example
  package.json
  tsconfig.json
  README.md
  curl-examples.sh
  src/
    server.ts
    types.ts
    schemas.ts
    ai/
      genkit.ts
      flows/
        analyze-edital.ts
        analyze-tr.ts
    repositories/
      saved-analysis-repository.ts
      file-saved-analysis-repository.ts
    routes/
      ai-analysis-routes.ts
      saved-analyses-routes.ts
  frontend/
    index.html
    app.js
    styles.css
```

## 3. Subir localmente

```bash
cd templates/analise-edital-tr-template
cp .env.example .env
npm install
npm run dev
```

API local: `http://localhost:3333`

Frontend de referencia:

- abra `templates/analise-edital-tr-template/frontend/index.html` no navegador
- configure `API Base URL` para `http://localhost:3333`

## 4. Variaveis de ambiente

Arquivo `.env`:

```env
PORT=3333
DATA_DIR=./data
GEMINI_API_KEY=sua_chave_aqui
```

Tambem aceita:

- `GOOGLE_API_KEY`
- `GOOGLE_GENAI_API_KEY`

## 5. Endpoints

### IA

- `POST /api/ai-analysis/edital`
- `POST /api/ai-analysis/tr`

### Resumos salvos

- `GET /api/analyses/saved`
- `GET /api/analyses/saved/:id`
- `POST /api/analyses/saved`
- `DELETE /api/analyses/saved/:id`

Headers obrigatorios para endpoints de resumo salvo:

- `x-company-id`
- `x-user-id`
- `x-user-role` (`master` | `admin` | `user`) - opcional, default `user`

## 6. Regras de escopo

- `master`: enxerga todos os registros
- `admin`: enxerga registros da propria empresa
- `user`: enxerga somente registros da propria empresa criados por ele

## 7. Persistencia

Por padrao este template usa arquivo local JSON:

- `DATA_DIR/saved-analyses.json`

Para producao, troque `FileSavedAnalysisRepository` por implementacao em:

- Postgres
- MySQL
- D1
- MongoDB

Mantendo a mesma interface de repositorio.

## 8. Contrato de saida

### Edital (resumo)

```json
{
  "analysisType": "edital",
  "general": {
    "openingDate": "",
    "openingTime": "",
    "portal": "",
    "agency": "",
    "modality": "",
    "objectSummary": ""
  },
  "deadlines": {
    "publicationDate": "",
    "impugnationDeadline": "",
    "clarificationDeadline": "",
    "proposalDeadline": "",
    "contractTerm": ""
  },
  "requirements": {
    "legal": [],
    "technical": [],
    "economic": [],
    "fiscal": []
  },
  "items": [
    { "name": "", "quantity": "", "specs": "" }
  ],
  "risks": []
}
```

### TR (resumo)

```json
{
  "analysisType": "tr",
  "trSummary": "",
  "analyzedModel": {
    "modelName": "",
    "manufacturer": "",
    "providedSpecs": ""
  },
  "termRequirements": [],
  "technicalNotebook": [
    {
      "termRequirement": "",
      "meetsRequirement": "ATENDE",
      "datasheetEvidence": "",
      "rationale": ""
    }
  ],
  "compliantEquipment": [
    { "model": "", "manufacturer": "", "rationale": "" }
  ],
  "complianceOverview": {
    "totalRequirements": 0,
    "metRequirements": 0,
    "fullCompliance": false
  }
}
```

## 9. Adaptacao para outro sistema

Passos minimos:

1. Copie `src/schemas.ts` e `src/types.ts`
2. Copie os flows em `src/ai/flows`
3. Implemente os mesmos endpoints na sua stack
4. Mantenha o formato de resposta para nao quebrar frontend
5. Troque o repositorio de arquivo por banco da sua plataforma

## 10. Recomendacoes de producao

1. Nao salvar PDF em Base64 no banco principal
2. Salvar arquivo em object storage (R2, S3, GCS)
3. Guardar no banco somente metadados e URL assinada
4. Adicionar rate limit nos endpoints de IA
5. Adicionar auditoria de quem analisou/alterou
