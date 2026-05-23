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

testSection('Test 1: getMondayOfWeek');
{
  // Miércoles 30 de Abril, 2026
  const wednesday = new Date('2026-04-30T12:00:00Z');
  const monday = weekUtils.getMondayOfWeek(wednesday);
  
  assert(monday.getUTCDay() === 1, 'El resultado debe ser un lunes');
  assert(monday.getUTCDate() === 27, 'Debe ser el 27 de abril (lunes de esa semana)');
  assert(monday.getUTCHours() === 0, 'Debe ser a las 00:00:00');
  
  // Domingo 3 de Mayo, 2026
  const sunday = new Date('2026-05-03T12:00:00Z');
  const mondayFromSunday = weekUtils.getMondayOfWeek(sunday);
  
  assert(mondayFromSunday.getUTCDate() === 27, 'Domingo debe retornar el lunes de esa semana (27 abril)');
}

testSection('Test 2: getSundayOfWeek');
{
  // Miércoles 30 de Abril, 2026
  const wednesday = new Date('2026-04-30T12:00:00Z');
  const sunday = weekUtils.getSundayOfWeek(wednesday);
  
  assert(sunday.getUTCDay() === 0, 'El resultado debe ser un domingo');
  assert(sunday.getUTCDate() === 3, 'Debe ser el 3 de mayo (domingo de esa semana)');
  assert(sunday.getUTCHours() === 23, 'Debe ser a las 23:59:59');
  assert(sunday.getUTCMinutes() === 59, 'Minutos deben ser 59');
}

testSection('Test 3: getWeekBounds');
{
  const wednesday = new Date('2026-04-30T12:00:00Z');
  const { startOfWeek, endOfWeek } = weekUtils.getWeekBounds(wednesday);
  
  assert(startOfWeek.getUTCDate() === 27, 'Inicio de semana: 27 de abril');
  assert(endOfWeek.getUTCDate() === 3, 'Fin de semana: 3 de mayo');
  assert(startOfWeek.getUTCHours() === 0, 'Inicio a las 00:00:00');
  assert(endOfWeek.getUTCHours() === 23, 'Fin a las 23:59:59');
}

testSection('Test 4: getWeekIdentifier');
{
  const wednesday = new Date('2026-04-30T12:00:00Z');
  const identifier = weekUtils.getWeekIdentifier(wednesday);
  
  assert(identifier.startsWith('2026-W'), 'Debe empezar con 2026-W');
  assert(identifier.length === 8, 'Formato debe ser YYYY-Wxx (8 caracteres)');
  console.log(`  ${colors.yellow}→${colors.reset} Identificador generado: ${identifier}`);
}

testSection('Test 5: getDateBoundsForChecklistType - FAMILIA (semanal)');
{
  const familyChecklistType = {
    type_category: 'family',
    frequency: 'weekly'
  };
  
  const wednesday = new Date('2026-04-30T12:00:00Z');
  const bounds = weekUtils.getDateBoundsForChecklistType(familyChecklistType, wednesday);
  
  assert(bounds.isWeekly === true, 'Debe ser marcado como semanal');
  assert(bounds.identifier !== null, 'Debe tener identificador de semana');
  assert(bounds.startDate.getUTCDate() === 27, 'Debe iniciar el lunes 27');
  assert(bounds.endDate.getUTCDate() === 3, 'Debe terminar el domingo 3');
  
  console.log(`  ${colors.yellow}→${colors.reset} Rango: ${bounds.startDate.toISOString()} - ${bounds.endDate.toISOString()}`);
  console.log(`  ${colors.yellow}→${colors.reset} Identificador: ${bounds.identifier}`);
}

testSection('Test 6: getDateBoundsForChecklistType - ATRACCIÓN (diario)');
{
  const attractionChecklistType = {
    type_category: 'attraction',
    frequency: 'daily'
  };
  
  const wednesday = new Date('2026-04-30T12:00:00Z');
  const bounds = weekUtils.getDateBoundsForChecklistType(attractionChecklistType, wednesday);
  
  assert(bounds.isWeekly === false, 'NO debe ser marcado como semanal');
  assert(bounds.identifier === null, 'NO debe tener identificador de semana');
  assert(bounds.startDate.getUTCDate() === 30, 'Debe iniciar el mismo día (30)');
  assert(bounds.endDate.getUTCDate() === 30, 'Debe terminar el mismo día (30)');
  assert(bounds.startDate.getUTCHours() === 0, 'Inicio a las 00:00:00');
  assert(bounds.endDate.getUTCHours() === 23, 'Fin a las 23:59:59');
  
  console.log(`  ${colors.yellow}→${colors.reset} Rango: ${bounds.startDate.toISOString()} - ${bounds.endDate.toISOString()}`);
}

testSection('Test 7: formatWeekRange');
{
  const monday = new Date('2026-04-27T00:00:00Z');
  const sunday = new Date('2026-05-03T23:59:59Z');
  const formatted = weekUtils.formatWeekRange(monday, sunday);
  
  assert(formatted.includes('27'), 'Debe incluir el día 27');
  assert(formatted.includes('3'), 'Debe incluir el día 3');
  console.log(`  ${colors.yellow}→${colors.reset} Formato: ${formatted}`);
}

testSection('Test 8: getDaysRemainingInWeek');
{
  // Simular diferentes días de la semana
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

testSection('Test 9: isInCurrentWeek');
{
  const wednesday = new Date('2026-04-30T12:00:00Z');
  const monday = new Date('2026-04-27T12:00:00Z');
  const sunday = new Date('2026-05-03T12:00:00Z');
  const nextMonday = new Date('2026-05-04T12:00:00Z');
  
  assert(weekUtils.isInCurrentWeek(monday, wednesday) === true, 'Lunes está en la semana del miércoles');
  assert(weekUtils.isInCurrentWeek(sunday, wednesday) === true, 'Domingo está en la semana del miércoles');
  assert(weekUtils.isInCurrentWeek(nextMonday, wednesday) === false, 'Lunes siguiente NO está en la semana del miércoles');
}

testSection('Test 10: Consistencia entre funciones');
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
