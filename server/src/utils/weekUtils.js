/**
 * Utilidades para manejo de semanas en checklists
 * Semana operativa: Lunes 00:00:00 - Domingo 23:59:59 en America/Bogota (UTC-5)
 */

const APP_TIMEZONE = process.env.APP_TIMEZONE || 'America/Bogota';
const BOGOTA_UTC_OFFSET_HOURS = 5; // Bogota = UTC-5 → sumar 5h a hora local para obtener UTC

const WEEKDAY_MAP = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/**
 * Componentes de calendario en la zona horaria de la aplicación (Colombia)
 */
const getCalendarPartsInAppTz = (date) => {
  const d = new Date(date);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    weekday: 'short',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour12: false,
  }).formatToParts(d);

  const get = (type) => parts.find((p) => p.type === type)?.value;

  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    dayOfWeek: WEEKDAY_MAP[get('weekday')] ?? 0,
  };
};

/**
 * Suma días a una fecha de calendario (sin hora)
 */
const addCalendarDays = (year, month, day, delta) => {
  const dt = new Date(Date.UTC(year, month - 1, day + delta));
  return {
    year: dt.getUTCFullYear(),
    month: dt.getUTCMonth() + 1,
    day: dt.getUTCDate(),
  };
};

/**
 * Convierte medianoche de un día en Bogotá a instante UTC
 */
const bogotaStartOfDayUtc = (year, month, day) =>
  new Date(Date.UTC(year, month - 1, day, BOGOTA_UTC_OFFSET_HOURS, 0, 0, 0));

/**
 * Convierte 23:59:59.999 de un día en Bogotá a instante UTC
 */
const bogotaEndOfDayUtc = (year, month, day) =>
  new Date(Date.UTC(year, month - 1, day + 1, BOGOTA_UTC_OFFSET_HOURS - 1, 59, 59, 999));

/**
 * Obtiene el lunes de la semana para una fecha dada (en hora Colombia)
 * @param {Date} date - Fecha de referencia
 * @returns {Date} - Lunes de esa semana a las 00:00:00 Bogotá (como instante UTC)
 */
const getMondayOfWeek = (date) => {
  const { year, month, day, dayOfWeek } = getCalendarPartsInAppTz(date);
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = addCalendarDays(year, month, day, diff);
  return bogotaStartOfDayUtc(monday.year, monday.month, monday.day);
};

/**
 * Obtiene el domingo de la semana para una fecha dada (en hora Colombia)
 * @param {Date} date - Fecha de referencia
 * @returns {Date} - Domingo de esa semana a las 23:59:59 Bogotá (como instante UTC)
 */
const getSundayOfWeek = (date) => {
  const monday = getMondayOfWeek(date);
  const mondayParts = getCalendarPartsInAppTz(monday);
  const sunday = addCalendarDays(mondayParts.year, mondayParts.month, mondayParts.day, 6);
  return bogotaEndOfDayUtc(sunday.year, sunday.month, sunday.day);
};

/**
 * Obtiene los límites de la semana (lunes-domingo) para una fecha dada
 * @param {Date} date - Fecha de referencia
 * @returns {Object} - { startOfWeek: Date, endOfWeek: Date }
 */
const getWeekBounds = (date) => ({
  startOfWeek: getMondayOfWeek(date),
  endOfWeek: getSundayOfWeek(date),
});

/**
 * Genera un identificador de semana (YYYY-Wxx) basado en calendario Colombia
 * @param {Date} date - Fecha de referencia
 * @returns {String} - Identificador de semana (ej: "2026-W18")
 */
const getWeekIdentifier = (date) => {
  const monday = getMondayOfWeek(date);
  const mondayParts = getCalendarPartsInAppTz(monday);
  const year = mondayParts.year;

  const startOfYear = bogotaStartOfDayUtc(year, 1, 1);
  let firstMonday = getMondayOfWeek(startOfYear);
  const firstMondayParts = getCalendarPartsInAppTz(firstMonday);

  if (firstMondayParts.year < year) {
    const adjusted = addCalendarDays(firstMondayParts.year, firstMondayParts.month, firstMondayParts.day, 7);
    firstMonday = bogotaStartOfDayUtc(adjusted.year, adjusted.month, adjusted.day);
  }

  const weekNumber =
    Math.floor((monday - firstMonday) / (7 * 24 * 60 * 60 * 1000)) + 1;

  return `${year}-W${String(weekNumber).padStart(2, '0')}`;
};

/**
 * Obtiene los límites de fecha según el tipo de checklist
 * @param {Object} checklistType - Tipo de checklist
 * @param {Date} referenceDate - Fecha de referencia (por defecto: ahora)
 * @returns {Object} - { startDate, endDate, identifier, isWeekly }
 */
const getDateBoundsForChecklistType = (checklistType, referenceDate = new Date()) => {
  const frequency = (checklistType.frequency || '').toLowerCase().trim();
  const isWeeklyFrequency = frequency === 'weekly' || frequency === 'semanal';

  const isWeeklyCategory =
    checklistType.type_category === 'family' || checklistType.type_category === 'static';

  if (isWeeklyCategory && isWeeklyFrequency) {
    const { startOfWeek, endOfWeek } = getWeekBounds(referenceDate);
    return {
      startDate: startOfWeek,
      endDate: endOfWeek,
      identifier: getWeekIdentifier(referenceDate),
      isWeekly: true,
    };
  }

  const { year, month, day } = getCalendarPartsInAppTz(referenceDate);

  return {
    startDate: bogotaStartOfDayUtc(year, month, day),
    endDate: bogotaEndOfDayUtc(year, month, day),
    identifier: null,
    isWeekly: false,
  };
};

/**
 * Formatea un rango de fechas para mostrar al usuario (calendario Colombia)
 */
const formatWeekRange = (startDate, endDate) => {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const startParts = getCalendarPartsInAppTz(startDate);
  const endParts = getCalendarPartsInAppTz(endDate);

  return `${days[startParts.dayOfWeek]} ${startParts.day} ${months[startParts.month - 1]} - ${days[endParts.dayOfWeek]} ${endParts.day} ${months[endParts.month - 1]}`;
};

/**
 * Calcula los días restantes hasta el final de la semana (calendario Colombia)
 */
const getDaysRemainingInWeek = (referenceDate = new Date()) => {
  const { dayOfWeek } = getCalendarPartsInAppTz(referenceDate);
  return dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
};

/**
 * Verifica si una fecha está dentro de la semana actual (calendario Colombia)
 */
const isInCurrentWeek = (date, referenceDate = new Date()) => {
  const { startOfWeek, endOfWeek } = getWeekBounds(referenceDate);
  const checkDate = new Date(date);
  return checkDate >= startOfWeek && checkDate <= endOfWeek;
};

module.exports = {
  APP_TIMEZONE,
  getCalendarPartsInAppTz,
  getMondayOfWeek,
  getSundayOfWeek,
  getWeekBounds,
  getWeekIdentifier,
  getDateBoundsForChecklistType,
  formatWeekRange,
  getDaysRemainingInWeek,
  isInCurrentWeek,
};
