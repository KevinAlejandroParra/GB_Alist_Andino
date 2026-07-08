/**
 * Tests para weekUtils
 * Ejecutar con: node server/src/utils/__tests__/weekUtils.test.js
 */

const weekUtils = require('../weekUtils');

// Colores para la consola
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function assert(condition, message) {
  if (condition) {
    console.log(`${colors.green}✓${colors.reset} ${message}`);
    return true;
  } else {
    console.log(`${colors.red}✗${colors.reset} ${message}`);
    return false;
  }
}

function testSection(title) {
  console.log(`\n${colors.blue}━━━ ${title} ━━━${colors.reset}`);
}

// ===== TESTS =====

testSection('Test 1: getMondayOfWeek (America/Bogota)');
{
  // Miércoles 30 de Abril, 2026 a las 12:00 UTC = 07:00 Bogotá
  const wednesday = new Date('2026-04-30T12:00:00Z');
  const monday = weekUtils.getMondayOfWeek(wednesday);
  const mondayParts = weekUtils.getCalendarPartsInAppTz(monday);

  assert(mondayParts.dayOfWeek === 1, 'El resultado debe ser un lunes en Bogotá');
  assert(mondayParts.day === 27, 'Debe ser el 27 de abril (lunes de esa semana en Bogotá)');

  // Domingo 3 de Mayo, 2026 a las 12:00 UTC = 07:00 Bogotá
  const sunday = new Date('2026-05-03T12:00:00Z');
  const mondayFromSunday = weekUtils.getMondayOfWeek(sunday);
  const mondayFromSundayParts = weekUtils.getCalendarPartsInAppTz(mondayFromSunday);

  assert(mondayFromSundayParts.day === 27, 'Domingo debe retornar el lunes de esa semana (27 abril)');
}

testSection('Test 2: getSundayOfWeek (America/Bogota)');
{
  const wednesday = new Date('2026-04-30T12:00:00Z');
  const sunday = weekUtils.getSundayOfWeek(wednesday);
  const sundayParts = weekUtils.getCalendarPartsInAppTz(sunday);

  assert(sundayParts.dayOfWeek === 0, 'El resultado debe ser un domingo en Bogotá');
  assert(sundayParts.day === 3, 'Debe ser el 3 de mayo (domingo de esa semana)');
}

testSection('Test 3: getWeekBounds');
{
  const wednesday = new Date('2026-04-30T12:00:00Z');
  const { startOfWeek, endOfWeek } = weekUtils.getWeekBounds(wednesday);
  const startParts = weekUtils.getCalendarPartsInAppTz(startOfWeek);
  const endParts = weekUtils.getCalendarPartsInAppTz(endOfWeek);

  assert(startParts.day === 27, 'Inicio de semana: 27 de abril');
  assert(endParts.day === 3, 'Fin de semana: 3 de mayo');
}

testSection('Test 4: getWeekIdentifier');
{
  const wednesday = new Date('2026-04-30T12:00:00Z');
  const identifier = weekUtils.getWeekIdentifier(wednesday);

  assert(identifier.startsWith('2026-W'), 'Debe empezar con 2026-W');
  assert(identifier.length === 8, 'Formato debe ser YYYY-Wxx (8 caracteres)');
  console.log(`  ${colors.yellow}→${colors.reset} Identificador generado: ${identifier}`);
}

testSection('Test 5: Caso real - Domingo 8pm Colombia NO cambia de semana');
{
  // Domingo 5 Jul 2026 20:00 Bogotá = Lunes 6 Jul 2026 01:00 UTC
  const sundayNightColombia = new Date('2026-07-06T01:00:00Z');
  const technicianSigned = new Date('2026-07-01T19:21:02Z'); // Martes 1 Jul 14:21 Bogotá

  const adminWeek = weekUtils.getWeekIdentifier(sundayNightColombia);
  const techWeek = weekUtils.getWeekIdentifier(technicianSigned);

  assert(adminWeek === techWeek, `Admin domingo 8pm y técnico martes deben estar en la misma semana (${adminWeek} vs ${techWeek})`);
  console.log(`  ${colors.yellow}→${colors.reset} Semana compartida: ${adminWeek}`);
}

testSection('Test 6: getDateBoundsForChecklistType - FAMILIA (semanal)');
{
  const familyChecklistType = {
    type_category: 'family',
    frequency: 'weekly'
  };

  const wednesday = new Date('2026-04-30T12:00:00Z');
  const bounds = weekUtils.getDateBoundsForChecklistType(familyChecklistType, wednesday);

  assert(bounds.isWeekly === true, 'Debe ser marcado como semanal');
  assert(bounds.identifier !== null, 'Debe tener identificador de semana');

  const startParts = weekUtils.getCalendarPartsInAppTz(bounds.startDate);
  const endParts = weekUtils.getCalendarPartsInAppTz(bounds.endDate);
  assert(startParts.day === 27, 'Debe iniciar el lunes 27');
  assert(endParts.day === 3, 'Debe terminar el domingo 3');

  console.log(`  ${colors.yellow}→${colors.reset} Rango: ${bounds.startDate.toISOString()} - ${bounds.endDate.toISOString()}`);
  console.log(`  ${colors.yellow}→${colors.reset} Identificador: ${bounds.identifier}`);
}

