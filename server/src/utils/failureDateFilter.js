'use strict';

const { Op, where, fn, col } = require('sequelize');
const { getMondayOfWeek, getSundayOfWeek } = require('./weekUtils');

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const RESOLVED_STATUSES = ['RESUELTA', 'CANCELADO'];

function isWeeklyFrequency(frequency) {
  const f = (frequency || '').toLowerCase().trim();
  return f === 'weekly' || f === 'semanal';
}

/**
 * Fecha de corte para vista histórica (fallas activas al cierre del período).
 */
function resolveCutoffDate({ year, month, day, week }) {
  if (!year || year === 'all' || !month || month === 'all') {
    return null;
  }

  if (week && week !== 'all') {
    const range = parseWeekRange(week);
    return range?.end || null;
  }

  if (day && day !== 'all') {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10) - 1;
    const d = parseInt(day, 10);
    const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d) || d < 1 || d > lastDay) {
      return null;
    }
    return new Date(Date.UTC(y, m, d, 23, 59, 59, 999));
  }

  return null;
}

function isHistoricalCutoffQuery(query) {
  return Boolean(resolveCutoffDate(query));
}

function appendCutoffWhere(whereConditions, cutoffDate, tableName = 'FailureOrder') {
  if (!cutoffDate) return whereConditions;
  whereConditions[Op.and] = whereConditions[Op.and] || [];
  whereConditions[Op.and].push({
    [`$${tableName}.createdAt$`]: { [Op.lte]: cutoffDate }
  });
  return whereConditions;
}

/**
 * Fallas que existían al cierre del período (misma lógica que getChecklistFailures).
 */
function filterFailuresActiveAtCutoff(failures, cutoffDate) {
  if (!cutoffDate) return failures;
  const cutoff = new Date(cutoffDate);

  return failures.filter((failure) => {
    const plain = failure.get ? failure.get({ plain: true }) : failure;
    const wo = plain.workOrder;

    if (!wo) return true;
    if (!RESOLVED_STATUSES.includes(wo.status)) return true;

    const woUpdatedAt = wo.updatedAt ? new Date(wo.updatedAt) : null;
    return woUpdatedAt && woUpdatedAt > cutoff;
  });
}

/**
 * Parsea un week identifier del formato "YYYY-Wnn" y retorna el rango lunes-domingo.
 * @param {string} weekStr  Ej: "2026-W18"
 * @returns {{ start: Date, end: Date } | null}
 */
function parseWeekRange(weekStr) {
  if (!weekStr || weekStr === 'all') return null;

  // Formato esperado: "2026-W18"
  const match = weekStr.match(/^(\d{4})-W(\d{1,2})$/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const weekNum = parseInt(match[2], 10);

  if (Number.isNaN(year) || Number.isNaN(weekNum) || weekNum < 1 || weekNum > 53) return null;

  // Encontrar el primer lunes del año
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const firstMonday = getMondayOfWeek(jan1);
  if (firstMonday.getUTCFullYear() < year) {
    firstMonday.setUTCDate(firstMonday.getUTCDate() + 7);
  }

  // Avanzar (weekNum - 1) semanas desde el primer lunes
  const monday = new Date(firstMonday);
  monday.setUTCDate(monday.getUTCDate() + (weekNum - 1) * 7);

  const sunday = getSundayOfWeek(monday);

  return { start: monday, end: sunday };
}

/**
 * Aplica filtros de fecha (año, mes, semana) sobre whereConditions.
 * - Si se provee `week` ("YYYY-Wnn"), tiene prioridad sobre year/month.
 * - Si no hay `week`, se aplica year y opcionalmente month.
 */
function appendDateFilters(whereConditions, { year, month, week, tableName = 'FailureOrder' }) {
  const createdAtColumn = col(`${tableName}.createdAt`);
  whereConditions[Op.and] = whereConditions[Op.and] || [];

  // Filtro por semana (tiene prioridad)
  if (week && week !== 'all') {
    const range = parseWeekRange(week);
    if (range) {
      whereConditions[Op.and].push({
        [col(`${tableName}.createdAt`)]: {
          [Op.between]: [range.start, range.end]
        }
      });
      // Usamos Op.and sobre el campo directamente
      // Reemplazamos el push anterior por la forma correcta de Sequelize
      whereConditions[Op.and].pop();
      whereConditions[Op.and].push({
        [`$${tableName}.createdAt$`]: {
          [Op.between]: [range.start, range.end]
        }
      });
      return whereConditions;
    }
  }

  // Filtro por año y/o mes
  if (!year || year === 'all') {
    return whereConditions;
  }

  const y = parseInt(year, 10);
  if (Number.isNaN(y)) {
    return whereConditions;
  }

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

function describePeriod({ year, month, week, day }) {
  if (week && week !== 'all') {
    const range = parseWeekRange(week);
    if (range) {
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const fmt = (d) => `${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
      return `Semana ${week.split('-W')[1]} (${fmt(range.start)} - ${fmt(range.end)})`;
    }
    return `Semana ${week}`;
  }
  if (year && year !== 'all' && month && month !== 'all' && day && day !== 'all') {
    const m = parseInt(month, 10);
    const name = MONTH_NAMES[m - 1] || `Mes ${month}`;
    return `${day} de ${name} ${year}`;
  }
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
  RESOLVED_STATUSES,
  isWeeklyFrequency,
  resolveCutoffDate,
  isHistoricalCutoffQuery,
  appendCutoffWhere,
  filterFailuresActiveAtCutoff,
  appendDateFilters,
  parseWeekRange,
  describePeriod
};
