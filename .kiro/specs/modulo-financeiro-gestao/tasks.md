# Implementation Plan: Módulo Financeiro (Gestão)

## Overview

Este plano detalha a implementação do Módulo Financeiro, um sub-módulo crítico do sistema de GESTÃO do NexosIntegrator. A implementação seguirá uma arquitetura event-driven, integrando-se aos módulos B2B, B2G e Comissões para automatizar o controle de receitas e despesas da empresa.

**Stack Tecnológica:**
- Backend: Node.js + Express + Prisma ORM
- Frontend: Next.js + TypeScript + React
- Database: PostgreSQL (Neon)
- Branch: v3-teste

**Abordagem de Implementação:**
1. Database-first (schema, migrations, seeds)
2. Backend services (validators, utils, services core)
3. Event handling (listeners, emitters)
4. Reporting services (DRE, Fluxo de Caixa, Dashboard)
5. API layer (controllers, routes, middleware)
6. Frontend (pages, components)
7. Testing e QA

---

## Tasks

- [ ] 1. Database Setup e Configuração Base
  - [ ] 1.1 Criar e aplicar migration Prisma para módulo financeiro
    - Criar arquivo de migration com todos os models (CategoriaFinanceira, CentroCusto, ContaReceber, ContaPagar, LogAuditoria)
    - Adicionar enums (StatusFinanceiro, TipoCategoria, OrigemContaReceber, OrigemContaPagar)
    - Adicionar relacionamentos em models existentes (Company, Opportunity, Commission, User)
    - Criar índices otimizados conforme especificação do design
    - Executar `npx prisma migrate dev --name add_modulo_financeiro`
    - Gerar Prisma Client atualizado com `npx prisma generate`
    - _Requirements: 2.1, 2.2, 3.1, 4.1, 5.1, 6.1, 9.1, 9.2_
  
  - [ ] 1.2 Criar seed para categorias e centros de custo padrão
    - Implementar seed de 6 categorias financeiras: "Vendas B2B" (RECEITA), "Vendas B2G" (RECEITA), "Comissões de Vendas" (DESPESA), "Despesas Operacionais" (DESPESA), "Impostos" (DESPESA), "Outras Receitas" (RECEITA)
    - Implementar seed de 4 centros de custo: "Comercial", "Administrativo", "Marketing", "Operacional"
    - Executar seed e validar dados criados
    - _Requirements: 5.2, 6.2_
  
  - [ ] 1.3 Criar arquivo de configuração do spec
    - Criar `.kiro/specs/modulo-financeiro-gestao/.config.kiro` com specId, workflowType e specType
    - _Requirements: Infraestrutura_

- [ ] 2. Backend: Validators e Utilities
  - [ ] 2.1 Implementar validators comuns
    - Criar `backend/src/modules/gestao/financeiro/validators/common.validator.js`
    - Implementar `validateDateRange(dataInicio, dataFim)` - validar intervalo de datas
    - Implementar `validatePositiveValue(valor)` - validar valor > 0
    - Implementar `validateDateNotBefore2020(data)` - validar data >= 2020-01-01
    - _Requirements: 11.1, 11.2, 11.3_
  
  - [ ]* 2.2 Escrever testes unitários para validators comuns
    - Testar `validateDateRange` com datas válidas e inválidas (mínimo 3 casos)
    - Testar `validatePositiveValue` com valores positivos, zero e negativos
    - Testar `validateDateNotBefore2020` com datas antes e depois de 2020
    - _Requirements: 11.1, 11.2, 11.3_
  
  - [ ] 2.3 Implementar validator de Contas a Receber
    - Criar `backend/src/modules/gestao/financeiro/validators/contasReceber.validator.js`
    - Implementar `validateCreateContaReceber(data)` - validar campos obrigatórios e regras de negócio
    - Implementar `validateMarcarComoPago(id, dataRecebimento)` - validar data de recebimento
    - Usar biblioteca de validação (zod ou joi)
    - _Requirements: 2.3, 2.4, 11.1, 11.5_
  
  - [ ]* 2.4 Escrever testes unitários para validator de Contas a Receber
    - Testar casos válidos e inválidos para criação
    - Testar validação de data de recebimento
    - _Requirements: 2.3, 2.4, 11.1, 11.5_
  
  - [ ] 2.5 Implementar validator de Contas a Pagar
    - Criar `backend/src/modules/gestao/financeiro/validators/contasPagar.validator.js`
    - Implementar `validateCreateContaPagar(data)` - validar campos obrigatórios e categoria
    - Implementar `validateMarcarComoPago(id, dataPagamento)` - validar data de pagamento
    - _Requirements: 4.3, 4.4, 11.2, 11.6_
  
  - [ ]* 2.6 Escrever testes unitários para validator de Contas a Pagar
    - Testar casos válidos e inválidos para criação
    - Testar validação de categoria obrigatória
    - Testar validação de data de pagamento
    - _Requirements: 4.3, 4.4, 11.2, 11.6_
  
  - [ ] 2.7 Implementar utilities financeiras
    - Criar `backend/src/modules/gestao/financeiro/utils/statusCalculator.js`
    - Implementar `calcularStatusComputado(conta)` - lógica para determinar status VENCIDO
    - Implementar `isVencido(dataVencimento, status)` - helper function
    - Criar `backend/src/modules/gestao/financeiro/utils/dateUtils.js`
    - Implementar `calcularDiasVencidos(dataVencimento)` - calcular dias desde vencimento
    - Criar `backend/src/modules/gestao/financeiro/utils/numberFormatter.js`
    - Implementar `formatarMoeda(valor)` - formatação em BRL
    - _Requirements: 2.8, 4.8, 8.7_
  
  - [ ]* 2.8 Escrever testes unitários para utilities
    - Testar `calcularStatusComputado` com status PENDENTE/PAGO/CANCELADO e datas variadas (mínimo 4 casos)
    - Testar `calcularDiasVencidos` com datas passadas e futuras
    - Testar `formatarMoeda` com valores diversos
    - _Requirements: 2.8, 4.8_

