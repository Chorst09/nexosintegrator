# Documento de Requisitos - Módulo Financeiro (Gestão)

## Introdução

O Módulo Financeiro é um sub-módulo do sistema de GESTÃO do NexosIntegrator, projetado para automatizar o controle de receitas e despesas da empresa. Ele integra-se aos módulos de vendas B2B e B2G (através de eventos de oportunidades ganhas) e ao sub-módulo de Comissões (já existente), oferecendo gestão completa de Contas a Receber, Contas a Pagar, e geração automática de DRE (Demonstração do Resultado do Exercício) e Fluxo de Caixa.

### Contexto do Sistema

O NexosIntegrator é um ERP empresarial organizado em três módulos principais:

1. **B2B** - Vendas business-to-business (setor privado)
2. **B2G** - Vendas business-to-government (licitações públicas)
3. **GESTÃO** - Módulo administrativo (contém sub-módulos: Comissões e Financeiro)

O sistema utiliza:
- **Stack**: Next.js, Prisma ORM, PostgreSQL (Neon)
- **Arquitetura**: Modular, baseada em eventos
- **Versionamento**: Branch `v3-teste` para desenvolvimento

---

## Glossário

- **Sistema_Financeiro**: O sub-módulo de gestão financeira objeto desta especificação
- **Módulo_B2B**: Sistema de gestão de oportunidades de vendas no setor privado
- **Módulo_B2G**: Sistema de gestão de licitações públicas e oportunidades governamentais
- **Sub_Modulo_Comissões**: Sistema existente de gestão de comissões de vendedores
- **Oportunidade**: Uma negociação de venda em andamento (pode ser B2B ou B2G)
- **Evento_Oportunidade_Ganha**: Evento emitido quando uma oportunidade muda para o estágio "WON" (venda fechada)
- **Conta_a_Receber**: Registro financeiro de valor a ser recebido de cliente (receita)
- **Conta_a_Pagar**: Registro financeiro de valor a ser pago (despesa)
- **Lançamento_Financeiro**: Registro genérico de movimentação financeira (entrada ou saída)
- **DRE**: Demonstração do Resultado do Exercício - relatório contábil de receitas vs despesas
- **Fluxo_de_Caixa**: Relatório de movimentação de entradas e saídas projetadas no tempo
- **Categoria_Financeira**: Classificação de lançamentos (ex: "Vendas B2B", "Comissões de Vendas", "Despesas Operacionais")
- **Centro_de_Custo**: Divisão organizacional para alocação de custos (ex: "Comercial", "Administrativo")
- **Status_Financeiro**: Estado de um lançamento (PENDENTE, PAGO, CANCELADO, VENCIDO)
- **Comissão**: Valor devido a vendedor pela intermediação de venda

---

## Requisitos

### Requisito 1: Integração com Módulos de Vendas (B2B/B2G)

**User Story:** Como gerente financeiro, quero que vendas fechadas gerem automaticamente contas a receber, para que eu não precise registrar manualmente cada receita.

#### Acceptance Criteria

1. WHEN uma Oportunidade no Módulo_B2B muda para o estágio "WON", THE Sistema_Financeiro SHALL receber um evento notificando a venda
2. WHEN uma Oportunidade no Módulo_B2G muda para o estágio "WON", THE Sistema_Financeiro SHALL receber um evento notificando a venda
3. WHEN o Sistema_Financeiro recebe um Evento_Oportunidade_Ganha, THE Sistema_Financeiro SHALL criar automaticamente uma Conta_a_Receber com os dados da oportunidade
4. THE Conta_a_Receber gerada SHALL incluir: valor total, cliente, data de vencimento, origem da venda (B2B ou B2G), e referência à oportunidade
5. WHEN a criação da Conta_a_Receber falhar, THE Sistema_Financeiro SHALL registrar o erro e notificar o sistema de monitoramento
6. THE Sistema_Financeiro SHALL suportar processamento idempotente de eventos (processar o mesmo evento múltiplas vezes SHALL resultar em apenas uma Conta_a_Receber)

---

### Requisito 2: Gestão de Contas a Receber

**User Story:** Como gerente financeiro, quero controlar valores a receber de clientes, para que eu tenha visibilidade completa das receitas esperadas.

