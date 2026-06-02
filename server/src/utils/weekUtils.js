/**
 * Utilidades para manejo de semanas en checklists
 * Semana: Lunes 00:00:00 - Domingo 23:59:59
 */

/**
 * Obtiene el lunes de la semana para una fecha dada
 * @param {Date} date - Fecha de referencia
 * @returns {Date} - Lunes de esa semana a las 00:00:00 UTC
 */
const getMondayOfWeek = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  
  // getUTCDay() retorna 0 para domingo, 1 para lunes, etc.
  const day = d.getUTCDay();
  
  // Calcular cuántos días restar para llegar al lunes
  // Si es domingo (0), restar 6 días
  // Si es lunes (1), restar 0 días
  // Si es martes (2), restar 1 día, etc.
  const diff = day === 0 ? -6 : 1 - day;
  
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
};

/**
 * Obtiene el domingo de la semana para una fecha dada
 * @param {Date} date - Fecha de referencia
 * @returns {Date} - Domingo de esa semana a las 23:59:59 UTC
 */
const getSundayOfWeek = (date) => {
  const monday = getMondayOfWeek(date);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  return sunday;
};

/**
 * Obtiene los límites de la semana (lunes-domingo) para una fecha dada
 * @param {Date} date - Fecha de referencia
 * @returns {Object} - { startOfWeek: Date, endOfWeek: Date }
 */
const getWeekBounds = (date) => {
  return {
    startOfWeek: getMondayOfWeek(date),
    endOfWeek: getSundayOfWeek(date)
  };
};

/**
 * Genera un identificador de semana en formato ISO (YYYY-Wxx)
 * @param {Date} date - Fecha de referencia
 * @returns {String} - Identificador de semana (ej: "2026-W18")
 */
const getWeekIdentifier = (date) => {
  const monday = getMondayOfWeek(date);
  const year = monday.getUTCFullYear();
  
  // Calcular número de semana del año
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const firstMonday = getMondayOfWeek(startOfYear);
  
  // Si el primer lunes del año es en el año anterior, ajustar
  if (firstMonday.getUTCFullYear() < year) {
    firstMonday.setUTCDate(firstMonday.getUTCDate() + 7);
  }
  
  const weekNumber = Math.floor((monday - firstMonday) / (7 * 24 * 60 * 60 * 1000)) + 1;
  
  return `${year}-W${String(weekNumber).padStart(2, '0')}`;
};

/**
 * Obtiene los límites de fecha según el tipo de checklist
 * @param {Object} checklistType - Tipo de checklist
 * @param {Date} referenceDate - Fecha de referencia (por defecto: hoy)
 * @returns {Object} - { startDate, endDate, identifier }
 */
/**
 * Obtiene los límites de fecha según el tipo de checklist
 * @param {Object} checklistType - Tipo de checklist
 * @param {Date} referenceDate - Fecha de referencia (por defecto: hoy)
 * @returns {Object} - { startDate, endDate, identifier, isWeekly }
 */
const getDateBoundsForChecklistType = (checklistType, referenceDate = new Date()) => {
  // Para checklists de familia (semanales)
  // Aceptar: 'weekly', 'semanal', 'Semanal', 'SEMANAL' (case-insensitive)
  const frequency = (checklistType.frequency || '').toLowerCase().trim();
  const isWeeklyFrequency = frequency === 'weekly' || frequency === 'semanal';
  
  const isWeeklyCategory = checklistType.type_category === 'family' || checklistType.type_category === 'static';
  if (isWeeklyCategory && isWeeklyFrequency) {
    const { startOfWeek, endOfWeek } = getWeekBounds(referenceDate);
    return {
      startDate: startOfWeek,
      endDate: endOfWeek,
      identifier: getWeekIdentifier(referenceDate),
      isWeekly: true
    };
  }
  
  // Para todos los demás (diarios): atracciones, específicos, estáticos
  // Esto incluye: 'daily', 'diario', 'Diaria', etc.
  const today = new Date(referenceDate);
  today.setUTCHours(0, 0, 0, 0);
  const startOfDay = new Date(today);
  const endOfDay = new Date(today);
  endOfDay.setUTCHours(23, 59, 59, 999);
  
  return {
    startDate: startOfDay,
    endDate: endOfDay,
    identifier: null,
    isWeekly: false
  };
};

/**
 * Formatea un rango de fechas para mostrar al usuario
 * @param {Date} startDate - Fecha de inicio
 * @param {Date} endDate - Fecha de fin
 * @param {String} locale - Locale para formateo (por defecto: 'es-CO')
 * @returns {String} - Rango formateado (ej: "Lun 28 Abr - Dom 4 May")
 */
const formatWeekRange = (startDate, endDate, locale = 'es-CO') => {
  // Usar formato manual para mayor control
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  
  const startDay = days[startDate.getUTCDay()];
  const startDayNum = startDate.getUTCDate();
  const startMonth = months[startDate.getUTCMonth()];
  
  const endDay = days[endDate.getUTCDay()];
  const endDayNum = endDate.getUTCDate();
  const endMonth = months[endDate.getUTCMonth()];
  
  return `${startDay} ${startDayNum} ${startMonth} - ${endDay} ${endDayNum} ${endMonth}`;
};

/**
 * Calcula los días restantes hasta el final de la semana
 * @param {Date} referenceDate - Fecha de referencia (por defecto: hoy)
 * @returns {Number} - Días restantes (0-6)
 */
const getDaysRemainingInWeek = (referenceDate = new Date()) => {
  const sunday = getSundayOfWeek(referenceDate);
  const now = new Date(referenceDate);
  now.setUTCHours(0, 0, 0, 0);
  
  const diffTime = sunday - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
};

/**
 * Verifica si una fecha está dentro de la semana actual
 * @param {Date} date - Fecha a verificar
 * @param {Date} referenceDate - Fecha de referencia (por defecto: hoy)
 * @returns {Boolean}
 */
const isInCurrentWeek = (date, referenceDate = new Date()) => {
  const { startOfWeek, endOfWeek } = getWeekBounds(referenceDate);
  const checkDate = new Date(date);
  return checkDate >= startOfWeek && checkDate <= endOfWeek;
};

module.exports = {
  getMondayOfWeek,
  getSundayOfWeek,
  getWeekBounds,
  getWeekIdentifier,
  getDateBoundsForChecklistType,
  formatWeekRange,
  getDaysRemainingInWeek,
  isInCurrentWeek
};