- [ ] 3. Backend: Service de Auditoria
  - [ ] 3.1 Implementar serviço de auditoria
    - Criar `backend/src/modules/gestao/financeiro/services/auditoria.service.js`
    - Implementar `registrarCriacao(entidade, id, userId, dados)` - log de criação
    - Implementar `registrarAlteracao(entidade, id, userId, alteracoes)` - log de alteração
    - Implementar `listarPorEntidade(entidade, id)` - recuperar histórico de auditoria
    - Usar Prisma para inserir em LogAuditoria
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [ ]* 3.2 Escrever testes unitários para serviço de auditoria
    - Testar `registrarCriacao` com mock do Prisma
    - Testar `registrarAlteracao` com diferentes tipos de alterações
    - Testar `listarPorEntidade` com filtros
    - _Requirements: 9.5, 9.6_

- [ ] 4. Backend: Service de Contas a Receber
  - [ ] 4.1 Implementar service de Contas a Receber - operações básicas
    - Criar `backend/src/modules/gestao/financeiro/services/contasReceber.service.js`
    - Implementar `list(filters, pagination)` - listar com filtros (status, cliente, origem, período) e paginação
    - Implementar `getById(id)` - buscar por ID incluindo auditoria relacionada
    - Aplicar `calcularStatusComputado` antes de retornar resultados
    - _Requirements: 2.5, 2.8_
  
  - [ ] 4.2 Implementar service de Contas a Receber - criação manual
    - Implementar `create(data)` - criar conta manualmente
    - Validar dados usando validator
    - Validar que cliente existe no sistema
    - Registrar auditoria de criação
    - Emitir evento `receivable.created`
    - _Requirements: 2.2, 2.3, 2.4, 9.3, 15.6_
  
  - [ ] 4.3 Implementar service de Contas a Receber - criação via evento
    - Implementar `createFromOpportunity(event)` - processar evento opportunity.won
    - Verificar idempotência via eventId (checar se já existe conta com esse eventId)
    - Calcular data de vencimento baseada em prazoRecebimento
    - Atribuir categoria automaticamente ("Vendas B2B" ou "Vendas B2G" baseado na origem)
    - Copiar dados da oportunidade para campos de histórico
    - Registrar auditoria de criação
    - _Requirements: 1.3, 1.4, 1.6, 5.7, 5.8, 9.7, 14.3, 15.1_
  
  - [ ] 4.4 Implementar service de Contas a Receber - atualização e exclusão
    - Implementar `marcarComoPago(id, dataRecebimento)` - atualizar status para PAGO
    - Validar que data de recebimento >= data de criação
    - Registrar data de recebimento automaticamente
    - Registrar auditoria de alteração de status
    - Implementar `delete(id)` - excluir conta (apenas se status !== PAGO)
    - Registrar auditoria de exclusão
    - _Requirements: 2.6, 2.7, 9.4, 9.5, 11.4, 11.5, 11.7_
  
  - [ ]* 4.5 Escrever testes unitários para service de Contas a Receber
    - Testar `list` com diferentes filtros e paginação (mínimo 2 casos)
    - Testar `create` com dados válidos e inválidos
    - Testar `createFromOpportunity` com evento válido
    - Testar idempotência de `createFromOpportunity` (processar mesmo evento 2x deve retornar mesma conta)
    - Testar `marcarComoPago` com data válida
    - Testar `delete` com status PAGO (deve falhar) e PENDENTE (deve suceder)
    - _Requirements: 1.6, 2.2, 2.3, 2.6, 11.4, 11.8_

- [ ] 5. Backend: Service de Contas a Pagar
  - [ ] 5.1 Implementar service de Contas a Pagar - operações básicas
    - Criar `backend/src/modules/gestao/financeiro/services/contasPagar.service.js`
    - Implementar `list(filters, pagination)` - listar com filtros (status, fornecedor, categoria, centro de custo, período)
    - Implementar `getById(id)` - buscar por ID incluindo auditoria
    - Aplicar `calcularStatusComputado` antes de retornar
    - _Requirements: 4.5, 4.8_
  
  - [ ] 5.2 Implementar service de Contas a Pagar - criação manual
    - Implementar `create(data)` - criar conta manualmente
    - Validar dados usando validator
    - Exigir categoriaId obrigatória
    - Permitir centroCustoId opcional
    - Registrar auditoria de criação
    - Emitir evento `payable.created`
    - _Requirements: 4.2, 4.3, 4.4, 9.3, 15.7_
  
  - [ ] 5.3 Implementar service de Contas a Pagar - criação via comissão
    - Implementar `createFromCommission(event)` - processar evento commission.approved
    - Verificar idempotência via eventId
    - Calcular data de vencimento baseada em prazoVencimento
    - Atribuir categoria "Comissões de Vendas" automaticamente
    - Atribuir centro de custo "Comercial" automaticamente
    - Copiar dados da comissão (sellerId, sellerNome, valor)
    - Registrar auditoria de criação
    - _Requirements: 3.2, 3.3, 3.5, 5.9, 6.6, 9.8, 14.4, 15.2_
  
  - [ ] 5.4 Implementar service de Contas a Pagar - atualização e exclusão
    - Implementar `marcarComoPago(id, dataPagamento)` - atualizar status para PAGO
    - Validar que data de pagamento >= data de criação
    - Registrar data de pagamento automaticamente
    - Se origem for COMISSAO, emitir evento `payable.paid` para Sub_Modulo_Comissões
    - Registrar auditoria de alteração de status
    - Implementar `delete(id)` - excluir conta (apenas se status !== PAGO)
    - _Requirements: 3.4, 4.6, 4.7, 9.4, 11.4, 11.6, 11.7, 15.8_
  
  - [ ]* 5.5 Escrever testes unitários para service de Contas a Pagar
    - Testar `list` com diferentes filtros
    - Testar `create` com e sem centro de custo
    - Testar `createFromCommission` com evento válido
    - Testar idempotência de `createFromCommission`
    - Testar `marcarComoPago` e verificar emissão de evento payable.paid
    - Testar `delete` com diferentes status
    - _Requirements: 3.2, 3.5, 4.2, 4.6, 11.4_