#### Acceptance Criteria

1. THE Sistema_Financeiro SHALL armazenar Contas_a_Receber com os seguintes atributos: ID único, valor, cliente, data de vencimento, data de recebimento, status, origem, e referências externas
2. THE Sistema_Financeiro SHALL permitir criar Conta_a_Receber manualmente (para receitas não originadas de oportunidades)
3. WHEN uma Conta_a_Receber é criada manualmente, THE Sistema_Financeiro SHALL validar que o valor seja maior que zero
4. WHEN uma Conta_a_Receber é criada manualmente, THE Sistema_Financeiro SHALL validar que o cliente exista no sistema
5. THE Sistema_Financeiro SHALL permitir visualizar lista de Contas_a_Receber com filtros por status, cliente, período, e origem
6. THE Sistema_Financeiro SHALL permitir atualizar o status de uma Conta_a_Receber para PAGO quando o pagamento for confirmado
7. WHEN o status muda para PAGO, THE Sistema_Financeiro SHALL registrar a data de recebimento automaticamente
8. THE Sistema_Financeiro SHALL calcular automaticamente o status VENCIDO para Contas_a_Receber com data de vencimento anterior à data atual e status PENDENTE
9. WHEN uma Conta_a_Receber vence, THE Sistema_Financeiro SHALL emitir um evento de notificação para o módulo de alertas

---

### Requisito 3: Integração com Sub-Módulo de Comissões

**User Story:** Como gerente financeiro, quero que comissões aprovadas gerem contas a pagar automaticamente, para que eu possa planejar pagamentos de vendedores.

#### Acceptance Criteria

1. WHEN uma Comissão no Sub_Modulo_Comissões muda para status "APPROVED", THE Sistema_Financeiro SHALL receber um evento notificando a aprovação
2. WHEN o Sistema_Financeiro recebe um evento de comissão aprovada, THE Sistema_Financeiro SHALL criar automaticamente uma Conta_a_Pagar vinculada à comissão
3. THE Conta_a_Pagar gerada SHALL incluir: valor da comissão, vendedor (como fornecedor), data de vencimento, referência à comissão, e categoria "Comissões de Vendas"
4. WHEN uma Conta_a_Pagar de comissão é marcada como PAGO, THE Sistema_Financeiro SHALL notificar o Sub_Modulo_Comissões para atualizar o status da comissão para "PAID"
5. THE Sistema_Financeiro SHALL suportar processamento idempotente de eventos de comissão (processar o mesmo evento múltiplas vezes SHALL resultar em apenas uma Conta_a_Pagar)

---

### Requisito 4: Gestão de Contas a Pagar

**User Story:** Como gerente financeiro, quero controlar todas as despesas da empresa, para que eu possa planejar fluxo de caixa e realizar pagamentos no prazo.

#### Acceptance Criteria

1. THE Sistema_Financeiro SHALL armazenar Contas_a_Pagar com os seguintes atributos: ID único, valor, fornecedor/beneficiário, data de vencimento, data de pagamento, status, categoria, centro de custo, e referências externas
2. THE Sistema_Financeiro SHALL permitir criar Conta_a_Pagar manualmente (para despesas gerais)
3. WHEN uma Conta_a_Pagar é criada manualmente, THE Sistema_Financeiro SHALL validar que o valor seja maior que zero
4. WHEN uma Conta_a_Pagar é criada, THE Sistema_Financeiro SHALL exigir a seleção de uma Categoria_Financeira
5. THE Sistema_Financeiro SHALL permitir visualizar lista de Contas_a_Pagar com filtros por status, fornecedor, categoria, período, e centro de custo
6. THE Sistema_Financeiro SHALL permitir atualizar o status de uma Conta_a_Pagar para PAGO quando o pagamento for efetuado
7. WHEN o status muda para PAGO, THE Sistema_Financeiro SHALL registrar a data de pagamento automaticamente
8. THE Sistema_Financeiro SHALL calcular automaticamente o status VENCIDO para Contas_a_Pagar com data de vencimento anterior à data atual e status PENDENTE
9. WHEN uma Conta_a_Pagar vence, THE Sistema_Financeiro SHALL emitir um evento de notificação para o módulo de alertas

