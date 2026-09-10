/**
 * Utilitários para cálculo de status de contas financeiras
 */

/**
 * Verifica se uma conta está vencida
 * @param {Date|string} dataVencimento
 * @param {string} status
 * @returns {boolean}
 */
function isVencido(dataVencimento, status) {
  if (status !== 'PENDENTE') {
    return false;
  }

  const vencimento = new Date(dataVencimento);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return vencimento < hoje;
}

/**
 * Calcula o status computado de uma conta (inclui VENCIDO)
 * @param {Object} conta - Conta a Receber ou Pagar
 * @returns {string} PENDENTE | PAGO | CANCELADO | VENCIDO
 */
function calcularStatusComputado(conta) {
  if (conta.status === 'PAGO' || conta.status === 'CANCELADO') {
    return conta.status;
  }

  if (isVencido(conta.dataVencimento, conta.status)) {
    return 'VENCIDO';
  }

  return conta.status;
}

/**
 * Calcula dias desde o vencimento
 * @param {Date|string} dataVencimento
 * @returns {number} Dias vencidos (negativo se ainda não venceu)
 */
function calcularDiasVencidos(dataVencimento) {
  const vencimento = new Date(dataVencimento);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  vencimento.setHours(0, 0, 0, 0);

  const diffTime = hoje - vencimento;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

module.exports = {
  isVencido,
  calcularStatusComputado,
  calcularDiasVencidos,
};