- [ ] 6. Backend: Services de Configuração
  - [ ] 6.1 Implementar service de Categorias Financeiras
    - Criar `backend/src/modules/gestao/financeiro/services/categorias.service.js`
    - Implementar `list()` - listar todas as categorias ativas
    - Implementar `create(nome, tipo)` - criar categoria customizada
    - Validar nome único
    - Implementar `desativar(id)` - soft delete de categoria
    - Preservar histórico de lançamentos categorizados
    - _Requirements: 5.1, 5.3, 5.4, 5.5, 5.6_
  
  - [ ] 6.2 Implementar service de Centros de Custo
    - Criar `backend/src/modules/gestao/financeiro/services/centrosCusto.service.js`
    - Implementar `list()` - listar todos os centros ativos
    - Implementar `create(nome, codigo)` - criar centro customizado
    - Validar código único
    - _Requirements: 6.1, 6.3, 6.4, 6.5_
  
  - [ ]* 6.3 Escrever testes unitários para services de configuração
    - Testar criação de categoria com nome duplicado (deve falhar)
    - Testar desativação de categoria preservando histórico
    - Testar criação de centro de custo com código duplicado (deve falhar)
    - _Requirements: 5.4, 5.6, 6.4_

- [ ] 7. Checkpoint - Validar Services Core
  - Executar todos os testes unitários de services
  - Verificar que validators, utils e services estão funcionando corretamente
  - Verificar logs de auditoria sendo gerados
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Backend: Event Handling
  - [ ] 8.1 Implementar classe base de event listener
    - Criar `backend/src/modules/gestao/financeiro/events/listeners/baseListener.js`
    - Implementar retry logic com 3 tentativas
    - Implementar exponential backoff (1s, 2s, 4s)
    - Implementar verificação de idempotência via eventId
    - Implementar dead-letter queue handling para eventos que falharam 3x
    - Implementar logging estruturado de eventos
    - _Requirements: 15.3, 15.4, 15.5_
  
  - [ ] 8.2 Implementar listener de oportunidades ganhas
    - Criar `backend/src/modules/gestao/financeiro/events/listeners/opportunityWonListener.js`
    - Estender BaseListener
    - Implementar `handleEvent(event)` - processar evento opportunity.won
    - Chamar `contasReceberService.createFromOpportunity(event)`
    - Tratar erros e registrar falhas
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 15.1_
  
  - [ ] 8.3 Implementar listener de comissões aprovadas
    - Criar `backend/src/modules/gestao/financeiro/events/listeners/commissionApprovedListener.js`
    - Estender BaseListener
    - Implementar `handleEvent(event)` - processar evento commission.approved
    - Chamar `contasPagarService.createFromCommission(event)`
    - Tratar erros e registrar falhas
    - _Requirements: 3.1, 3.2, 3.5, 15.2_
  
  - [ ]* 8.4 Escrever testes unitários para event listeners
    - Testar BaseListener com retry logic (simular falha e retry)
    - Testar idempotência do opportunityWonListener
    - Testar idempotência do commissionApprovedListener
    - Testar handling de dead-letter queue após 3 falhas
    - _Requirements: 1.6, 3.5, 15.4, 15.5_
  
  - [ ] 8.5 Implementar event emitter
    - Criar `backend/src/modules/gestao/financeiro/events/emitters/financeiroEventEmitter.js`
    - Implementar `emitReceivableCreated(conta)` - emitir evento receivable.created
    - Implementar `emitPayableCreated(conta)` - emitir evento payable.created
    - Implementar `emitPayablePaid(conta, commissionId)` - emitir evento payable.paid
    - Implementar `emitReceivableOverdue(conta)` - emitir evento receivable.overdue
    - Implementar `emitPayableOverdue(conta)` - emitir evento payable.overdue
    - Adicionar logging estruturado para cada evento emitido
    - _Requirements: 2.9, 4.9, 13.1, 13.2, 15.6, 15.7, 15.8_
  
  - [ ] 8.6 Registrar listeners no sistema de eventos
    - Modificar `backend/src/eventBus.js` (ou arquivo equivalente)
    - Registrar opportunityWonListener para evento `opportunity.won`
    - Registrar commissionApprovedListener para evento `commission.approved`
    - _Requirements: 15.1, 15.2_
  
  - [ ]* 8.7 Escrever testes de integração para fluxo de eventos
    - Testar fluxo completo: emitir opportunity.won → verificar ContaReceber criada
    - Testar fluxo completo: emitir commission.approved → verificar ContaPagar criada
    - Testar emissão de payable.paid quando conta de comissão é paga
    - _Requirements: 1.3, 3.2, 3.4_

