# Design Técnico - Módulo Financeiro (Gestão)

## Overview

O Módulo Financeiro é um sub-módulo crítico do sistema de GESTÃO do NexosIntegrator, projetado para automatizar e centralizar o controle de receitas e despesas da empresa. Ele opera como um hub financeiro que recebe eventos de outros módulos (B2B, B2G, Comissões) e gera informações consolidadas (DRE, Fluxo de Caixa, Dashboard).

### Objetivos do Design

1. **Integração baseada em eventos**: Consumir eventos de oportunidades ganhas (B2B/B2G) e comissões aprovadas sem acoplamento direto
2. **Auditabilidade completa**: Rastrear origem, criação, modificações e status de todos os lançamentos financeiros
3. **Consistência de dados**: Garantir integridade referencial e processamento idempotente de eventos
4. **Performance em consultas**: Otimizar relatórios (DRE, Fluxo de Caixa) para grandes volumes de lançamentos
5. **Controle de acesso granular**: Implementar permissões por papel para operações financeiras sensíveis

### Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────────┐
│                    MÓDULOS DE ORIGEM                        │
│  ┌─────────┐    ┌─────────┐    ┌──────────────────┐        │
│  │   B2B   │    │   B2G   │    │  Sub-Módulo      │        │
│  │         │    │         │    │  Comissões       │        │
│  └────┬────┘    └────┬────┘    └────────┬─────────┘        │
│       │              │                   │                  │
│       └──────────────┴───────────────────┘                  │
│                      │                                      │
│                 [EVENTOS]                                   │
│        opportunity.won | commission.approved               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              MÓDULO FINANCEIRO (GESTÃO)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Event Listeners (Async Handlers)             │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                     │
│                       ▼                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Business Logic Layer                               │   │
│  │  - Validações                                       │   │
│  │  - Processamento idempotente                        │   │
│  │  - Cálculos de categorização automática            │   │
│  └────────────────────┬────────────────────────────────┘   │
│                       │                                     │
│                       ▼                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Data Access Layer (Prisma)                         │   │
│  │  - ContaReceber                                     │   │
│  │  - ContaPagar                                       │   │
│  │  - CategoriaFinanceira                              │   │
│  │  - CentroCusto                                      │   │
│  │  - LogAuditoria                                     │   │
│  └────────────────────┬────────────────────────────────┘   │
│                       │                                     │
│                       ▼                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Reporting Services                                 │   │
│  │  - DRE Generator                                    │   │
│  │  - Fluxo de Caixa Projector                        │   │
│  │  - Dashboard KPI Calculator                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Notification Emitter (Eventos de Saída)            │   │
│  │  - receivable.created                               │   │
│  │  - payable.created                                  │   │
│  │  - payable.paid (→ Comissões)                       │   │
│  │  - receivable.overdue                               │   │
│  │  - payable.overdue                                  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Decisões Arquiteturais

| Decisão | Razão |
|---------|-------|
| **Event-driven integration** | Desacopla módulos, permite escalabilidade independente, facilita testes |
| **Processamento assíncrono** | Não bloqueia operações dos módulos de origem (B2B/B2G) |
| **Idempotência obrigatória** | Garante que reprocessamento de eventos não cria registros duplicados |
| **Auditoria por tabela dedicada** | Logs de auditoria isolados não afetam performance de consultas principais |
| **Categorização automática** | Reduz erro humano, acelera processamento de eventos |
| **Status calculado (VENCIDO)** | Status VENCIDO é derivado em runtime (não armazenado), evita jobs de atualização |

---

## Architecture

### Estrutura de Diretórios (Backend)

```
backend/
├── api/
│   └── financeiro.js                    # Express routes
├── src/
│   └── modules/
│       └── gestao/
│           └── financeiro/
│               ├── controllers/
│               │   ├── contasReceber.controller.js
│               │   ├── contasPagar.controller.js
│               │   ├── categorias.controller.js
│               │   ├── centrosCusto.controller.js
│               │   ├── dre.controller.js
│               │   ├── fluxoCaixa.controller.js
│               │   └── dashboard.controller.js
│               ├── services/
│               │   ├── contasReceber.service.js
│               │   ├── contasPagar.service.js
│               │   ├── categorias.service.js
│               │   ├── centrosCusto.service.js
│               │   ├── dre.service.js
│               │   ├── fluxoCaixa.service.js
│               │   ├── dashboard.service.js
│               │   └── auditoria.service.js
│               ├── events/
│               │   ├── listeners/
│               │   │   ├── opportunityWonListener.js
│               │   │   └── commissionApprovedListener.js
│               │   └── emitters/
│               │       └── financeiroEventEmitter.js
│               ├── validators/
│               │   ├── contasReceber.validator.js
│               │   ├── contasPagar.validator.js
│               │   └── common.validator.js
│               ├── utils/
│               │   ├── statusCalculator.js
│               │   ├── dateUtils.js
│               │   └── numberFormatter.js
│               └── middleware/
│                   └── financeiroAuth.middleware.js
├── prisma/
│   └── schema.prisma                    # Database models
└── prisma/
    └── migrations/
        └── YYYYMMDDHHMMSS_add_financeiro_module/
            └── migration.sql
```

### Estrutura de Diretórios (Frontend)

```
frontend/
└── src/
    └── app/
        └── gestao/
            └── financeiro/
                ├── page.tsx                      # Dashboard principal
                ├── layout.tsx                    # Layout do módulo
                ├── contas-receber/
                │   ├── page.tsx                  # Lista
                │   ├── [id]/
                │   │   └── page.tsx              # Detalhes
                │   └── nova/
                │       └── page.tsx              # Criar
                ├── contas-pagar/
                │   ├── page.tsx
                │   ├── [id]/
                │   │   └── page.tsx
                │   └── nova/
                │       └── page.tsx
                ├── relatorios/
                │   ├── dre/
                │   │   └── page.tsx
                │   └── fluxo-caixa/
                │       └── page.tsx
                ├── configuracoes/
                │   ├── categorias/
                │   │   └── page.tsx
                │   └── centros-custo/
                │       └── page.tsx
                └── components/
                    ├── ContaReceberCard.tsx
                    ├── ContaPagarCard.tsx
                    ├── StatusBadge.tsx
                    ├── FinanceiroKPICard.tsx
                    ├── DRETable.tsx
                    ├── FluxoCaixaChart.tsx
                    └── AuditoriaTimeline.tsx
```

### Camadas de Responsabilidade

#### 1. Controllers (API Layer)
- **Responsabilidade**: Receber requisições HTTP, validar autenticação/autorização, chamar services, retornar respostas formatadas
- **Não deve**: Conter lógica de negócio, acessar diretamente o banco de dados

#### 2. Services (Business Logic Layer)
- **Responsabilidade**: Implementar regras de negócio, orquestrar operações, chamar Prisma, emitir eventos
- **Não deve**: Manipular requisições HTTP diretamente, ter conhecimento sobre formato de resposta

#### 3. Validators
- **Responsabilidade**: Validar dados de entrada, retornar erros descritivos
- **Padrão**: Usar bibliotecas como `zod` ou `joi`

#### 4. Event Listeners
- **Responsabilidade**: Escutar eventos de outros módulos, processar assincronamente, garantir idempotência
- **Padrão**: Usar fila de eventos (ex: EventEmitter interno, Bull Queue, ou AWS SQS)