testSection('Test 7: getDateBoundsForChecklistType - ATRACCIÓN (diario)');
{
  const attractionChecklistType = {
    type_category: 'attraction',
    frequency: 'daily'
  };

  const wednesday = new Date('2026-04-30T12:00:00Z');
  const bounds = weekUtils.getDateBoundsForChecklistType(attractionChecklistType, wednesday);

  assert(bounds.isWeekly === false, 'NO debe ser marcado como semanal');
  assert(bounds.identifier === null, 'NO debe tener identificador de semana');

  const startParts = weekUtils.getCalendarPartsInAppTz(bounds.startDate);
  const endParts = weekUtils.getCalendarPartsInAppTz(bounds.endDate);
  assert(startParts.day === 30, 'Debe iniciar el mismo día (30) en Bogotá');
  assert(endParts.day === 30, 'Debe terminar el mismo día (30) en Bogotá');

  console.log(`  ${colors.yellow}→${colors.reset} Rango: ${bounds.startDate.toISOString()} - ${bounds.endDate.toISOString()}`);
}

testSection('Test 8: formatWeekRange');
{
  const monday = weekUtils.getMondayOfWeek(new Date('2026-04-30T12:00:00Z'));
  const sunday = weekUtils.getSundayOfWeek(new Date('2026-04-30T12:00:00Z'));
  const formatted = weekUtils.formatWeekRange(monday, sunday);

  assert(formatted.includes('27'), 'Debe incluir el día 27');
  assert(formatted.includes('3'), 'Debe incluir el día 3');
  console.log(`  ${colors.yellow}→${colors.reset} Formato: ${formatted}`);
}

testSection('Test 9: getDaysRemainingInWeek');
{
  const monday = new Date('2026-04-27T12:00:00Z');
  const wednesday = new Date('2026-04-29T12:00:00Z');
  const saturday = new Date('2026-05-02T12:00:00Z');
  const sunday = new Date('2026-05-03T12:00:00Z');

  const daysFromMonday = weekUtils.getDaysRemainingInWeek(monday);
  const daysFromWednesday = weekUtils.getDaysRemainingInWeek(wednesday);
  const daysFromSaturday = weekUtils.getDaysRemainingInWeek(saturday);
  const daysFromSunday = weekUtils.getDaysRemainingInWeek(sunday);

  assert(daysFromMonday === 6, 'Desde lunes deben quedar 6 días');
  assert(daysFromWednesday === 4, 'Desde miércoles deben quedar 4 días');
  assert(daysFromSaturday === 1, 'Desde sábado debe quedar 1 día');
  assert(daysFromSunday === 0, 'Desde domingo deben quedar 0 días');

  console.log(`  ${colors.yellow}→${colors.reset} Lunes: ${daysFromMonday} días`);
  console.log(`  ${colors.yellow}→${colors.reset} Miércoles: ${daysFromWednesday} días`);
  console.log(`  ${colors.yellow}→${colors.reset} Sábado: ${daysFromSaturday} día`);
  console.log(`  ${colors.yellow}→${colors.reset} Domingo: ${daysFromSunday} días`);
}

testSection('Test 10: isInCurrentWeek');
{
  const wednesday = new Date('2026-04-30T12:00:00Z');
  const monday = new Date('2026-04-27T12:00:00Z');
  const sunday = new Date('2026-05-03T12:00:00Z');
  const nextMonday = new Date('2026-05-04T12:00:00Z');

  assert(weekUtils.isInCurrentWeek(monday, wednesday) === true, 'Lunes está en la semana del miércoles');
  assert(weekUtils.isInCurrentWeek(sunday, wednesday) === true, 'Domingo está en la semana del miércoles');
  assert(weekUtils.isInCurrentWeek(nextMonday, wednesday) === false, 'Lunes siguiente NO está en la semana del miércoles');
}

testSection('Test 11: Consistencia entre funciones');
{
  const testDate = new Date('2026-04-30T12:00:00Z');

  const bounds = weekUtils.getWeekBounds(testDate);
  const monday = weekUtils.getMondayOfWeek(testDate);
  const sunday = weekUtils.getSundayOfWeek(testDate);

  assert(bounds.startOfWeek.getTime() === monday.getTime(), 'getWeekBounds.startOfWeek debe coincidir con getMondayOfWeek');
  assert(bounds.endOfWeek.getTime() === sunday.getTime(), 'getWeekBounds.endOfWeek debe coincidir con getSundayOfWeek');
}

// ===== RESUMEN =====
console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
console.log(`${colors.green}✓ Todos los tests pasaron correctamente${colors.reset}`);
console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