- [ ] 9. Backend: Reporting Services
  - [ ] 9.1 Implementar service de DRE
    - Criar `backend/src/modules/gestao/financeiro/services/dre.service.js`
    - Implementar `gerarDRE(dataInicio, dataFim, agruparPor?)` - calcular todas as métricas
    - Calcular Receitas Brutas: somar ContasReceber com status PAGO no período
    - Calcular Custos Diretos: somar ContasPagar de categoria "Comissões" com status PAGO no período
    - Calcular Lucro Bruto: Receitas Brutas - Custos Diretos
    - Calcular Despesas Operacionais: somar ContasPagar (exceto comissões) com status PAGO no período
    - Calcular Lucro Líquido: Lucro Bruto - Despesas Operacionais
    - Se agruparPor='categoria', incluir detalhamento por categoria
    - Usar query agregada do Prisma para performance
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.10_
  
  - [ ] 9.2 Implementar exportação de DRE
    - Implementar `exportarPDF(dre)` - gerar PDF do DRE usando biblioteca (PDFKit ou similar)
    - Implementar `exportarCSV(dre)` - gerar CSV do DRE
    - _Requirements: 7.9_
  
  - [ ]* 9.3 Escrever testes de integração para DRE
    - Criar contas receber e pagar de teste com status PAGO no período
    - Gerar DRE e validar cálculos (receitas, custos, lucro bruto, despesas, lucro líquido)
    - Testar DRE com período sem lançamentos (deve retornar zeros)
    - Testar DRE com agrupamento por categoria
    - _Requirements: 7.3, 7.4, 7.5, 7.6, 7.7, 7.10_
  
  - [ ] 9.4 Implementar service de Fluxo de Caixa
    - Criar `backend/src/modules/gestao/financeiro/services/fluxoCaixa.service.js`
    - Implementar `gerarFluxo(dataInicio, dataFim, agrupamento)` - calcular fluxo projetado
    - Calcular Entradas Previstas: somar ContasReceber PENDENTE com vencimento no período
    - Calcular Saídas Previstas: somar ContasPagar PENDENTE com vencimento no período
    - Calcular Saldo Final Projetado: saldo inicial + entradas - saídas
    - Agrupar por semana ou mês conforme parâmetro agrupamento
    - Destacar contas VENCIDAS (status PENDENTE com data passada)
    - Usar query agregada do Prisma
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.9_
  
  - [ ] 9.5 Implementar exportação de Fluxo de Caixa
    - Implementar `exportarPDF(fluxo)` - gerar PDF
    - Implementar `exportarCSV(fluxo)` - gerar CSV
    - _Requirements: 8.8_
  
  - [ ]* 9.6 Escrever testes de integração para Fluxo de Caixa
    - Criar contas PENDENTE com diferentes datas de vencimento
    - Gerar fluxo de caixa e validar cálculos (entradas, saídas, saldo)
    - Testar agrupamento por semana e por mês
    - Testar destaque de contas vencidas
    - Testar alerta de saldo negativo
    - _Requirements: 8.3, 8.4, 8.5, 8.6, 8.7, 8.9_
  
  - [ ] 9.7 Implementar service de Dashboard
    - Criar `backend/src/modules/gestao/financeiro/services/dashboard.service.js`
    - Implementar `gerarDashboard()` - calcular todos os KPIs
    - Calcular Total a Receber: somar ContasReceber PENDENTE
    - Calcular Total a Pagar: somar ContasPagar PENDENTE
    - Calcular Saldo Projetado: Total a Receber - Total a Pagar
    - Calcular Receitas do Mês: somar ContasReceber PAGO no mês corrente
    - Calcular Despesas do Mês: somar ContasPagar PAGO no mês corrente
    - Calcular Contas Vencidas: contar PENDENTE com data passada (receber e pagar)
    - Calcular Evolução últimos 6 meses: receitas vs despesas por mês
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8_
  
  - [ ]* 9.8 Escrever testes de integração para Dashboard
    - Criar dados de teste (contas PENDENTE, PAGO, VENCIDO)
    - Gerar dashboard e validar cada KPI
    - Validar cálculo de evolução últimos 6 meses
    - _Requirements: 12.2, 12.3, 12.4, 12.5, 12.6, 12.8_