#### 5. Event Emitters
- **Responsabilidade**: Emitir eventos para outros módulos (ex: Comissões, Notificações)

#### 6. Middleware
- **Responsabilidade**: Autenticação, autorização por papel, rate limiting

---

## Components and Interfaces

### API Endpoints

#### Contas a Receber

```typescript
// GET /api/gestao/financeiro/contas-receber
// Query params: ?status=PENDENTE&clienteId=xxx&dataInicio=2024-01-01&dataFim=2024-12-31&origem=B2B&page=1&limit=20
Response: {
  data: ContaReceber[],
  pagination: { page, limit, total, totalPages }
}

// GET /api/gestao/financeiro/contas-receber/:id
Response: ContaReceber & { auditoria: LogAuditoria[] }

// POST /api/gestao/financeiro/contas-receber
Body: {
  valor: number,
  clienteId: string,
  dataVencimento: string (ISO),
  categoriaId: string,
  descricao?: string
}
Response: ContaReceber

// PATCH /api/gestao/financeiro/contas-receber/:id/marcar-pago
Body: {
  dataRecebimento: string (ISO)
}
Response: ContaReceber

// DELETE /api/gestao/financeiro/contas-receber/:id
// (Apenas se status !== PAGO)
Response: { success: boolean }
```

#### Contas a Pagar

```typescript
// GET /api/gestao/financeiro/contas-pagar
// Query params: ?status=PENDENTE&fornecedor=xxx&categoriaId=xxx&centroCustoId=xxx&dataInicio=2024-01-01&dataFim=2024-12-31&page=1&limit=20
Response: {
  data: ContaPagar[],
  pagination: { page, limit, total, totalPages }
}

// GET /api/gestao/financeiro/contas-pagar/:id
Response: ContaPagar & { auditoria: LogAuditoria[] }

// POST /api/gestao/financeiro/contas-pagar
Body: {
  valor: number,
  fornecedor: string,
  dataVencimento: string (ISO),
  categoriaId: string,
  centroCustoId?: string,
  descricao?: string
}
Response: ContaPagar

// PATCH /api/gestao/financeiro/contas-pagar/:id/marcar-pago
Body: {
  dataPagamento: string (ISO)
}
Response: ContaPagar

// DELETE /api/gestao/financeiro/contas-pagar/:id
// (Apenas se status !== PAGO)
Response: { success: boolean }
```

#### Relatórios

```typescript
// GET /api/gestao/financeiro/relatorios/dre
// Query params: ?dataInicio=2024-01-01&dataFim=2024-12-31&agruparPor=categoria&formato=json
Response: {
  periodo: { inicio: string, fim: string },
  receitasBrutas: number,
  deducoesReceitas: number,
  receitasLiquidas: number,
  custosDiretos: number,
  lucroBruto: number,
  despesasOperacionais: number,
  lucroLiquido: number,
  detalhamentoPorCategoria?: { categoriaId, categoriaNome, valor }[]
}

// GET /api/gestao/financeiro/relatorios/fluxo-caixa
// Query params: ?dataInicio=2024-01-01&dataFim=2024-12-31&agrupamento=mes
Response: {
  periodo: { inicio: string, fim: string },
  saldoInicial: number,
  entradasPrevistas: number,
  saidasPrevistas: number,
  saldoFinalProjetado: number,
  detalhamentoPorPeriodo: [
    {
      periodo: string,
      entradas: number,
      saidas: number,
      saldo: number,
      contasVencidas: { receber: number, pagar: number }
    }
  ]
}

// GET /api/gestao/financeiro/dashboard
Response: {
  totalReceber: number,
  totalPagar: number,
  saldoProjetado: number,
  receitasMes: number,
  despesasMes: number,
  contasVencidas: { receber: number, pagar: number },
  evolucaoUltimos6Meses: [{ mes: string, receitas: number, despesas: number }]
}
```

#### Configurações

```typescript
// GET /api/gestao/financeiro/categorias
Response: CategoriaFinanceira[]

// POST /api/gestao/financeiro/categorias
Body: { nome: string, tipo: 'RECEITA' | 'DESPESA' }
Response: CategoriaFinanceira

// PATCH /api/gestao/financeiro/categorias/:id/desativar
Response: CategoriaFinanceira

// GET /api/gestao/financeiro/centros-custo
Response: CentroCusto[]

// POST /api/gestao/financeiro/centros-custo
Body: { nome: string, codigo: string }
Response: CentroCusto
```

### Event Contracts

#### Eventos Consumidos (Entrada)

```typescript
// opportunity.won (emitido por B2B/B2G)
{
  eventType: 'opportunity.won',
  eventId: string,           // UUID único do evento (para idempotência)
  timestamp: string,         // ISO 8601
  source: 'B2B' | 'B2G',
  data: {
    opportunityId: string,
    opportunityNumber: string,
    clienteId: string,
    clienteNome: string,
    valor: number,
    dataFechamento: string,   // ISO 8601
    prazoRecebimento: number, // dias até vencimento (default 30)
    produtos: [
      { produtoId: string, quantidade: number, valorUnitario: number }
    ]
  }
}

// commission.approved (emitido por Sub-Módulo Comissões)
{
  eventType: 'commission.approved',
  eventId: string,
  timestamp: string,
  data: {
    commissionId: string,
    sellerId: string,
    sellerNome: string,
    valor: number,
    opportunityId: string,
    prazoVencimento: number   // dias até vencimento (default 7)
  }
}
```

#### Eventos Emitidos (Saída)

```typescript
// receivable.created
{
  eventType: 'receivable.created',
  eventId: string,
  timestamp: string,
  data: {
    contaReceberId: string,
    valor: number,
    clienteId: string,
    dataVencimento: string,
    origem: 'B2B' | 'B2G' | 'MANUAL'
  }
}

// payable.created
{
  eventType: 'payable.created',
  eventId: string,
  timestamp: string,
  data: {
    contaPagarId: string,
    valor: number,
    fornecedor: string,
    dataVencimento: string,
    origem: 'COMISSAO' | 'MANUAL'
  }
}

// payable.paid (para Sub-Módulo Comissões)
{
  eventType: 'payable.paid',
  eventId: string,
  timestamp: string,
  data: {
    contaPagarId: string,
    commissionId: string,     // referência à comissão original
    dataPagamento: string
  }
}

// receivable.overdue / payable.overdue (para Sistema de Notificações)
{
  eventType: 'receivable.overdue' | 'payable.overdue',
  eventId: string,
  timestamp: string,
  data: {
    lancamentoId: string,
    valor: number,
    dataVencimento: string,
    diasVencidos: number
  }
}
```

### Service Interfaces

