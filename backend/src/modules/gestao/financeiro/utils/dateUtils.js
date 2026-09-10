/**
 * Utilitários para manipulação de datas
 */

/**
 * Adiciona dias a uma data
 * @param {Date|string} data
 * @param {number} dias
 * @returns {Date}
 */
function addDays(data, dias) {
  const result = new Date(data);
  result.setDate(result.getDate() + dias);
  return result;
}

/**
 * Formata data para ISO string (sem timezone)
 * @param {Date|string} data
 * @returns {string}
 */
function toISODate(data) {
  const d = new Date(data);
  return d.toISOString().split('T')[0];
}

/**
 * Calcula primeiro dia do mês
 * @param {Date} data
 * @returns {Date}
 */
function firstDayOfMonth(data = new Date()) {
  return new Date(data.getFullYear(), data.getMonth(), 1);
}

/**
 * Calcula último dia do mês
 * @param {Date} data
 * @returns {Date}
 */
function lastDayOfMonth(data = new Date()) {
  return new Date(data.getFullYear(), data.getMonth() + 1, 0);
}

/**
 * Agrupa datas por semana
 * @param {Date} dataInicio
 * @param {Date} dataFim
 * @returns {Array<{inicio: Date, fim: Date}>}
 */
function groupByWeek(dataInicio, dataFim) {
  const weeks = [];
  let current = new Date(dataInicio);

  while (current <= dataFim) {
    const weekStart = new Date(current);
    const weekEnd = addDays(current, 6);
    
    weeks.push({
      inicio: weekStart,
      fim: weekEnd > dataFim ? new Date(dataFim) : weekEnd,
    });

    current = addDays(weekEnd, 1);
  }

  return weeks;
}

/**
 * Agrupa datas por mês
 * @param {Date} dataInicio
 * @param {Date} dataFim
 * @returns {Array<{inicio: Date, fim: Date, mes: string}>}
 */
function groupByMonth(dataInicio, dataFim) {
  const months = [];
  let current = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), 1);

  while (current <= dataFim) {
    const monthStart = new Date(current);
    const monthEnd = lastDayOfMonth(current);
    
    months.push({
      inicio: monthStart < dataInicio ? new Date(dataInicio) : monthStart,
      fim: monthEnd > dataFim ? new Date(dataFim) : monthEnd,
      mes: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`,
    });

    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }

  return months;
}

module.exports = {
  addDays,
  toISODate,
  firstDayOfMonth,
  lastDayOfMonth,
  groupByWeek,
  groupByMonth,
};
