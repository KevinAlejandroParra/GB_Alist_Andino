'use strict';

const { Op, where, fn, col } = require('sequelize');

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function appendDateFilters(whereConditions, { year, month, tableName = 'FailureOrder' }) {
  if (!year || year === 'all') {
    return whereConditions;
  }

  const y = parseInt(year, 10);
  if (Number.isNaN(y)) {
    return whereConditions;
  }

  whereConditions[Op.and] = whereConditions[Op.and] || [];

  const createdAtColumn = col(`${tableName}.createdAt`);

  if (!month || month === 'all') {
    whereConditions[Op.and].push(where(fn('YEAR', createdAtColumn), y));
  } else {
    const m = parseInt(month, 10);
    if (!Number.isNaN(m) && m >= 1 && m <= 12) {
      whereConditions[Op.and].push(
        where(fn('YEAR', createdAtColumn), y),
        where(fn('MONTH', createdAtColumn), m)
      );
    }
  }

  return whereConditions;
}

function describePeriod({ year, month }) {
  if (!year || year === 'all') {
    return 'Todo el historial';
  }
  if (!month || month === 'all') {
    return `Año ${year}`;
  }
  const m = parseInt(month, 10);
  const name = MONTH_NAMES[m - 1] || `Mes ${month}`;
  return `${name} ${year}`;
}

module.exports = {
  MONTH_NAMES,
  appendDateFilters,
  describePeriod
};