- [ ] 10. Checkpoint - Validar Reporting Services
  - Executar testes de integração de DRE, Fluxo de Caixa e Dashboard
  - Validar performance de queries (testar com 1000+ lançamentos)
  - Validar índices sendo utilizados (usar EXPLAIN do PostgreSQL)
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Backend: API Layer
  - [ ] 11.1 Implementar middleware de autenticação e autorização
    - Criar `backend/src/modules/gestao/financeiro/middleware/financeiroAuth.middleware.js`
    - Implementar `requireFinanceiroView` - permite gerente, diretor, financeiro
    - Implementar `requireFinanceiroCreate` - permite gerente, diretor, financeiro
    - Implementar `requireFinanceiroMarkPaid` - permite diretor, financeiro
    - Implementar `requireFinanceiroDelete` - permite apenas diretor
    - Registrar tentativas de acesso negado no log de auditoria
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_
  
  - [ ] 11.2 Implementar controllers de Contas a Receber
    - Criar `backend/src/modules/gestao/financeiro/controllers/contasReceber.controller.js`
    - Implementar `list(req, res)` - endpoint GET com filtros e paginação
    - Implementar `getById(req, res)` - endpoint GET por ID
    - Implementar `create(req, res)` - endpoint POST criar manualmente
    - Implementar `marcarComoPago(req, res)` - endpoint PATCH marcar como pago
    - Implementar `delete(req, res)` - endpoint DELETE
    - Chamar services correspondentes
    - Tratar erros com status HTTP corretos (400, 403, 404, 500)
    - _Requirements: 2.2, 2.5, 2.6_
  
  - [ ] 11.3 Implementar controllers de Contas a Pagar
    - Criar `backend/src/modules/gestao/financeiro/controllers/contasPagar.controller.js`
    - Implementar `list(req, res)` - endpoint GET com filtros e paginação
    - Implementar `getById(req, res)` - endpoint GET por ID
    - Implementar `create(req, res)` - endpoint POST criar manualmente
    - Implementar `marcarComoPago(req, res)` - endpoint PATCH marcar como pago
    - Implementar `delete(req, res)` - endpoint DELETE
    - _Requirements: 4.2, 4.5, 4.6_
  
  - [ ] 11.4 Implementar controllers de Relatórios
    - Criar `backend/src/modules/gestao/financeiro/controllers/dre.controller.js`
    - Implementar `gerarDRE(req, res)` - endpoint GET com filtros de período
    - Criar `backend/src/modules/gestao/financeiro/controllers/fluxoCaixa.controller.js`
    - Implementar `gerarFluxoCaixa(req, res)` - endpoint GET com filtros
    - Criar `backend/src/modules/gestao/financeiro/controllers/dashboard.controller.js`
    - Implementar `getDashboard(req, res)` - endpoint GET para KPIs
    - _Requirements: 7.1, 8.1, 12.1_
  
  - [ ] 11.5 Implementar controllers de Configuração
    - Criar `backend/src/modules/gestao/financeiro/controllers/categorias.controller.js`
    - Implementar `list(req, res)`, `create(req, res)`, `desativar(req, res)`
    - Criar `backend/src/modules/gestao/financeiro/controllers/centrosCusto.controller.js`
    - Implementar `list(req, res)`, `create(req, res)`
    - _Requirements: 5.1, 5.3, 5.5, 6.1, 6.3_
  
  - [ ] 11.6 Criar rotas Express
    - Criar `backend/api/financeiro.js`
    - Registrar todas as rotas com middlewares de autenticação/autorização:
      - GET /api/gestao/financeiro/contas-receber (requireFinanceiroView)
      - GET /api/gestao/financeiro/contas-receber/:id (requireFinanceiroView)
      - POST /api/gestao/financeiro/contas-receber (requireFinanceiroCreate)
      - PATCH /api/gestao/financeiro/contas-receber/:id/marcar-pago (requireFinanceiroMarkPaid)
      - DELETE /api/gestao/financeiro/contas-receber/:id (requireFinanceiroDelete)
      - GET /api/gestao/financeiro/contas-pagar (requireFinanceiroView)
      - GET /api/gestao/financeiro/contas-pagar/:id (requireFinanceiroView)
      - POST /api/gestao/financeiro/contas-pagar (requireFinanceiroCreate)
      - PATCH /api/gestao/financeiro/contas-pagar/:id/marcar-pago (requireFinanceiroMarkPaid)
      - DELETE /api/gestao/financeiro/contas-pagar/:id (requireFinanceiroDelete)
      - GET /api/gestao/financeiro/relatorios/dre (requireFinanceiroView)
      - GET /api/gestao/financeiro/relatorios/fluxo-caixa (requireFinanceiroView)
      - GET /api/gestao/financeiro/dashboard (requireFinanceiroView)
      - GET /api/gestao/financeiro/categorias (requireFinanceiroView)
      - POST /api/gestao/financeiro/categorias (requireFinanceiroCreate)
      - PATCH /api/gestao/financeiro/categorias/:id/desativar (requireFinanceiroCreate)
      - GET /api/gestao/financeiro/centros-custo (requireFinanceiroView)
      - POST /api/gestao/financeiro/centros-custo (requireFinanceiroCreate)
    - Registrar arquivo de rotas em `backend/server.js`
    - _Requirements: 10.2, 10.3, 10.4, 10.5_
  
  - [ ]* 11.7 Escrever testes de integração para API
    - Testar cada endpoint com autenticação válida (status 200/201)
    - Testar endpoints sem autenticação (status 401)
    - Testar endpoints com role inadequado (status 403)
    - Testar criação de conta receber via API
    - Testar marcar conta como paga via API
    - Testar geração de DRE via API
    - Testar geração de Fluxo de Caixa via API
    - Testar dashboard via API
    - _Requirements: 10.1, 10.2, 10.7_

- [ ] 12. Checkpoint - Validar Backend Completo
  - Executar todos os testes (unitários + integração)
  - Validar cobertura de testes (mínimo 80% em services)
  - Testar fluxo end-to-end via API (criar conta, marcar como paga, gerar relatório)
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Frontend: Layout e Estrutura Base
  - [ ] 13.1 Criar layout do módulo financeiro
    - Criar `frontend/src/app/gestao/financeiro/layout.tsx`
    - Implementar menu lateral com links para: Dashboard, Contas a Receber, Contas a Pagar, Relatórios (DRE, Fluxo de Caixa), Configurações
    - Usar componentes do design system (Sidebar, Navigation)
    - Aplicar estilos responsivos
    - _Requirements: Interface_
  
  - [ ] 13.2 Criar componentes compartilhados
    - Criar `frontend/src/app/gestao/financeiro/components/StatusBadge.tsx`
    - Implementar badge com cores por status: PENDENTE (amarelo), PAGO (verde), CANCELADO (cinza), VENCIDO (vermelho)
    - Criar `frontend/src/app/gestao/financeiro/components/AuditoriaTimeline.tsx`
    - Implementar timeline de logs de auditoria
    - Criar `frontend/src/app/gestao/financeiro/components/FinanceiroKPICard.tsx`
    - Implementar card de KPI para dashboard
    - _Requirements: 9.6, 12.8_

- [ ] 14. Frontend: Dashboard Financeiro
  - [ ] 14.1 Implementar página do Dashboard
    - Criar `frontend/src/app/gestao/financeiro/page.tsx`
    - Fazer fetch de dados do dashboard via API GET /api/gestao/financeiro/dashboard
    - Exibir 6 KPIs principais usando FinanceiroKPICard:
      - Total a Receber (PENDENTE)
      - Total a Pagar (PENDENTE)
      - Saldo Projetado (com indicador de sinal: positivo verde, negativo vermelho)
      - Receitas do Mês (PAGO)
      - Despesas do Mês (PAGO)
      - Contas Vencidas (com destaque)
    - Implementar gráfico de evolução receitas vs despesas (últimos 6 meses)
    - Usar biblioteca de gráficos (Chart.js ou Recharts)
    - Implementar auto-refresh dos dados (a cada 30s)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.9_

