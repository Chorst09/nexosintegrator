/**
 * Validators comuns para módulo financeiro
 */

/**
 * Valida intervalo de datas
 * @param {Date|string} dataInicio
 * @param {Date|string} dataFim
 * @throws {Error} se datas inválidas
 */
function validateDateRange(dataInicio, dataFim) {
  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);

  if (isNaN(inicio.getTime())) {
    throw new Error('Data de início inválida');
  }

  if (isNaN(fim.getTime())) {
    throw new Error('Data de fim inválida');
  }

  if (inicio > fim) {
    throw new Error('Data de início deve ser anterior à data de fim');
  }

  return true;
}

/**
 * Valida valor positivo
 * @param {number} valor
 * @throws {Error} se valor <= 0
 */
function validatePositiveValue(valor) {
  if (typeof valor !== 'number' || valor <= 0) {
    throw new Error('Valor deve ser maior que zero');
  }
  return true;
}

/**
 * Valida data não anterior a 2020
 * @param {Date|string} data
 * @throws {Error} se data < 2020-01-01
 */
function validateDateNotBefore2020(data) {
  const date = new Date(data);
  const minDate = new Date('2020-01-01');

  if (isNaN(date.getTime())) {
    throw new Error('Data inválida');
  }

  if (date < minDate) {
    throw new Error('Data não pode ser anterior a 1º de janeiro de 2020');
  }

  return true;
}

module.exports = {
  validateDateRange,
  validatePositiveValue,
  validateDateNotBefore2020,
};
