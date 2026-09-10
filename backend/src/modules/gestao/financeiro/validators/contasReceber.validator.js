/**
 * Validators para Contas a Receber
 */

const { validatePositiveValue, validateDateNotBefore2020 } = require('./common.validator');

/**
 * Valida dados para criação de Conta a Receber
 * @param {Object} data
 * @throws {Error} se dados inválidos
 */
function validateCreateContaReceber(data) {
  if (!data.valor) {
    throw new Error('Valor é obrigatório');
  }
  validatePositiveValue(data.valor);

  if (!data.clienteId || data.clienteId.trim() === '') {
    throw new Error('clienteId é obrigatório');
  }

  if (!data.dataVencimento) {
    throw new Error('Data de vencimento é obrigatória');
  }
  validateDateNotBefore2020(data.dataVencimento);

  if (!data.categoriaId || data.categoriaId.trim() === '') {
    throw new Error('categoriaId é obrigatório');
  }

  return true;
}

/**
 * Valida dados para marcar como pago
 * @param {string} id
 * @param {Date|string} dataRecebimento
 * @param {Date|string} dataCriacao
 * @throws {Error} se dados inválidos
 */
function validateMarcarComoPago(id, dataRecebimento, dataCriacao) {
  if (!id || id.trim() === '') {
    throw new Error('ID é obrigatório');
  }

  if (!dataRecebimento) {
    throw new Error('Data de recebimento é obrigatória');
  }

  const recebimento = new Date(dataRecebimento);
  const criacao = new Date(dataCriacao);

  if (isNaN(recebimento.getTime())) {
    throw new Error('Data de recebimento inválida');
  }

  if (recebimento < criacao) {
    throw new Error('Data de recebimento não pode ser anterior à data de criação');
  }

  return true;
}

module.exports = {
  validateCreateContaReceber,
  validateMarcarComoPago,
};