```typescript
// services/contasReceber.service.js
interface ContasReceberService {
  list(filters: FilterContasReceber, pagination: Pagination): Promise<PaginatedResult<ContaReceber>>
  getById(id: string): Promise<ContaReceber | null>
  create(data: CreateContaReceberDto): Promise<ContaReceber>
  createFromOpportunity(event: OpportunityWonEvent): Promise<ContaReceber>
  marcarComoPago(id: string, dataRecebimento: Date): Promise<ContaReceber>
  delete(id: string): Promise<void>
  calcularStatusComputado(conta: ContaReceber): 'PENDENTE' | 'PAGO' | 'CANCELADO' | 'VENCIDO'
}

// services/contasPagar.service.js
interface ContasPagarService {
  list(filters: FilterContasPagar, pagination: Pagination): Promise<PaginatedResult<ContaPagar>>
  getById(id: string): Promise<ContaPagar | null>
  create(data: CreateContaPagarDto): Promise<ContaPagar>
  createFromCommission(event: CommissionApprovedEvent): Promise<ContaPagar>
  marcarComoPago(id: string, dataPagamento: Date): Promise<ContaPagar>
  delete(id: string): Promise<void>
  calcularStatusComputado(conta: ContaPagar): 'PENDENTE' | 'PAGO' | 'CANCELADO' | 'VENCIDO'
}

// services/dre.service.js
interface DREService {
  gerarDRE(dataInicio: Date, dataFim: Date, agruparPor?: 'categoria'): Promise<DRE>
  exportarPDF(dre: DRE): Promise<Buffer>
  exportarCSV(dre: DRE): Promise<string>
}

// services/fluxoCaixa.service.js
interface FluxoCaixaService {
  gerarFluxo(dataInicio: Date, dataFim: Date, agrupamento: 'semana' | 'mes'): Promise<FluxoCaixa>
  exportarPDF(fluxo: FluxoCaixa): Promise<Buffer>
  exportarCSV(fluxo: FluxoCaixa): Promise<string>
}

// services/auditoria.service.js
interface AuditoriaService {
  registrarCriacao(entidade: string, id: string, userId: string, dados: object): Promise<void>
  registrarAlteracao(entidade: string, id: string, userId: string, alteracoes: object): Promise<void>
  listarPorEntidade(entidade: string, id: string): Promise<LogAuditoria[]>
}
```

---

## Data Models

### Prisma Schema Extensions

```prisma
// ==================== MÓDULO FINANCEIRO ====================

// Enums
enum StatusFinanceiro {
  PENDENTE
  PAGO
  CANCELADO
  // NOTA: VENCIDO é calculado em runtime, não armazenado
}

enum TipoCategoria {
  RECEITA
  DESPESA
}

enum OrigemContaReceber {
  B2B
  B2G
  MANUAL
}

enum OrigemContaPagar {
  COMISSAO
  MANUAL
}

// Models
model CategoriaFinanceira {
  id        String        @id @default(uuid())
  nome      String        @unique
  tipo      TipoCategoria
  ativo     Boolean       @default(true)
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  contasReceber ContaReceber[]
  contasPagar   ContaPagar[]

  @@index([tipo, ativo])
}

model CentroCusto {
  id        String   @id @default(uuid())
  nome      String
  codigo    String   @unique
  ativo     Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  contasPagar ContaPagar[]

  @@index([ativo])
}

model ContaReceber {
  id                 String               @id @default(uuid())
  valor              Float
  dataVencimento     DateTime
  dataRecebimento    DateTime?
  status             StatusFinanceiro     @default(PENDENTE)
  origem             OrigemContaReceber
  descricao          String?
  
  // Relacionamentos
  clienteId          String
  cliente            Company              @relation("ContasReceberCliente", fields: [clienteId], references: [id])
  categoriaId        String
  categoria          CategoriaFinanceira  @relation(fields: [categoriaId], references: [id])
  
  // Referências externas (para integridade histórica)
  opportunityId      String?              @unique
  opportunity        Opportunity?         @relation("ContaReceberOpportunity", fields: [opportunityId], references: [id])
  
  // Cópia de dados da oportunidade (para preservar histórico)
  opportunityNumber  String?
  opportunityValue   Float?
  opportunityDate    DateTime?
  
  // Idempotência de eventos
  eventId            String?              @unique  // UUID do evento que criou esta conta
  
  // Auditoria
  criadoPorId        String
  criadoPor          User                 @relation("ContaReceberCriadoPor", fields: [criadoPorId], references: [id])
  createdAt          DateTime             @default(now())
  updatedAt          DateTime             @updatedAt
  
  auditoria          LogAuditoria[]       @relation("AuditoriaContaReceber")

  @@index([status, dataVencimento])
  @@index([clienteId, status])
  @@index([origem, status])
  @@index([dataVencimento])
}

model ContaPagar {
  id                String               @id @default(uuid())
  valor             Float
  dataVencimento    DateTime
  dataPagamento     DateTime?
  status            StatusFinanceiro     @default(PENDENTE)
  origem            OrigemContaPagar
  fornecedor        String               // Nome do fornecedor/vendedor
  descricao         String?
  
  // Relacionamentos
  categoriaId       String
  categoria         CategoriaFinanceira  @relation(fields: [categoriaId], references: [id])
  centroCustoId     String?
  centroCusto       CentroCusto?         @relation(fields: [centroCustoId], references: [id])
  
  // Referências externas (para integridade histórica)
  commissionId      String?              @unique
  commission        Commission?          @relation("ContaPagarComissao", fields: [commissionId], references: [id])
  
  // Cópia de dados da comissão (para preservar histórico)
  sellerId          String?
  sellerNome        String?
  commissionValor   Float?
  
  // Idempotência de eventos
  eventId           String?              @unique
  
  // Auditoria
  criadoPorId       String
  criadoPor         User                 @relation("ContaPagarCriadoPor", fields: [criadoPorId], references: [id])
  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt
  
  auditoria         LogAuditoria[]       @relation("AuditoriaContaPagar")

  @@index([status, dataVencimento])
  @@index([origem, status])
  @@index([categoriaId, status])
  @@index([centroCustoId])
  @@index([dataVencimento])
}

model LogAuditoria {
  id               String   @id @default(uuid())
  entidade         String   // 'ContaReceber' | 'ContaPagar'
  entidadeId       String
  acao             String   // 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE'
  statusAnterior   String?
  statusNovo       String?
  alteracoes       Json?    // Objeto com campos alterados
  
  userId           String
  user             User     @relation("LogAuditoriaUser", fields: [userId], references: [id])
  
  timestamp        DateTime @default(now())
  
  contaReceberId   String?
  contaReceber     ContaReceber? @relation("AuditoriaContaReceber", fields: [contaReceberId], references: [id], onDelete: Cascade)
  
  contaPagarId     String?
  contaPagar       ContaPagar?   @relation("AuditoriaContaPagar", fields: [contaPagarId], references: [id], onDelete: Cascade)

  @@index([entidade, entidadeId])
  @@index([userId, timestamp])
  @@index([timestamp])
}

// Seed de categorias padrão (migrations/seed)
// - Vendas B2B (RECEITA)
// - Vendas B2G (RECEITA)
// - Comissões de Vendas (DESPESA)
// - Despesas Operacionais (DESPESA)
// - Impostos (DESPESA)
// - Outras Receitas (RECEITA)

// Seed de centros de custo padrão
// - Comercial
// - Administrativo
// - Marketing
// - Operacional

// ==================== RELACIONAMENTOS COM MODELS EXISTENTES ====================

// Adicionar ao model Company:
// contasReceber ContaReceber[] @relation("ContasReceberCliente")

// Adicionar ao model Opportunity:
// contaReceber ContaReceber? @relation("ContaReceberOpportunity")

// Adicionar ao model Commission:
// contaPagar ContaPagar? @relation("ContaPagarComissao")

// Adicionar ao model User:
// contasReceberCriadas ContaReceber[] @relation("ContaReceberCriadoPor")
// contasPagarCriadas   ContaPagar[]   @relation("ContaPagarCriadoPor")
// logsAuditoria        LogAuditoria[] @relation("LogAuditoriaUser")
```