- [ ] 15. Frontend: Contas a Receber
  - [ ] 15.1 Implementar página de lista de Contas a Receber
    - Criar `frontend/src/app/gestao/financeiro/contas-receber/page.tsx`
    - Fazer fetch via API GET /api/gestao/financeiro/contas-receber
    - Implementar filtros: status, cliente, origem (B2B/B2G/MANUAL), período (dataInicio, dataFim)
    - Implementar paginação (page, limit)
    - Exibir cards de contas usando ContaReceberCard com StatusBadge
    - Botão "Nova Conta" (redireciona para /nova)
    - _Requirements: 2.5, 12.8_
  
  - [ ] 15.2 Implementar componente ContaReceberCard
    - Criar `frontend/src/app/gestao/financeiro/components/ContaReceberCard.tsx`
    - Exibir: valor (formatado em BRL), cliente, data de vencimento, status (badge), origem
    - Link para página de detalhes
    - _Requirements: 2.5, 12.8_
  
  - [ ] 15.3 Implementar página de detalhes de Conta a Receber
    - Criar `frontend/src/app/gestao/financeiro/contas-receber/[id]/page.tsx`
    - Fazer fetch via API GET /api/gestao/financeiro/contas-receber/:id
    - Exibir todos os campos da conta
    - Exibir timeline de auditoria usando AuditoriaTimeline
    - Botão "Marcar como Pago" (apenas se status PENDENTE e usuário tiver role adequado)
    - Modal de confirmação com campo de data de recebimento
    - Botão "Excluir" (apenas se status !== PAGO e role diretor)
    - _Requirements: 2.6, 2.7, 9.6, 10.4, 10.5, 11.4_
  
  - [ ] 15.4 Implementar página de criação de Conta a Receber
    - Criar `frontend/src/app/gestao/financeiro/contas-receber/nova/page.tsx`
    - Formulário com campos: valor, clienteId (select), dataVencimento, categoriaId (select), descricao (opcional)
    - Validação client-side antes de submit
    - POST para /api/gestao/financeiro/contas-receber
    - Redirecionar para lista após criação
    - _Requirements: 2.2, 2.3, 2.4, 10.3_

- [ ] 16. Frontend: Contas a Pagar
  - [ ] 16.1 Implementar página de lista de Contas a Pagar
    - Criar `frontend/src/app/gestao/financeiro/contas-pagar/page.tsx`
    - Fazer fetch via API GET /api/gestao/financeiro/contas-pagar
    - Implementar filtros: status, fornecedor, categoriaId, centroCustoId, período
    - Implementar paginação
    - Exibir cards usando ContaPagarCard
    - Botão "Nova Conta"
    - _Requirements: 4.5, 12.8_
  
  - [ ] 16.2 Implementar componente ContaPagarCard
    - Criar `frontend/src/app/gestao/financeiro/components/ContaPagarCard.tsx`
    - Exibir: valor, fornecedor, data de vencimento, status, categoria, centro de custo
    - Link para página de detalhes
    - _Requirements: 4.5, 12.8_
  
  - [ ] 16.3 Implementar página de detalhes de Conta a Pagar
    - Criar `frontend/src/app/gestao/financeiro/contas-pagar/[id]/page.tsx`
    - Fazer fetch via API GET /api/gestao/financeiro/contas-pagar/:id
    - Exibir todos os campos
    - Timeline de auditoria
    - Botão "Marcar como Pago" com modal de data de pagamento
    - Botão "Excluir"
    - _Requirements: 4.6, 4.7, 9.6, 10.4, 10.5, 11.4_
  
  - [ ] 16.4 Implementar página de criação de Conta a Pagar
    - Criar `frontend/src/app/gestao/financeiro/contas-pagar/nova/page.tsx`
    - Formulário com: valor, fornecedor (text), dataVencimento, categoriaId (select obrigatório), centroCustoId (select opcional), descricao
    - Validação client-side
    - POST para /api/gestao/financeiro/contas-pagar
    - _Requirements: 4.2, 4.3, 4.4, 10.3_

- [ ] 17. Frontend: Relatórios
  - [ ] 17.1 Implementar página de DRE
    - Criar `frontend/src/app/gestao/financeiro/relatorios/dre/page.tsx`
    - Formulário de filtros: dataInicio, dataFim, agruparPor (checkbox para categoria)
    - Fazer fetch via API GET /api/gestao/financeiro/relatorios/dre
    - Criar componente DRETable para exibir resultados
    - Exibir: Receitas Brutas, Custos Diretos, Lucro Bruto, Despesas Operacionais, Lucro Líquido
    - Se agrupado por categoria, exibir tabela detalhada
    - Implementar gráfico de barras (receitas vs despesas)
    - Botões "Exportar PDF" e "Exportar CSV"
    - _Requirements: 7.1, 7.2, 7.8, 7.9_
  
  - [ ] 17.2 Implementar componente DRETable
    - Criar `frontend/src/app/gestao/financeiro/components/DRETable.tsx`
    - Formatação de valores em BRL
    - Destacar Lucro Líquido (verde se positivo, vermelho se negativo)
    - _Requirements: 7.2, 7.7_
  
  - [ ] 17.3 Implementar página de Fluxo de Caixa
    - Criar `frontend/src/app/gestao/financeiro/relatorios/fluxo-caixa/page.tsx`
    - Formulário de filtros: dataInicio, dataFim, agrupamento (semana/mês)
    - Fazer fetch via API GET /api/gestao/financeiro/relatorios/fluxo-caixa
    - Criar componente FluxoCaixaChart para gráfico de linhas
    - Exibir: Saldo Inicial, Entradas Previstas, Saídas Previstas, Saldo Final Projetado
    - Destacar contas vencidas em cor diferenciada
    - Exibir alerta visual se Saldo Final Projetado negativo
    - Botões "Exportar PDF" e "Exportar CSV"
    - _Requirements: 8.1, 8.2, 8.6, 8.7, 8.8, 8.9_
  
  - [ ] 17.4 Implementar componente FluxoCaixaChart
    - Criar `frontend/src/app/gestao/financeiro/components/FluxoCaixaChart.tsx`
    - Gráfico de linhas com 2 séries: Entradas e Saídas
    - Usar cores distintas para entradas (verde) e saídas (vermelho)
    - Destacar períodos com contas vencidas
    - _Requirements: 8.6, 8.7_