---

### Requisito 5: Categorização Financeira

**User Story:** Como gerente financeiro, quero classificar receitas e despesas em categorias, para que eu possa analisar a distribuição de custos e receitas.

#### Acceptance Criteria

1. THE Sistema_Financeiro SHALL manter um catálogo de Categorias_Financeiras com os seguintes atributos: ID único, nome, tipo (RECEITA ou DESPESA), e status ativo/inativo
2. THE Sistema_Financeiro SHALL incluir categorias padrão pré-cadastradas: "Vendas B2B", "Vendas B2G", "Comissões de Vendas", "Despesas Operacionais", "Impostos", e "Outras Receitas"
3. THE Sistema_Financeiro SHALL permitir criar novas Categorias_Financeiras customizadas
4. WHEN uma Categoria_Financeira é criada, THE Sistema_Financeiro SHALL validar que o nome seja único
5. THE Sistema_Financeiro SHALL permitir desativar Categorias_Financeiras (soft delete)
6. WHEN uma Categoria_Financeira é desativada, THE Sistema_Financeiro SHALL preservar o histórico de lançamentos já categorizados
7. THE Sistema_Financeiro SHALL atribuir automaticamente a categoria "Vendas B2B" para Contas_a_Receber originadas de oportunidades B2B
8. THE Sistema_Financeiro SHALL atribuir automaticamente a categoria "Vendas B2G" para Contas_a_Receber originadas de oportunidades B2G
9. THE Sistema_Financeiro SHALL atribuir automaticamente a categoria "Comissões de Vendas" para Contas_a_Pagar originadas do Sub_Modulo_Comissões

---

### Requisito 6: Centro de Custos

**User Story:** Como gerente financeiro, quero alocar despesas por centro de custo, para que eu possa medir o custo de cada departamento.

#### Acceptance Criteria

1. THE Sistema_Financeiro SHALL manter um catálogo de Centros_de_Custo com os seguintes atributos: ID único, nome, código, e status ativo/inativo
2. THE Sistema_Financeiro SHALL incluir centros de custo padrão pré-cadastrados: "Comercial", "Administrativo", "Marketing", e "Operacional"
3. THE Sistema_Financeiro SHALL permitir criar novos Centros_de_Custo customizados
4. WHEN um Centro_de_Custo é criado, THE Sistema_Financeiro SHALL validar que o código seja único
5. THE Sistema_Financeiro SHALL permitir associar uma Conta_a_Pagar a um Centro_de_Custo (campo opcional)
6. THE Sistema_Financeiro SHALL atribuir automaticamente o centro de custo "Comercial" para Contas_a_Pagar de comissões
7. THE Sistema_Financeiro SHALL permitir relatórios de despesas agrupadas por Centro_de_Custo

---

### Requisito 7: Geração de DRE (Demonstração do Resultado do Exercício)

**User Story:** Como diretor financeiro, quero visualizar um DRE automaticamente gerado, para que eu possa avaliar a lucratividade da empresa em cada período.

#### Acceptance Criteria

1. THE Sistema_Financeiro SHALL gerar um DRE para um período especificado (data inicial e data final)
2. THE DRE SHALL incluir as seguintes seções: Receitas Brutas, Deduções de Receitas, Receitas Líquidas, Custos Diretos, Lucro Bruto, Despesas Operacionais, e Lucro Líquido
3. THE Sistema_Financeiro SHALL calcular "Receitas Brutas" como a soma de todas as Contas_a_Receber com status PAGO no período
4. THE Sistema_Financeiro SHALL calcular "Despesas Operacionais" como a soma de todas as Contas_a_Pagar com status PAGO no período (exceto comissões)
5. THE Sistema_Financeiro SHALL calcular "Custos Diretos" como a soma de todas as Contas_a_Pagar de comissões com status PAGO no período
6. THE Sistema_Financeiro SHALL calcular "Lucro Bruto" como Receitas Brutas menos Custos Diretos
7. THE Sistema_Financeiro SHALL calcular "Lucro Líquido" como Lucro Bruto menos Despesas Operacionais
8. THE Sistema_Financeiro SHALL permitir visualizar o DRE agrupado por categoria financeira
9. THE Sistema_Financeiro SHALL permitir exportar o DRE em formato PDF e CSV
10. WHEN não houver lançamentos no período, THE Sistema_Financeiro SHALL exibir um DRE com todos os valores zerados