### Índices e Performance

**Justificativa dos índices:**

1. `@@index([status, dataVencimento])` em ContaReceber e ContaPagar
   - **Uso**: Filtros mais comuns (listar contas pendentes, calcular vencidas)
   - **Impacto**: Queries de dashboard e relatórios

2. `@@index([clienteId, status])` em ContaReceber
   - **Uso**: Consultar contas de um cliente específico
   - **Impacto**: Tela de detalhes do cliente

3. `@@index([origem, status])` em ambas
   - **Uso**: Filtrar por origem (B2B, B2G, Manual, Comissão)
   - **Impacto**: Relatórios segmentados por origem

4. `@@index([dataVencimento])` em ambas
   - **Uso**: Cálculos de fluxo de caixa projetado
   - **Impacto**: Relatório de fluxo de caixa

5. `@@index([categoriaId, status])` em ContaPagar
   - **Uso**: Relatórios de despesas por categoria
   - **Impacto**: DRE detalhado

6. `@@unique` em `eventId`
   - **Uso**: Garantir idempotência de processamento de eventos
   - **Impacto**: Previne duplicação de lançamentos

### Regras de Integridade

1. **Não cascatear exclusões**: Se uma Opportunity ou Commission for excluída, a ContaReceber/ContaPagar deve permanecer (histórico financeiro)
2. **Campos obrigatórios**: `valor`, `dataVencimento`, `categoriaId`, `criadoPorId`
3. **Constraints de data**: `dataRecebimento` e `dataPagamento` devem ser >= `createdAt`
4. **Status PAGO imutável**: Contas com status PAGO não podem ser editadas ou excluídas
5. **eventId único**: Garante que o mesmo evento não cria múltiplas contas

---

## Error Handling

### Estratégia de Tratamento de Erros

#### 1. Erros de Validação (4xx)

```typescript
// Exemplo: Valor inválido
{
  "error": "VALIDATION_ERROR",
  "message": "Valor deve ser maior que zero",
  "field": "valor",
  "statusCode": 400
}

// Exemplo: Cliente não encontrado
{
  "error": "NOT_FOUND",
  "message": "Cliente com ID 'xxx' não foi encontrado",
  "statusCode": 404
}

// Exemplo: Tentativa de exclusão de conta paga
{
  "error": "FORBIDDEN_OPERATION",
  "message": "Não é possível excluir uma conta com status PAGO",
  "statusCode": 403
}
```

#### 2. Erros de Autorização (403)

```typescript
{
  "error": "FORBIDDEN",
  "message": "Usuário não possui permissão para marcar contas como pagas",
  "requiredRole": "diretor",
  "userRole": "gerente",
  "statusCode": 403
}
```

#### 3. Erros de Processamento de Eventos (5xx)

```typescript
// Erro ao processar evento
{
  "error": "EVENT_PROCESSING_ERROR",
  "message": "Falha ao processar evento opportunity.won",
  "eventId": "evt-123",
  "details": "Cliente com ID 'xxx' não encontrado",
  "retryCount": 1,
  "maxRetries": 3,
  "statusCode": 500
}
```

#### 4. Erros de Idempotência

```typescript
// Evento já processado (não é erro - retorna 200 com conta existente)
{
  "message": "Evento já foi processado anteriormente",
  "eventId": "evt-123",
  "existingRecord": { id, valor, ... },
  "statusCode": 200
}
```

### Retry Strategy para Eventos

```javascript
// events/listeners/baseListener.js
class BaseEventListener {
  async handleEvent(event) {
    const maxRetries = 3;
    let attempts = 0;

    while (attempts < maxRetries) {
      try {
        // Verifica idempotência
        const existing = await this.checkIdempotency(event.eventId);
        if (existing) {
          logger.info(`Evento ${event.eventId} já processado`);
          return existing;
        }

        // Processa evento
        const result = await this.processEvent(event);
        
        // Registra sucesso
        await this.logSuccess(event);
        
        return result;
      } catch (error) {
        attempts++;
        
        if (attempts >= maxRetries) {
          // Move para dead-letter queue
          await this.moveToDeadLetterQueue(event, error);
          
          // Notifica sistema de monitoramento
          await this.notifyFailure(event, error);
          
          throw error;
        }
        
        // Aguarda antes de retry (exponential backoff)
        await this.sleep(1000 * Math.pow(2, attempts));
      }
    }
  }
}
```

### Logging e Monitoramento

```javascript
// Estrutura de logs
{
  timestamp: '2024-01-10T10:30:00Z',
  level: 'info' | 'warn' | 'error',
  module: 'financeiro',
  action: 'create_conta_receber',
  userId: 'user-123',
  data: {
    eventId: 'evt-456',
    contaId: 'conta-789',
    valor: 10000
  },
  duration: 120, // ms
  success: true
}
```

---

## Testing Strategy

### Approach

O Módulo Financeiro **NÃO** é adequado para property-based testing (PBT) extensivo, pois:
- Envolve lógica de negócio complexa com regras de validação específicas (não é função pura)
- Integra com banco de dados e eventos externos
- Possui workflows de estado (PENDENTE → PAGO → etc)

Portanto, a estratégia de testes será:

1. **Unit Tests** (80% da cobertura)
   - Testar services isoladamente com mocks de Prisma
   - Testar validators com casos de borda
   - Testar utils (statusCalculator, dateUtils)

2. **Integration Tests** (15% da cobertura)
   - Testar event listeners com eventos reais
   - Testar fluxo completo de criação de conta via API
   - Testar cálculo de DRE/Fluxo de Caixa com dados reais

3. **End-to-End Tests** (5% da cobertura)
   - Testar workflow completo: Oportunidade Ganha → Conta Receber criada → Marcação como Paga

### Unit Tests

#### Exemplo 1: Validator (contas-receber)

```javascript
// __tests__/unit/validators/contasReceber.validator.test.js
describe('ContasReceberValidator', () => {
  describe('validateCreate', () => {
    it('deve aceitar dados válidos', () => {
      const data = {
        valor: 1000,
        clienteId: 'client-123',
        dataVencimento: '2024-12-31',
        categoriaId: 'cat-456'
      };
      expect(() => validateCreate(data)).not.toThrow();
    });

    it('deve rejeitar valor zero ou negativo', () => {
      const data = { valor: 0, clienteId: 'client-123', dataVencimento: '2024-12-31', categoriaId: 'cat-456' };
      expect(() => validateCreate(data)).toThrow('Valor deve ser maior que zero');
    });

    it('deve rejeitar data de vencimento anterior a 2020', () => {
      const data = { valor: 1000, clienteId: 'client-123', dataVencimento: '2019-12-31', categoriaId: 'cat-456' };
      expect(() => validateCreate(data)).toThrow('Data de vencimento inválida');
    });

    it('deve rejeitar clienteId vazio', () => {
      const data = { valor: 1000, clienteId: '', dataVencimento: '2024-12-31', categoriaId: 'cat-456' };
      expect(() => validateCreate(data)).toThrow('clienteId é obrigatório');
    });
  });
});
```

