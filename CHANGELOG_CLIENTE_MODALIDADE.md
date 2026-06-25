# Changelog - Adição de Cliente e Modalidade ao Orçamento

**Data**: 25 de Junho de 2026  
**Versão**: 1.1.0  
**Tipo**: Feature Addition

## Resumo

Implementação de campos adicionais no cadastro de orçamentos do módulo de Pré-Vendas para identificar o nome do cliente e a modalidade da negociação (Venda, Locação ou Serviço).

## Motivação

Permitir que o usuário registre informações essenciais sobre o orçamento:
- **Nome do Cliente**: Identificação rápida do cliente sem precisar navegar para outros módulos
- **Modalidade**: Diferenciação clara entre vendas, locações e serviços para melhor gestão e análise

## Alterações Técnicas

### 1. Schema do Banco de Dados

#### Arquivo: `apps/api/prisma/schema.prisma`
#### Arquivo: `netlify/functions/prisma/schema.prisma`

```prisma
model PreSalesRequest {
  // ... campos existentes ...
  nomeCliente         String?  // Nome do cliente
  modalidade          String?  // 'VENDA', 'LOCACAO', 'SERVICO'
  // ... restante dos campos ...
}
```

**Tipo**: Adição de colunas opcionais (nullable)

### 2. Migração SQL

#### Arquivo: `migration_add_cliente_modalidade.sql`

```sql
ALTER TABLE "PreSalesRequest" 
ADD COLUMN IF NOT EXISTS "nomeCliente" TEXT;

ALTER TABLE "PreSalesRequest" 
ADD COLUMN IF NOT EXISTS "modalidade" TEXT;
```

### 3. Backend API

#### Arquivo: `netlify/functions/pre-vendas.js`

**Alterações no método POST (criação)**:
- Adicionado suporte para receber `nomeCliente` e `modalidade` no payload
- Campos são armazenados no banco de dados durante a criação

**Alterações no método PUT (atualização)**:
- Adicionado suporte para atualizar `nomeCliente` e `modalidade`
- Validação de presença dos campos no body da requisição

```javascript
// No create
nomeCliente: body.nomeCliente || null,
modalidade: body.modalidade || null,

// No update
if (Object.prototype.hasOwnProperty.call(body, 'nomeCliente')) 
  nextData.nomeCliente = body.nomeCliente || null;
if (Object.prototype.hasOwnProperty.call(body, 'modalidade')) 
  nextData.modalidade = body.modalidade || null;
```

### 4. Frontend - Formulário

#### Arquivo: `apps/web/src/pages/OrcamentosPrevendas.jsx`

**Componente**: `NovoOrcamentoModal`

**Form State**:
```javascript
const buildEmptyForm = (currentUser = {}) => ({
  titulo: '',
  descricao: '',
  nomeCliente: '',        // NOVO
  modalidade: 'VENDA',    // NOVO - valor padrão
  // ... outros campos ...
});
```

**Campos no Formulário**:
```jsx
{/* Nome do Cliente e Modalidade */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>
    <label>Nome do Cliente</label>
    <input
      type="text"
      value={form.nomeCliente}
      onChange={(e) => setField('nomeCliente', e.target.value)}
      placeholder="Nome da empresa ou cliente"
    />
  </div>
  <div>
    <label>Modalidade</label>
    <select
      value={form.modalidade}
      onChange={(e) => setField('modalidade', e.target.value)}
    >
      <option value="VENDA">Venda</option>
      <option value="LOCACAO">Locação</option>
      <option value="SERVICO">Serviço</option>
    </select>
  </div>
</div>
```

**Payload Submission**:
```javascript
const payload = {
  // ... campos existentes ...
  nomeCliente: form.nomeCliente.trim() || null,
  modalidade: form.modalidade || null,
  // ... resto do payload ...
};
```

### 5. Frontend - Listagem

**Tabela Atualizada**:
- Cabeçalho modificado para incluir coluna "Cliente / Modalidade"
- Redução da coluna "Atividade" de 4 para 3 colunas
- Adição de 2 colunas para "Cliente / Modalidade"
- Remoção da coluna "Falhas" para balancear o espaço

**Exibição na Lista**:
```jsx
{/* Cliente / Modalidade */}
<div className="col-span-2 min-w-0">
  <p className="truncate text-sm text-slate-200">
    {item.nomeCliente || '-'}
  </p>
  <p className="text-xs text-slate-400">
    {modalidadeLabel}
  </p>
</div>
```

**Labels de Modalidade**:
```javascript
const modalidadeLabel = {
  VENDA: 'Venda',
  LOCACAO: 'Locação',
  SERVICO: 'Serviço'
}[item.modalidade] || '-';
```

## Compatibilidade

### Backward Compatibility
✅ **Totalmente compatível** com registros existentes:
- Campos são opcionais (nullable)
- Registros antigos exibirão "-" na listagem
- Sem quebra de funcionalidades existentes

### API Compatibility
✅ **Compatível** com versões anteriores:
- Campos são opcionais no payload
- API aceita requisições sem os novos campos
- Sem breaking changes

## Testes Recomendados

### Teste 1: Criação de Orçamento
1. Acessar Pré-Vendas > Orçamentos
2. Clicar em "Novo orçamento"
3. Preencher todos os campos incluindo Cliente e Modalidade
4. Salvar e verificar sucesso

### Teste 2: Listagem
1. Verificar se os novos campos aparecem na lista
2. Confirmar exibição correta dos valores

### Teste 3: Campos Opcionais
1. Criar orçamento SEM preencher Cliente e Modalidade
2. Verificar que o sistema aceita e salva

### Teste 4: Edição (futuro)
1. Se houver funcionalidade de edição, testar atualização dos campos

### Teste 5: Filtros e Busca
1. Verificar se a busca continua funcionando
2. Testar filtros existentes

## Métricas de Impacto

- **Linhas de código modificadas**: ~150
- **Arquivos alterados**: 4
- **Novas colunas no banco**: 2
- **Novos campos no formulário**: 2
- **Tempo estimado de desenvolvimento**: 2 horas
- **Complexidade**: Baixa
- **Risco**: Baixo (campos opcionais)

## Próximos Passos (Sugestões)

1. ☐ Adicionar campo de busca por nome do cliente
2. ☐ Implementar filtro por modalidade na listagem
3. ☐ Criar relatório de orçamentos por modalidade
4. ☐ Adicionar validação obrigatória para novos registros (opcional)
5. ☐ Implementar autocomplete para nome do cliente baseado em clientes cadastrados

## Documentação Relacionada

- [Deploy Instructions](./DEPLOY_INSTRUCTIONS.md)
- [Migration SQL](./migration_add_cliente_modalidade.sql)

## Autor

Implementado via Kiro AI Assistant

## Status

✅ **Implementado** - Pronto para deploy em produção
