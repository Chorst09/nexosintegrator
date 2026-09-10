/**
 * Utilitários para formatação de números
 */

/**
 * Formata valor em moeda BRL
 * @param {number} valor
 * @returns {string}
 */
function formatarMoeda(valor) {
  if (typeof valor !== 'number') {
    valor = parseFloat(valor) || 0;
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

/**
 * Formata percentual
 * @param {number} valor
 * @param {number} decimals
 * @returns {string}
 */
function formatarPercentual(valor, decimals = 2) {
  if (typeof valor !== 'number') {
    valor = parseFloat(valor) || 0;
  }

  return `${valor.toFixed(decimals)}%`;
}

/**
 * Parse moeda BRL para número
 * @param {string} moeda - Ex: "R$ 1.234,56"
 * @returns {number}
 */
function parseMoeda(moeda) {
  if (typeof moeda !== 'string') {
    return parseFloat(moeda) || 0;
  }

  return parseFloat(
    moeda
      .replace('R$', '')
      .replace(/\./g, '')
      .replace(',', '.')
      .trim()
  ) || 0;
}

module.exports = {
  formatarMoeda,
  formatarPercentual,
  parseMoeda,
};