---

### Requisito 8: Geração de Fluxo de Caixa

**User Story:** Como gerente financeiro, quero visualizar o fluxo de caixa projetado, para que eu possa antecipar necessidades de capital e planejar pagamentos.

#### Acceptance Criteria

1. THE Sistema_Financeiro SHALL gerar um relatório de Fluxo_de_Caixa para um período futuro especificado (data inicial e data final)
2. THE Fluxo_de_Caixa SHALL incluir: saldo inicial, entradas previstas (Contas_a_Receber PENDENTE), saídas previstas (Contas_a_Pagar PENDENTE), e saldo final projetado
3. THE Sistema_Financeiro SHALL calcular "Entradas Previstas" como a soma de todas as Contas_a_Receber com status PENDENTE e data de vencimento no período
4. THE Sistema_Financeiro SHALL calcular "Saídas Previstas" como a soma de todas as Contas_a_Pagar com status PENDENTE e data de vencimento no período
5. THE Sistema_Financeiro SHALL calcular "Saldo Final Projetado" como saldo inicial mais entradas previstas menos saídas previstas
6. THE Sistema_Financeiro SHALL permitir visualizar o Fluxo_de_Caixa agrupado por semana ou por mês
7. THE Sistema_Financeiro SHALL destacar valores VENCIDOS (contas pendentes com data de vencimento anterior à data atual) em cor diferenciada
8. THE Sistema_Financeiro SHALL permitir exportar o Fluxo_de_Caixa em formato PDF e CSV
9. WHEN o Saldo Final Projetado for negativo, THE Sistema_Financeiro SHALL exibir um alerta visual de déficit de caixa

---

### Requisito 9: Auditoria e Rastreabilidade

**User Story:** Como auditor interno, quero rastrear todas as modificações nos lançamentos financeiros, para que eu possa garantir conformidade e investigar inconsistências.

#### Acceptance Criteria

1. THE Sistema_Financeiro SHALL registrar timestamp de criação para todos os Lançamentos_Financeiros (Contas_a_Receber e Contas_a_Pagar)
2. THE Sistema_Financeiro SHALL registrar timestamp de última atualização para todos os Lançamentos_Financeiros
3. THE Sistema_Financeiro SHALL registrar o usuário responsável pela criação de cada Lançamento_Financeiro
4. WHEN um Lançamento_Financeiro é atualizado, THE Sistema_Financeiro SHALL registrar o usuário responsável pela modificação
5. THE Sistema_Financeiro SHALL manter um log de auditoria de mudanças de status (PENDENTE → PAGO, PENDENTE → CANCELADO)
6. THE Sistema_Financeiro SHALL permitir visualizar o histórico de modificações de um Lançamento_Financeiro
7. THE Sistema_Financeiro SHALL registrar a origem de cada Conta_a_Receber (oportunidade B2B, oportunidade B2G, ou criação manual)
8. THE Sistema_Financeiro SHALL registrar a origem de cada Conta_a_Pagar (comissão, ou criação manual)

---

### Requisito 10: Permissões e Controle de Acesso

**User Story:** Como administrador do sistema, quero controlar quem pode criar, visualizar, editar e excluir lançamentos financeiros, para que apenas usuários autorizados manipulem dados sensíveis.

#### Acceptance Criteria

1. THE Sistema_Financeiro SHALL exigir autenticação para todas as operações financeiras
2. THE Sistema_Financeiro SHALL permitir visualizar lançamentos financeiros apenas para usuários com papel "gerente", "diretor", ou "financeiro"
3. THE Sistema_Financeiro SHALL permitir criar Lançamentos_Financeiros manualmente apenas para usuários com papel "gerente", "diretor", ou "financeiro"
4. THE Sistema_Financeiro SHALL permitir marcar lançamentos como PAGO apenas para usuários com papel "diretor" ou "financeiro"
5. THE Sistema_Financeiro SHALL permitir cancelar lançamentos apenas para usuários com papel "diretor"
6. THE Sistema_Financeiro SHALL registrar todas as tentativas de acesso negado no log de auditoria
7. WHEN um usuário sem permissão tenta acessar dados financeiros, THE Sistema_Financeiro SHALL retornar um erro HTTP 403 (Forbidden)