- [ ] 18. Frontend: Configurações
  - [ ] 18.1 Implementar página de Categorias Financeiras
    - Criar `frontend/src/app/gestao/financeiro/configuracoes/categorias/page.tsx`
    - Fazer fetch via API GET /api/gestao/financeiro/categorias
    - Exibir tabela com categorias (nome, tipo, status ativo/inativo)
    - Botão "Nova Categoria" com modal para criação (campos: nome, tipo)
    - Botão "Desativar" por categoria
    - _Requirements: 5.1, 5.3, 5.5_
  
  - [ ] 18.2 Implementar página de Centros de Custo
    - Criar `frontend/src/app/gestao/financeiro/configuracoes/centros-custo/page.tsx`
    - Fazer fetch via API GET /api/gestao/financeiro/centros-custo
    - Exibir tabela com centros (nome, código)
    - Botão "Novo Centro" com modal (campos: nome, código)
    - _Requirements: 6.1, 6.3_

- [ ] 19. Checkpoint - Validar Frontend Completo
  - Testar navegação entre todas as páginas
  - Testar todos os formulários (validação client-side)
  - Testar filtros e paginação
  - Testar responsividade mobile
  - Verificar controle de acesso baseado em roles
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 20. Testes End-to-End e QA Manual
  - [ ]* 20.1 Teste E2E: Fluxo de Oportunidade Ganha → Conta Receber
    - Criar oportunidade B2B no módulo B2B
    - Marcar como WON
    - Aguardar processamento assíncrono (500ms)
    - Verificar que Conta a Receber foi criada automaticamente
    - Validar dados: valor, cliente, categoria "Vendas B2B", origem B2B
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [ ]* 20.2 Teste E2E: Fluxo de Comissão Aprovada → Conta Pagar
    - Criar comissão no Sub-Módulo Comissões
    - Aprovar comissão
    - Aguardar processamento assíncrono
    - Verificar que Conta a Pagar foi criada automaticamente
    - Validar dados: valor, vendedor, categoria "Comissões", centro "Comercial"
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [ ]* 20.3 Teste E2E: Marcar Conta Pagar como Paga → Notificar Comissões
    - Criar e aprovar comissão (gera Conta Pagar)
    - Marcar Conta Pagar como PAGO via API ou UI
    - Verificar que evento payable.paid foi emitido
    - Verificar que Sub-Módulo Comissões recebeu notificação
    - _Requirements: 3.4, 15.8_
  
  - [ ]* 20.4 Teste Manual: Criar Conta Receber manualmente
    - Acessar /gestao/financeiro/contas-receber/nova
    - Preencher formulário com dados válidos
    - Submeter
    - Verificar conta criada na lista
    - Acessar detalhes e verificar auditoria
    - _Requirements: 2.2, 2.3, 2.4, 9.3_
  
  - [ ]* 20.5 Teste Manual: Gerar DRE com dados reais
    - Criar várias contas (receber e pagar) com status PAGO
    - Acessar /gestao/financeiro/relatorios/dre
    - Selecionar período que inclui as contas criadas
    - Gerar DRE
    - Validar cálculos manualmente (receitas, custos, lucros)
    - Testar exportação PDF e CSV
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.9_
  
  - [ ]* 20.6 Teste Manual: Gerar Fluxo de Caixa projetado
    - Criar contas PENDENTE com datas futuras
    - Acessar /gestao/financeiro/relatorios/fluxo-caixa
    - Selecionar período futuro
    - Gerar fluxo
    - Validar cálculos (entradas previstas, saídas previstas, saldo projetado)
    - Verificar destaque de contas vencidas
    - Testar agrupamento por semana e mês
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_
  
  - [ ]* 20.7 Teste Manual: Validar Dashboard
    - Criar mix de contas (PENDENTE, PAGO, VENCIDO)
    - Acessar /gestao/financeiro
    - Validar todos os KPIs manualmente
    - Verificar gráfico de evolução
    - Verificar destaque de contas vencidas
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8_
  
  - [ ]* 20.8 Teste Manual: Validar permissões
    - Login como usuário com role "seller" (não deve acessar financeiro)
    - Verificar HTTP 403 ao tentar acessar endpoints
    - Login como "gerente" (deve visualizar e criar)
    - Verificar acesso a lista e criação
    - Verificar que não pode marcar como pago
    - Login como "diretor" (deve ter acesso total)
    - Verificar que pode marcar como pago e excluir
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [ ] 21. Testes de Performance
  - [ ]* 21.1 Testar performance de DRE com grande volume
    - Criar script para popular banco com 1000+ lançamentos
    - Gerar DRE para período com todos os lançamentos
    - Validar tempo de resposta < 2 segundos
    - Usar EXPLAIN no PostgreSQL para verificar uso de índices
    - _Requirements: 7.1_
  
  - [ ]* 21.2 Testar performance de Fluxo de Caixa com grande volume
    - Usar mesma base de dados (1000+ lançamentos)
    - Gerar Fluxo de Caixa
    - Validar tempo < 2 segundos
    - Verificar índices sendo utilizados
    - _Requirements: 8.1_
  
  - [ ]* 21.3 Testar performance de Dashboard
    - Usar base com 5000+ lançamentos
    - Acessar dashboard
    - Validar tempo de carregamento < 1 segundo
    - Verificar queries otimizadas (agregações no banco)
    - _Requirements: 12.1, 12.9_