#### Exemplo 2: Service (cálculo de status)

```javascript
// __tests__/unit/services/contasReceber.service.test.js
describe('ContasReceberService', () => {
  describe('calcularStatusComputado', () => {
    it('deve retornar PAGO quando status for PAGO', () => {
      const conta = { status: 'PAGO', dataVencimento: new Date('2024-01-01') };
      expect(service.calcularStatusComputado(conta)).toBe('PAGO');
    });

    it('deve retornar CANCELADO quando status for CANCELADO', () => {
      const conta = { status: 'CANCELADO', dataVencimento: new Date('2024-01-01') };
      expect(service.calcularStatusComputado(conta)).toBe('CANCELADO');
    });

    it('deve retornar VENCIDO quando status PENDENTE e data vencida', () => {
      const conta = { status: 'PENDENTE', dataVencimento: new Date('2023-12-31') };
      expect(service.calcularStatusComputado(conta)).toBe('VENCIDO');
    });

    it('deve retornar PENDENTE quando status PENDENTE e data futura', () => {
      const conta = { status: 'PENDENTE', dataVencimento: new Date('2025-12-31') };
      expect(service.calcularStatusComputado(conta)).toBe('PENDENTE');
    });
  });
});
```

#### Exemplo 3: Event Listener (idempotência)

```javascript
// __tests__/unit/events/opportunityWonListener.test.js
describe('OpportunityWonListener', () => {
  describe('handleOpportunityWon', () => {
    it('deve criar conta receber para evento novo', async () => {
      const event = {
        eventId: 'evt-123',
        data: { opportunityId: 'opp-456', valor: 10000, clienteId: 'client-789', ... }
      };
      
      prismaMock.contaReceber.findUnique.mockResolvedValue(null); // Não existe
      prismaMock.contaReceber.create.mockResolvedValue({ id: 'conta-111', ... });
      
      const result = await listener.handleOpportunityWon(event);
      
      expect(result.id).toBe('conta-111');
      expect(prismaMock.contaReceber.create).toHaveBeenCalledTimes(1);
    });

    it('deve retornar conta existente se evento já processado (idempotência)', async () => {
      const event = { eventId: 'evt-123', ... };
      
      const existingConta = { id: 'conta-existing', eventId: 'evt-123', ... };
      prismaMock.contaReceber.findUnique.mockResolvedValue(existingConta);
      
      const result = await listener.handleOpportunityWon(event);
      
      expect(result.id).toBe('conta-existing');
      expect(prismaMock.contaReceber.create).not.toHaveBeenCalled();
    });
  });
});
```

### Integration Tests

#### Exemplo 1: API Endpoint (criar conta receber)

```javascript
// __tests__/integration/api/contasReceber.test.js
describe('POST /api/gestao/financeiro/contas-receber', () => {
  it('deve criar conta receber com autenticação', async () => {
    const token = await getAuthToken({ role: 'gerente' });
    
    const response = await request(app)
      .post('/api/gestao/financeiro/contas-receber')
      .set('Authorization', `Bearer ${token}`)
      .send({
        valor: 5000,
        clienteId: testClienteId,
        dataVencimento: '2024-12-31',
        categoriaId: testCategoriaId
      });
    
    expect(response.status).toBe(201);
    expect(response.body.valor).toBe(5000);
    expect(response.body.status).toBe('PENDENTE');
  });

  it('deve rejeitar se usuário não tiver papel adequado', async () => {
    const token = await getAuthToken({ role: 'seller' });
    
    const response = await request(app)
      .post('/api/gestao/financeiro/contas-receber')
      .set('Authorization', `Bearer ${token}`)
      .send({ ... });
    
    expect(response.status).toBe(403);
  });
});
```

#### Exemplo 2: Relatório DRE

```javascript
// __tests__/integration/services/dre.service.test.js
describe('DREService', () => {
  it('deve calcular DRE corretamente para período com lançamentos', async () => {
    // Setup: criar contas receber e pagar pagas no período
    await criarContaReceber({ valor: 10000, status: 'PAGO', dataRecebimento: '2024-01-15' });
    await criarContaReceber({ valor: 5000, status: 'PAGO', dataRecebimento: '2024-01-20' });
    await criarContaPagar({ valor: 2000, status: 'PAGO', categoria: 'Comissões', dataPagamento: '2024-01-18' });
    await criarContaPagar({ valor: 3000, status: 'PAGO', categoria: 'Despesas Operacionais', dataPagamento: '2024-01-25' });
    
    const dre = await dreService.gerarDRE(new Date('2024-01-01'), new Date('2024-01-31'));
    
    expect(dre.receitasBrutas).toBe(15000);
    expect(dre.custosDiretos).toBe(2000);
    expect(dre.lucroBruto).toBe(13000);
    expect(dre.despesasOperacionais).toBe(3000);
    expect(dre.lucroLiquido).toBe(10000);
  });
});
```

### End-to-End Tests

```javascript
// __tests__/e2e/workflow.test.js
describe('Workflow: Oportunidade Ganha → Conta Receber', () => {
  it('deve criar conta receber automaticamente quando oportunidade é ganha', async () => {
    // 1. Criar oportunidade no módulo B2B
    const opportunity = await createOpportunity({ value: 20000, stage: 'NEGOTIATION' });
    
    // 2. Marcar como ganha
    await updateOpportunityStage(opportunity.id, 'WON');
    
    // 3. Aguardar processamento assíncrono do evento
    await sleep(500);
    
    // 4. Verificar que conta receber foi criada
    const contasReceber = await listContasReceber({ opportunityId: opportunity.id });
    
    expect(contasReceber).toHaveLength(1);
    expect(contasReceber[0].valor).toBe(20000);
    expect(contasReceber[0].origem).toBe('B2B');
    expect(contasReceber[0].status).toBe('PENDENTE');
  });
});
```

---

## Development Action Plan

### Pre-requisites Checklist

- [ ] Verificar branch atual é `v3-teste`
- [ ] Confirmar que Prisma está configurado corretamente
- [ ] Confirmar que sistema de eventos (EventEmitter ou Queue) está implementado
- [ ] Revisar e aprovar requirements.md
- [ ] Revisar e aprovar design.md (este documento)

### Phase 1: Database Setup (Estimativa: 2-3 horas)

#### 1.1 Criar migration Prisma

```bash
# backend/
npx prisma migrate dev --name add_modulo_financeiro
```

**Arquivo de migration deve conter:**
- [ ] Criação de enum `StatusFinanceiro`
- [ ] Criação de enum `TipoCategoria`
- [ ] Criação de enum `OrigemContaReceber`
- [ ] Criação de enum `OrigemContaPagar`
- [ ] Criação de tabela `CategoriaFinanceira`
- [ ] Criação de tabela `CentroCusto`
- [ ] Criação de tabela `ContaReceber`
- [ ] Criação de tabela `ContaPagar`
- [ ] Criação de tabela `LogAuditoria`
- [ ] Seed de categorias padrão (6 categorias)
- [ ] Seed de centros de custo padrão (4 centros)
- [ ] Adicionar relacionamentos em `Company`, `Opportunity`, `Commission`, `User`

#### 1.2 Validar migration

```bash
# Aplicar migration
npx prisma migrate dev

# Gerar Prisma Client atualizado
npx prisma generate

# Validar schema
npx prisma validate
```