---

### Requisito 11: Validações e Regras de Negócio

**User Story:** Como desenvolvedor do sistema, quero que o sistema impeça operações inválidas, para que a integridade dos dados financeiros seja garantida.

#### Acceptance Criteria

1. THE Sistema_Financeiro SHALL impedir a criação de Conta_a_Receber com valor menor ou igual a zero
2. THE Sistema_Financeiro SHALL impedir a criação de Conta_a_Pagar com valor menor ou igual a zero
3. THE Sistema_Financeiro SHALL impedir a criação de lançamentos com data de vencimento anterior a 1º de janeiro de 2020
4. THE Sistema_Financeiro SHALL impedir a exclusão de lançamentos com status PAGO
5. WHEN uma Conta_a_Receber é marcada como PAGO, THE Sistema_Financeiro SHALL validar que a data de recebimento não seja anterior à data de criação
6. WHEN uma Conta_a_Pagar é marcada como PAGO, THE Sistema_Financeiro SHALL validar que a data de pagamento não seja anterior à data de criação
7. THE Sistema_Financeiro SHALL impedir a alteração de valor de um lançamento após ele ser marcado como PAGO
8. THE Sistema_Financeiro SHALL impedir a criação de Conta_a_Receber duplicada para a mesma oportunidade (validação de idempotência)

---

### Requisito 12: Dashboard Financeiro

**User Story:** Como gerente financeiro, quero visualizar um dashboard com indicadores financeiros, para que eu tenha visão rápida da saúde financeira da empresa.

#### Acceptance Criteria

1. THE Sistema_Financeiro SHALL exibir um dashboard com os seguintes indicadores: Total a Receber (PENDENTE), Total a Pagar (PENDENTE), Saldo Projetado, Receitas do Mês (PAGO), e Despesas do Mês (PAGO)
2. THE Sistema_Financeiro SHALL calcular "Total a Receber" como a soma de todas as Contas_a_Receber com status PENDENTE
3. THE Sistema_Financeiro SHALL calcular "Total a Pagar" como a soma de todas as Contas_a_Pagar com status PENDENTE
4. THE Sistema_Financeiro SHALL calcular "Saldo Projetado" como Total a Receber menos Total a Pagar
5. THE Sistema_Financeiro SHALL calcular "Receitas do Mês" como a soma de Contas_a_Receber com status PAGO no mês corrente
6. THE Sistema_Financeiro SHALL calcular "Despesas do Mês" como a soma de Contas_a_Pagar com status PAGO no mês corrente
7. THE Sistema_Financeiro SHALL exibir um gráfico de evolução de receitas vs despesas nos últimos 6 meses
8. THE Sistema_Financeiro SHALL destacar contas vencidas (VENCIDO) com indicador visual de alerta
9. THE Sistema_Financeiro SHALL atualizar os indicadores automaticamente quando lançamentos são criados ou atualizados

---

### Requisito 13: Notificações e Alertas

**User Story:** Como gerente financeiro, quero receber notificações sobre contas vencidas e próximas do vencimento, para que eu possa tomar ações preventivas.

#### Acceptance Criteria

1. WHEN uma Conta_a_Receber vence e permanece com status PENDENTE, THE Sistema_Financeiro SHALL emitir um evento de alerta de inadimplência
2. WHEN uma Conta_a_Pagar vence e permanece com status PENDENTE, THE Sistema_Financeiro SHALL emitir um evento de alerta de pagamento em atraso
3. WHEN uma Conta_a_Pagar tem vencimento dentro de 3 dias, THE Sistema_Financeiro SHALL emitir um evento de lembrete de pagamento próximo
4. THE Sistema_Financeiro SHALL suportar integração com sistema de notificações por email e interface web
5. THE Sistema_Financeiro SHALL permitir configurar preferências de notificações por usuário (ativar/desativar alertas)