- [ ] 22. Documentação e Deploy
  - [ ] 22.1 Atualizar documentação
    - Atualizar README.md do projeto com seção do Módulo Financeiro
    - Criar `docs/MODULO_FINANCEIRO.md` com guia de uso para usuários finais
    - Documentar todos os endpoints em `backend/api/README.md`
    - Criar diagrama de arquitetura atualizado (incluindo módulo financeiro)
    - Documentar contratos de eventos (entrada e saída)
    - _Requirements: Documentação_
  
  - [ ] 22.2 Preparar ambiente de deploy
    - Verificar `.env.example` atualizado (variáveis necessárias para módulo financeiro)
    - Criar checklist de deploy
    - Validar que migrations estão prontas para produção
    - Testar build de produção (backend e frontend)
    - _Requirements: Deploy_
  
  - [ ] 22.3 Deploy em branch v3-teste
    - Confirmar que está em branch v3-teste
    - Aplicar migrations: `cd backend && npx prisma migrate deploy`
    - Executar seeds de categorias e centros de custo
    - Build backend: `npm run build`
    - Build frontend: `cd ../frontend && npm run build`
    - Restart serviços (pm2 ou equivalente)
    - Validar que aplicação está acessível
    - _Requirements: Deploy_
  
  - [ ] 22.4 Teste de fumaça em v3-teste
    - Acessar dashboard financeiro
    - Criar conta receber manual
    - Criar conta pagar manual
    - Gerar DRE
    - Gerar Fluxo de Caixa
    - Validar logs sem erros
    - _Requirements: Deploy_

- [ ] 23. Monitoramento e Rollout
  - [ ] 23.1 Configurar monitoramento
    - Configurar logs estruturados (Winston ou Pino) para módulo financeiro
    - Configurar alertas para falhas de processamento de eventos
    - Configurar alertas para dead-letter queue
    - Criar dashboard de métricas (número de contas criadas/dia, tempo de processamento)
    - _Requirements: 15.5_
  
  - [ ] 23.2 Comunicar aos usuários
    - Criar anúncio de nova funcionalidade para usuários
    - Preparar material de treinamento (vídeo ou documentação simplificada)
    - Definir usuários beta (gerentes financeiros)
    - _Requirements: Rollout_
  
  - [ ] 23.3 Acompanhamento pós-deploy
    - Monitorar logs diariamente na primeira semana
    - Verificar integridade de eventos (nenhum na dead-letter queue)
    - Coletar feedback dos usuários beta
    - Corrigir bugs críticos imediatamente (se houver)
    - _Requirements: Rollout_

---

## Notes

- **Tasks marcadas com `*` são opcionais** e podem ser puladas para acelerar MVP. No entanto, testes são altamente recomendados para garantir qualidade.
- **Checkpoints** (tasks 7, 10, 12, 19) são momentos para validar o trabalho antes de avançar. Pausar e pedir feedback do usuário se surgirem dúvidas.
- **Cada task referencia requirements específicos** para rastreabilidade completa entre implementação e especificação.
- **Property-based tests não foram incluídos** pois o módulo envolve lógica de negócio complexa, integrações com banco de dados e eventos, não sendo adequado para PBT. A estratégia foca em unit tests e integration tests.
- **Ordem de implementação é crítica**: Database → Backend Core → Events → Reporting → API → Frontend. Respeitar essa sequência evita dependências quebradas.
- **Idempotência é obrigatória** em event listeners (tasks 8.2, 8.3) para garantir que reprocessamento de eventos não crie registros duplicados.
- **Performance deve ser validada** (tasks 21.1-21.3) antes de deploy em produção, especialmente relatórios com grande volume.
- **Permissões devem ser testadas** (task 20.8) para garantir que apenas usuários autorizados acessem dados financeiros sensíveis.

---

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1", "1.2", "1.3"]
    },
    {
      "id": 1,
      "tasks": ["2.1", "2.3", "2.5", "2.7"]
    },
    {
      "id": 2,
      "tasks": ["2.2", "2.4", "2.6", "2.8", "3.1"]
    },
    {
      "id": 3,
      "tasks": ["3.2", "4.1", "4.2"]
    },
    {
      "id": 4,
      "tasks": ["4.3", "4.4"]
    },
    {
      "id": 5,
      "tasks": ["4.5", "5.1", "5.2"]
    },
    {
      "id": 6,
      "tasks": ["5.3", "5.4"]
    },
    {
      "id": 7,
      "tasks": ["5.5", "6.1", "6.2"]
    },
    {
      "id": 8,
      "tasks": ["6.3", "8.1"]
    },
    {
      "id": 9,
      "tasks": ["8.2", "8.3", "8.5"]
    },
    {
      "id": 10,
      "tasks": ["8.4", "8.6"]
    },
    {
      "id": 11,
      "tasks": ["8.7", "9.1"]
    },
    {
      "id": 12,
      "tasks": ["9.2", "9.4", "9.7"]
    },
    {
      "id": 13,
      "tasks": ["9.3", "9.5", "9.6", "9.8"]
    },
    {
      "id": 14,
      "tasks": ["11.1", "11.2", "11.3", "11.4", "11.5"]
    },
    {
      "id": 15,
      "tasks": ["11.6"]
    },
    {
      "id": 16,
      "tasks": ["11.7", "13.1", "13.2"]
    },
    {
      "id": 17,
      "tasks": ["14.1", "15.1", "15.2", "16.1", "16.2"]
    },
    {
      "id": 18,
      "tasks": ["15.3", "15.4", "16.3", "16.4", "17.1", "17.2", "17.3", "17.4", "18.1", "18.2"]
    },
    {
      "id": 19,
      "tasks": ["20.1", "20.2", "20.3", "20.4", "20.5", "20.6", "20.7", "20.8"]
    },
    {
      "id": 20,
      "tasks": ["21.1", "21.2", "21.3"]
    },
    {
      "id": 21,
      "tasks": ["22.1", "22.2"]
    },
    {
      "id": 22,
      "tasks": ["22.3"]
    },
    {
      "id": 23,
      "tasks": ["22.4", "23.1"]
    },
    {
      "id": 24,
      "tasks": ["23.2", "23.3"]
    }
  ]
}
```

---

**Estimativa Total**: 36-47 horas de desenvolvimento  
**Branch**: v3-teste  
**Status**: Pronto para execução