**Verificações:**
- [ ] Tabelas criadas com sucesso
- [ ] Índices criados corretamente
- [ ] Seeds executados (6 categorias, 4 centros de custo)
- [ ] Relacionamentos funcionando

---

### Phase 2: Backend Core Services (Estimativa: 6-8 horas)

#### 2.1 Implementar Validators

**Arquivos a criar:**
- `backend/src/modules/gestao/financeiro/validators/common.validator.js`
- `backend/src/modules/gestao/financeiro/validators/contasReceber.validator.js`
- `backend/src/modules/gestao/financeiro/validators/contasPagar.validator.js`

**Checklist:**
- [ ] `validateCreateContaReceber` (valor, clienteId, dataVencimento, categoriaId)
- [ ] `validateMarcarComoPago` (dataRecebimento/dataPagamento)
- [ ] `validateCreateContaPagar` (valor, fornecedor, dataVencimento, categoriaId)
- [ ] `validateDateRange` (dataInicio, dataFim)
- [ ] Testes unitários para cada validator (mínimo 3 casos por função)

#### 2.2 Implementar Utils

**Arquivos a criar:**
- `backend/src/modules/gestao/financeiro/utils/statusCalculator.js`
- `backend/src/modules/gestao/financeiro/utils/dateUtils.js`
- `backend/src/modules/gestao/financeiro/utils/numberFormatter.js`

**Checklist:**
- [ ] `calcularStatusComputado(conta)` - lógica de VENCIDO
- [ ] `isVencido(dataVencimento, status)` - helper
- [ ] `formatarMoeda(valor)` - formatação BRL
- [ ] `calcularDiasVencidos(dataVencimento)` - helper
- [ ] Testes unitários (mínimo 3 casos por função)

#### 2.3 Implementar Service: Contas a Receber

**Arquivo:** `backend/src/modules/gestao/financeiro/services/contasReceber.service.js`

**Checklist:**
- [ ] `list(filters, pagination)` - com filtros por status, cliente, origem, período
- [ ] `getById(id)` - incluindo auditoria
- [ ] `create(data)` - validar + criar + log auditoria
- [ ] `createFromOpportunity(event)` - processar evento opportunity.won
- [ ] `marcarComoPago(id, dataRecebimento)` - validar + atualizar + log + emitir evento
- [ ] `delete(id)` - validar status !== PAGO + soft delete + log
- [ ] `calcularStatusComputado(conta)` - delegar para util
- [ ] Testes unitários (mínimo 2 testes por método)

#### 2.4 Implementar Service: Contas a Pagar

**Arquivo:** `backend/src/modules/gestao/financeiro/services/contasPagar.service.js`

**Checklist:**
- [ ] `list(filters, pagination)` - com filtros por status, fornecedor, categoria, centro de custo, período
- [ ] `getById(id)` - incluindo auditoria
- [ ] `create(data)` - validar + criar + log auditoria
- [ ] `createFromCommission(event)` - processar evento commission.approved
- [ ] `marcarComoPago(id, dataPagamento)` - validar + atualizar + log + emitir evento payable.paid
- [ ] `delete(id)` - validar status !== PAGO + soft delete + log
- [ ] `calcularStatusComputado(conta)` - delegar para util
- [ ] Testes unitários (mínimo 2 testes por método)

#### 2.5 Implementar Service: Auditoria

**Arquivo:** `backend/src/modules/gestao/financeiro/services/auditoria.service.js`

**Checklist:**
- [ ] `registrarCriacao(entidade, id, userId, dados)`
- [ ] `registrarAlteracao(entidade, id, userId, alteracoes)`
- [ ] `listarPorEntidade(entidade, id)`
- [ ] Testes unitários (mínimo 1 teste por método)

---

### Phase 3: Event Handling (Estimativa: 4-5 horas)

#### 3.1 Implementar Event Listeners

**Arquivos a criar:**
- `backend/src/modules/gestao/financeiro/events/listeners/baseListener.js` (classe base)
- `backend/src/modules/gestao/financeiro/events/listeners/opportunityWonListener.js`
- `backend/src/modules/gestao/financeiro/events/listeners/commissionApprovedListener.js`

**Checklist:**
- [ ] BaseListener com retry logic (3 tentativas)
- [ ] BaseListener com idempotency check (via eventId)
- [ ] BaseListener com dead-letter queue handling
- [ ] `opportunityWonListener.handleEvent(event)` - criar ContaReceber via service
- [ ] `commissionApprovedListener.handleEvent(event)` - criar ContaPagar via service
- [ ] Testes unitários (idempotência, retry, falha)
- [ ] Testes de integração (evento real → conta criada)

#### 3.2 Implementar Event Emitters

**Arquivo:** `backend/src/modules/gestao/financeiro/events/emitters/financeiroEventEmitter.js`

**Checklist:**
- [ ] `emitReceivableCreated(conta)`
- [ ] `emitPayableCreated(conta)`
- [ ] `emitPayablePaid(conta, commissionId)`
- [ ] `emitReceivableOverdue(conta)`
- [ ] `emitPayableOverdue(conta)`
- [ ] Logs estruturados para cada evento emitido

#### 3.3 Registrar Listeners no Sistema de Eventos

**Arquivo:** `backend/src/eventBus.js` (ou equivalente)

**Checklist:**
- [ ] Registrar `opportunityWonListener` para evento `opportunity.won`
- [ ] Registrar `commissionApprovedListener` para evento `commission.approved`
- [ ] Testar fluxo end-to-end

---

### Phase 4: Reporting Services (Estimativa: 5-6 horas)

#### 4.1 Implementar Service: DRE

**Arquivo:** `backend/src/modules/gestao/financeiro/services/dre.service.js`

**Checklist:**
- [ ] `gerarDRE(dataInicio, dataFim, agruparPor?)` - calcular todas as métricas
- [ ] Query otimizada: agregar contas pagas no período
- [ ] Separar custos diretos (comissões) de despesas operacionais
- [ ] `exportarPDF(dre)` - gerar PDF com biblioteca (ex: PDFKit)
- [ ] `exportarCSV(dre)` - gerar CSV
- [ ] Testes de integração (dados reais → DRE correto)

#### 4.2 Implementar Service: Fluxo de Caixa

**Arquivo:** `backend/src/modules/gestao/financeiro/services/fluxoCaixa.service.js`

**Checklist:**
- [ ] `gerarFluxo(dataInicio, dataFim, agrupamento)` - calcular saldo projetado
- [ ] Query otimizada: agregar contas pendentes no período
- [ ] Agrupar por semana ou mês
- [ ] Destacar contas vencidas
- [ ] `exportarPDF(fluxo)` - gerar PDF
- [ ] `exportarCSV(fluxo)` - gerar CSV
- [ ] Testes de integração (dados reais → fluxo correto)

#### 4.3 Implementar Service: Dashboard

**Arquivo:** `backend/src/modules/gestao/financeiro/services/dashboard.service.js`

**Checklist:**
- [ ] `gerarDashboard()` - calcular todos os KPIs
- [ ] Total a receber (pendentes)
- [ ] Total a pagar (pendentes)
- [ ] Saldo projetado
- [ ] Receitas do mês (pagas)
- [ ] Despesas do mês (pagas)
- [ ] Contas vencidas (receber e pagar)
- [ ] Evolução últimos 6 meses (receitas vs despesas)
- [ ] Testes de integração (dados reais → dashboard correto)