---

### Requisito 14: Integridade Referencial e Consistência de Dados

**User Story:** Como desenvolvedor do sistema, quero garantir que os dados financeiros mantenham integridade referencial, para que não haja registros órfãos ou inconsistentes.

#### Acceptance Criteria

1. WHEN uma Oportunidade é excluída, THE Sistema_Financeiro SHALL manter a Conta_a_Receber associada (não cascatear exclusão)
2. WHEN uma Comissão é excluída, THE Sistema_Financeiro SHALL manter a Conta_a_Pagar associada (não cascatear exclusão)
3. THE Sistema_Financeiro SHALL armazenar uma cópia dos dados essenciais da oportunidade (cliente, valor, data) na Conta_a_Receber para preservar histórico
4. THE Sistema_Financeiro SHALL armazenar uma cópia dos dados essenciais da comissão (vendedor, valor) na Conta_a_Pagar para preservar histórico
5. WHEN o banco de dados detecta violação de constraint de integridade, THE Sistema_Financeiro SHALL registrar o erro e retornar mensagem descritiva ao usuário

---

### Requisito 15: Processamento de Eventos (Event-Driven Architecture)

**User Story:** Como arquiteto de software, quero que o módulo financeiro consuma eventos de outros módulos, para que a arquitetura seja desacoplada e escalável.

#### Acceptance Criteria

1. THE Sistema_Financeiro SHALL implementar um event listener para eventos do tipo "opportunity.won" emitidos pelos Módulos B2B e B2G
2. THE Sistema_Financeiro SHALL implementar um event listener para eventos do tipo "commission.approved" emitidos pelo Sub_Modulo_Comissões
3. THE Sistema_Financeiro SHALL processar eventos de forma assíncrona (não bloquear a resposta da operação original)
4. WHEN o processamento de um evento falha, THE Sistema_Financeiro SHALL registrar o erro e tentar reprocessar o evento até 3 vezes
5. WHEN o reprocessamento falha 3 vezes, THE Sistema_Financeiro SHALL registrar o evento na fila de erros (dead-letter queue) e notificar o sistema de monitoramento
6. THE Sistema_Financeiro SHALL emitir um evento "receivable.created" quando uma Conta_a_Receber é criada
7. THE Sistema_Financeiro SHALL emitir um evento "payable.created" quando uma Conta_a_Pagar é criada
8. THE Sistema_Financeiro SHALL emitir um evento "payable.paid" quando uma Conta_a_Pagar de comissão é marcada como PAGO

---

## Resumo de Entidades Principais

| Entidade | Descrição |
|----------|-----------|
| **Conta_a_Receber** | Registro de valor a receber de cliente (receita) |
| **Conta_a_Pagar** | Registro de valor a pagar a fornecedor (despesa) |
| **Categoria_Financeira** | Classificação de receitas/despesas |
| **Centro_de_Custo** | Divisão organizacional para alocação de custos |
| **Lançamento_Financeiro** | Termo genérico para Conta_a_Receber ou Conta_a_Pagar |
| **Log_de_Auditoria** | Registro de modificações em lançamentos |

---

## Resumo de Eventos

| Evento | Origem | Destino | Descrição |
|--------|--------|---------|-----------|
| **opportunity.won** | Módulos B2B/B2G | Sistema_Financeiro | Oportunidade foi ganha |
| **commission.approved** | Sub_Modulo_Comissões | Sistema_Financeiro | Comissão foi aprovada |
| **receivable.created** | Sistema_Financeiro | Sistema de Monitoramento | Conta a receber foi criada |
| **payable.created** | Sistema_Financeiro | Sistema de Monitoramento | Conta a pagar foi criada |
| **payable.paid** | Sistema_Financeiro | Sub_Modulo_Comissões | Conta a pagar de comissão foi paga |
| **receivable.overdue** | Sistema_Financeiro | Sistema de Notificações | Conta a receber está vencida |
| **payable.overdue** | Sistema_Financeiro | Sistema de Notificações | Conta a pagar está vencida |

---

**Versão**: 1.0  
**Data de criação**: 2026-01-10  
**Branch de desenvolvimento**: v3-teste  
**Status**: Em revisão
