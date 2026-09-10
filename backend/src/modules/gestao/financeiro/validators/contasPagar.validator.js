/**
 * Validators para Contas a Pagar
 */

const { validatePositiveValue, validateDateNotBefore2020 } = require('./common.validator');

/**
 * Valida dados para criação de Conta a Pagar
 * @param {Object} data
 * @throws {Error} se dados inválidos
 */
function validateCreateContaPagar(data) {
  if (!data.valor) {
    throw new Error('Valor é obrigatório');
  }
  validatePositiveValue(data.valor);

  if (!data.fornecedor || data.fornecedor.trim() === '') {
    throw new Error('Fornecedor é obrigatório');
  }

  if (!data.dataVencimento) {
    throw new Error('Data de vencimento é obrigatória');
  }
  validateDateNotBefore2020(data.dataVencimento);

  if (!data.categoriaId || data.categoriaId.trim() === '') {
    throw new Error('Categoria é obrigatória');
  }

  return true;
}

/**
 * Valida dados para marcar como pago
 * @param {string} id
 * @param {Date|string} dataPagamento
 * @param {Date|string} dataCriacao
 * @throws {Error} se dados inválidos
 */
function validateMarcarComoPago(id, dataPagamento, dataCriacao) {
  if (!id || id.trim() === '') {
    throw new Error('ID é obrigatório');
  }

  if (!dataPagamento) {
    throw new Error('Data de pagamento é obrigatória');
  }

  const pagamento = new Date(dataPagamento);
  const criacao = new Date(dataCriacao);

  if (isNaN(pagamento.getTime())) {
    throw new Error('Data de pagamento inválida');
  }

  if (pagamento < criacao) {
    throw new Error('Data de pagamento não pode ser anterior à data de criação');
  }

  return true;
}

module.exports = {
  validateCreateContaPagar,
  validateMarcarComoPago,
};
