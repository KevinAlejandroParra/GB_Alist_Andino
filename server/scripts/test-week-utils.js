/**
 * Script para probar las funciones de weekUtils
 * Útil para verificar que los cálculos de semana son correctos
 */

const weekUtils = require('../src/utils/weekUtils');

function testWeekUtils() {
  console.log('🧪 PRUEBAS DE WEEK UTILS\n');
  console.log('='.repeat(60));

  // Probar con diferentes fechas
  const testDates = [
    new Date('2026-04-27'), // Lunes
    new Date('2026-04-30'), // Jueves (fecha del problema reportado)
    new Date('2026-05-01'), // Viernes
    new Date('2026-05-02'), // Sábado (hoy según el contexto)
    new Date('2026-05-03'), // Domingo
    new Date('2026-05-04'), // Lunes siguiente
  ];

  testDates.forEach((date, index) => {
    console.log(`\n${index + 1}. Fecha de prueba: ${date.toISOString().split('T')[0]} (${getDayName(date)})`);
    console.log('-'.repeat(60));

    // Obtener lunes y domingo de la semana
    const monday = weekUtils.getMondayOfWeek(date);
    const sunday = weekUtils.getSundayOfWeek(date);
    
    console.log(`   Lunes de la semana: ${monday.toISOString()}`);
    console.log(`   Domingo de la semana: ${sunday.toISOString()}`);

    // Obtener identificador de semana
    const weekId = weekUtils.getWeekIdentifier(date);
    console.log(`   Identificador: ${weekId}`);

    // Formatear rango
    const range = weekUtils.formatWeekRange(monday, sunday);
    console.log(`   Rango formateado: ${range}`);

    // Días restantes
    const daysRemaining = weekUtils.getDaysRemainingInWeek(date);
    console.log(`   Días restantes: ${daysRemaining}`);

    // Verificar si está en la semana actual
    const isCurrentWeek = weekUtils.isInCurrentWeek(date);
    console.log(`   ¿Es semana actual?: ${isCurrentWeek}`);

    // Probar con un checklist type de familia
    const familyType = { type_category: 'family', frequency: 'semanal' };
    const bounds = weekUtils.getDateBoundsForChecklistType(familyType, date);
    console.log(`   Bounds para familia:`);
    console.log(`     - Start: ${bounds.startDate.toISOString()}`);
    console.log(`     - End: ${bounds.endDate.toISOString()}`);
    console.log(`     - Identifier: ${bounds.identifier}`);
    console.log(`     - Is Weekly: ${bounds.isWeekly}`);
  });

  // Probar con checklist de atracción (diario)
  console.log('\n\n📅 PRUEBA CON CHECKLIST DE ATRACCIÓN (DIARIO):');
  console.log('-'.repeat(60));
  const attractionType = { type_category: 'attraction', frequency: 'diario' };
  const today = new Date();
  const attractionBounds = weekUtils.getDateBoundsForChecklistType(attractionType, today);
  console.log(`   Fecha: ${today.toISOString().split('T')[0]}`);
  console.log(`   Start: ${attractionBounds.startDate.toISOString()}`);
  console.log(`   End: ${attractionBounds.endDate.toISOString()}`);
  console.log(`   Identifier: ${attractionBounds.identifier || 'NULL'}`);
  console.log(`   Is Weekly: ${attractionBounds.isWeekly}`);

  // Verificar que dos fechas de la misma semana dan el mismo identificador
  console.log('\n\n🔍 VERIFICACIÓN DE CONSISTENCIA:');
  console.log('-'.repeat(60));
  const monday = new Date('2026-04-27');
  const friday = new Date('2026-05-01');
  const sunday = new Date('2026-05-03');
  const nextMonday = new Date('2026-05-04');

  const mondayId = weekUtils.getWeekIdentifier(monday);
  const fridayId = weekUtils.getWeekIdentifier(friday);
  const sundayId = weekUtils.getWeekIdentifier(sunday);
  const nextMondayId = weekUtils.getWeekIdentifier(nextMonday);

  console.log(`   Lunes 27 Abr: ${mondayId}`);
  console.log(`   Viernes 1 May: ${fridayId}`);
  console.log(`   Domingo 3 May: ${sundayId}`);
  console.log(`   Lunes 4 May: ${nextMondayId}`);

  const sameWeek = mondayId === fridayId && fridayId === sundayId;
  const differentWeek = sundayId !== nextMondayId;

  console.log(`\n   ✅ Misma semana (Lun-Dom): ${sameWeek ? 'CORRECTO' : 'ERROR'}`);
  console.log(`   ✅ Semana diferente (Dom-Lun): ${differentWeek ? 'CORRECTO' : 'ERROR'}`);

  console.log('\n' + '='.repeat(60));
  console.log('✅ Pruebas completadas\n');
}

function getDayName(date) {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[date.getUTCDay()];
}

// Ejecutar las pruebas
testWeekUtils();