---

### Phase 5: API Controllers and Routes (Estimativa: 4-5 horas)

#### 5.1 Implementar Controllers

**Arquivos a criar:**
- `backend/src/modules/gestao/financeiro/controllers/contasReceber.controller.js`
- `backend/src/modules/gestao/financeiro/controllers/contasPagar.controller.js`
- `backend/src/modules/gestao/financeiro/controllers/categorias.controller.js`
- `backend/src/modules/gestao/financeiro/controllers/centrosCusto.controller.js`
- `backend/src/modules/gestao/financeiro/controllers/dre.controller.js`
- `backend/src/modules/gestao/financeiro/controllers/fluxoCaixa.controller.js`
- `backend/src/modules/gestao/financeiro/controllers/dashboard.controller.js`

**Checklist:**
- [ ] Cada controller chama service correspondente
- [ ] Tratamento de erros com status HTTP corretos
- [ ] Validação de autenticação (via middleware)
- [ ] Validação de autorização (via middleware)
- [ ] Logs estruturados

#### 5.2 Implementar Middleware de Autorização

**Arquivo:** `backend/src/modules/gestao/financeiro/middleware/financeiroAuth.middleware.js`

**Checklist:**
- [ ] `requireFinanceiroView` - permite gerente, diretor, financeiro
- [ ] `requireFinanceiroCreate` - permite gerente, diretor, financeiro
- [ ] `requireFinanceiroMarkPaid` - permite diretor, financeiro
- [ ] `requireFinanceiroDelete` - permite apenas diretor
- [ ] Registrar tentativas de acesso negado no log de auditoria

#### 5.3 Criar Rotas Express

**Arquivo:** `backend/api/financeiro.js`

**Checklist:**
- [ ] `GET /api/gestao/financeiro/contas-receber` (requireFinanceiroView)
- [ ] `GET /api/gestao/financeiro/contas-receber/:id` (requireFinanceiroView)
- [ ] `POST /api/gestao/financeiro/contas-receber` (requireFinanceiroCreate)
- [ ] `PATCH /api/gestao/financeiro/contas-receber/:id/marcar-pago` (requireFinanceiroMarkPaid)
- [ ] `DELETE /api/gestao/financeiro/contas-receber/:id` (requireFinanceiroDelete)
- [ ] `GET /api/gestao/financeiro/contas-pagar` (requireFinanceiroView)
- [ ] `GET /api/gestao/financeiro/contas-pagar/:id` (requireFinanceiroView)
- [ ] `POST /api/gestao/financeiro/contas-pagar` (requireFinanceiroCreate)
- [ ] `PATCH /api/gestao/financeiro/contas-pagar/:id/marcar-pago` (requireFinanceiroMarkPaid)
- [ ] `DELETE /api/gestao/financeiro/contas-pagar/:id` (requireFinanceiroDelete)
- [ ] `GET /api/gestao/financeiro/relatorios/dre` (requireFinanceiroView)
- [ ] `GET /api/gestao/financeiro/relatorios/fluxo-caixa` (requireFinanceiroView)
- [ ] `GET /api/gestao/financeiro/dashboard` (requireFinanceiroView)
- [ ] `GET /api/gestao/financeiro/categorias` (requireFinanceiroView)
- [ ] `POST /api/gestao/financeiro/categorias` (requireFinanceiroCreate)
- [ ] `PATCH /api/gestao/financeiro/categorias/:id/desativar` (requireFinanceiroCreate)
- [ ] `GET /api/gestao/financeiro/centros-custo` (requireFinanceiroView)
- [ ] `POST /api/gestao/financeiro/centros-custo` (requireFinanceiroCreate)
- [ ] Registrar rotas no `server.js`
- [ ] Testes de integração para cada endpoint

---

### Phase 6: Frontend Components (Estimativa: 8-10 horas)

#### 6.1 Implementar Layout e Dashboard Principal

**Arquivos a criar:**
- `frontend/src/app/gestao/financeiro/layout.tsx`
- `frontend/src/app/gestao/financeiro/page.tsx`
- `frontend/src/app/gestao/financeiro/components/FinanceiroKPICard.tsx`

**Checklist:**
- [ ] Layout com menu lateral (Contas a Receber, Contas a Pagar, Relatórios, Configurações)
- [ ] Dashboard com 6 KPIs (usar `DashboardKPICard` do design system)
- [ ] Gráfico de evolução receitas vs despesas (usar `DashboardAdvancedChart`)
- [ ] Destaques de contas vencidas
- [ ] Responsivo (mobile-friendly)

#### 6.2 Implementar Telas de Contas a Receber

**Arquivos a criar:**
- `frontend/src/app/gestao/financeiro/contas-receber/page.tsx` (lista)
- `frontend/src/app/gestao/financeiro/contas-receber/[id]/page.tsx` (detalhes)
- `frontend/src/app/gestao/financeiro/contas-receber/nova/page.tsx` (criar)
- `frontend/src/app/gestao/financeiro/components/ContaReceberCard.tsx`
- `frontend/src/app/gestao/financeiro/components/StatusBadge.tsx`
- `frontend/src/app/gestao/financeiro/components/AuditoriaTimeline.tsx`

**Checklist:**
- [ ] Lista com filtros (status, cliente, origem, período)
- [ ] Paginação
- [ ] Cards com indicador de status (cores: PENDENTE=amarelo, PAGO=verde, VENCIDO=vermelho)
- [ ] Tela de detalhes com timeline de auditoria
- [ ] Formulário de criação manual
- [ ] Botão "Marcar como Pago" (apenas para roles adequados)
- [ ] Modal de confirmação para exclusão

#### 6.3 Implementar Telas de Contas a Pagar

**Arquivos a criar:**
- `frontend/src/app/gestao/financeiro/contas-pagar/page.tsx` (lista)
- `frontend/src/app/gestao/financeiro/contas-pagar/[id]/page.tsx` (detalhes)
- `frontend/src/app/gestao/financeiro/contas-pagar/nova/page.tsx` (criar)
- `frontend/src/app/gestao/financeiro/components/ContaPagarCard.tsx`

**Checklist:**
- [ ] Lista com filtros (status, fornecedor, categoria, centro de custo, período)
- [ ] Paginação
- [ ] Cards com indicador de status
- [ ] Tela de detalhes com timeline de auditoria
- [ ] Formulário de criação manual
- [ ] Botão "Marcar como Pago"
- [ ] Modal de confirmação para exclusão

#### 6.4 Implementar Relatórios

**Arquivos a criar:**
- `frontend/src/app/gestao/financeiro/relatorios/dre/page.tsx`
- `frontend/src/app/gestao/financeiro/relatorios/fluxo-caixa/page.tsx`
- `frontend/src/app/gestao/financeiro/components/DRETable.tsx`
- `frontend/src/app/gestao/financeiro/components/FluxoCaixaChart.tsx`

**Checklist:**
- [ ] Tela DRE com filtro de período
- [ ] Tabela DRE formatada (receitas, custos, lucro bruto, despesas, lucro líquido)
- [ ] Gráfico de barras (receitas vs despesas)
- [ ] Botão exportar PDF/CSV
- [ ] Tela Fluxo de Caixa com filtro de período e agrupamento
- [ ] Gráfico de linhas (entradas vs saídas projetadas)
- [ ] Destaque para contas vencidas
- [ ] Botão exportar PDF/CSV

#### 6.5 Implementar Configurações

**Arquivos a criar:**
- `frontend/src/app/gestao/financeiro/configuracoes/categorias/page.tsx`
- `frontend/src/app/gestao/financeiro/configuracoes/centros-custo/page.tsx`

**Checklist:**
- [ ] Lista de categorias com botão criar/desativar
- [ ] Lista de centros de custo com botão criar
- [ ] Formulários inline ou modais

---

### Phase 7: Testing and QA (Estimativa: 4-5 horas)

#### 7.1 Executar Testes Unitários

```bash
cd backend
npm test
```

**Checklist:**
- [ ] Todos os testes unitários passando (validators, services, utils)
- [ ] Cobertura mínima de 80% nas services
- [ ] Cobertura mínima de 90% em validators e utils

#### 7.2 Executar Testes de Integração

```bash
cd backend
npm run test:integration
```

**Checklist:**
- [ ] Testes de API endpoints passando
- [ ] Testes de event listeners passando
- [ ] Testes de relatórios (DRE, Fluxo de Caixa) passando

#### 7.3 Testes End-to-End (Manual)

**Checklist:**
- [ ] Criar oportunidade B2B, marcar como WON, verificar conta receber criada
- [ ] Criar comissão, aprovar, verificar conta pagar criada
- [ ] Marcar conta pagar de comissão como PAGO, verificar evento emitido para Comissões
- [ ] Criar conta receber manual, marcar como paga, verificar auditoria
- [ ] Gerar DRE com dados reais, verificar cálculos corretos
- [ ] Gerar Fluxo de Caixa com dados reais, verificar cálculos corretos
- [ ] Verificar dashboard com dados reais
- [ ] Testar filtros e paginação em todas as listas
- [ ] Testar permissões (seller não pode acessar, gerente pode visualizar, diretor pode marcar como pago)

#### 7.4 Testes de Performance

**Checklist:**
- [ ] Testar DRE com 1000+ lançamentos (tempo < 2s)
- [ ] Testar Fluxo de Caixa com 1000+ lançamentos (tempo < 2s)
- [ ] Testar dashboard com 5000+ lançamentos (tempo < 1s)
- [ ] Verificar índices de banco de dados sendo utilizados (via EXPLAIN)

---

### Phase 8: Documentation and Deployment (Estimativa: 2-3 horas)

#### 8.1 Atualizar Documentação

**Arquivos a atualizar:**
- `README.md` - adicionar seção Módulo Financeiro
- `backend/api/README.md` - documentar endpoints
- `docs/MODULO_FINANCEIRO.md` - criar guia de uso

**Checklist:**
- [ ] Documentar todos os endpoints com exemplos
- [ ] Criar diagrama de arquitetura atualizado
- [ ] Documentar contratos de eventos
- [ ] Criar guia de desenvolvimento (como adicionar nova funcionalidade)

#### 8.2 Preparar Deploy

**Checklist:**
- [ ] Verificar `.env.example` atualizado com variáveis necessárias
- [ ] Criar script de seed para dados de teste (categorias, centros de custo)
- [ ] Verificar migrations prontas para produção
- [ ] Testar build de produção
- [ ] Criar checklist de deploy

#### 8.3 Deploy em v3-teste

```bash
# Confirmar branch
git checkout v3-teste

# Aplicar migrations
cd backend
npx prisma migrate deploy

# Build backend
npm run build

# Build frontend
cd ../frontend
npm run build

# Restart serviços
pm2 restart all
```

**Checklist:**
- [ ] Migrations aplicadas com sucesso
- [ ] Seeds executados (categorias, centros de custo)
- [ ] Backend rodando sem erros
- [ ] Frontend acessível
- [ ] Testar fluxo end-to-end em v3-teste

---

### Phase 9: Rollout and Monitoring (Estimativa: 1-2 horas)

#### 9.1 Configurar Monitoramento

**Checklist:**
- [ ] Configurar logs estruturados (Winston ou Pino)
- [ ] Configurar alertas para falhas de processamento de eventos
- [ ] Configurar alertas para dead-letter queue
- [ ] Dashboard de métricas (número de contas criadas/dia, tempo de processamento de eventos)

#### 9.2 Comunicar aos Usuários

**Checklist:**
- [ ] Criar anúncio de nova funcionalidade
- [ ] Preparar treinamento básico (vídeo ou documentação)
- [ ] Definir usuários beta (gerentes financeiros)

#### 9.3 Acompanhar Primeiras Semanas

**Checklist:**
- [ ] Monitorar logs diariamente
- [ ] Verificar integridade de eventos (nenhum na dead-letter queue)
- [ ] Coletar feedback dos usuários beta
- [ ] Corrigir bugs críticos imediatamente

---

## Estimativa Total de Desenvolvimento

| Fase | Tempo Estimado |
|------|----------------|
| 1. Database Setup | 2-3 horas |
| 2. Backend Core Services | 6-8 horas |
| 3. Event Handling | 4-5 horas |
| 4. Reporting Services | 5-6 horas |
| 5. API Controllers and Routes | 4-5 horas |
| 6. Frontend Components | 8-10 horas |
| 7. Testing and QA | 4-5 horas |
| 8. Documentation and Deployment | 2-3 horas |
| 9. Rollout and Monitoring | 1-2 horas |
| **TOTAL** | **36-47 horas** |

**Considerando ritmo de desenvolvimento:**
- 1 desenvolvedor full-stack: 5-6 dias úteis (8h/dia)
- 2 desenvolvedores (1 backend + 1 frontend): 3-4 dias úteis

---

## Risk Mitigation

### Riscos Identificados

1. **Processamento duplicado de eventos**
   - **Mitigação**: Campo `eventId` único, verificação de idempotência em listeners

2. **Performance em relatórios com muitos lançamentos**
   - **Mitigação**: Índices otimizados, agregações no banco de dados, cache de relatórios

3. **Inconsistência entre módulos (dessincronia de eventos)**
   - **Mitigação**: Retry logic com exponential backoff, dead-letter queue, monitoramento

4. **Exclusão acidental de lançamentos financeiros**
   - **Mitigação**: Soft delete, permissões restritas, confirmação obrigatória na UI

5. **Erro humano em criação manual de lançamentos**
   - **Mitigação**: Validações rigorosas, preview antes de salvar, categorização automática sugerida

---

## Glossary (Termos Técnicos)

| Termo | Definição |
|-------|-----------|
| **Idempotência** | Propriedade de operação que pode ser executada múltiplas vezes com o mesmo resultado |
| **Dead-Letter Queue** | Fila para eventos que falham após tentativas de reprocessamento |
| **Soft Delete** | Marcação de registro como excluído sem removê-lo fisicamente do banco |
| **Exponential Backoff** | Estratégia de retry com aumento exponencial do intervalo entre tentativas |
| **Event-Driven Architecture** | Arquitetura baseada em troca de eventos assíncronos entre módulos |
| **Status Computado** | Status derivado em runtime a partir de outros campos (não armazenado) |

---

**Versão**: 1.0  
**Data de criação**: 2026-01-10  
**Branch de desenvolvimento**: v3-teste  
**Status**: Em revisão
