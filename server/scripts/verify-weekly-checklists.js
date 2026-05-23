/**
 * Script de verificación para checklists semanales
 * Ejecutar con: node server/scripts/verify-weekly-checklists.js
 */

const { Checklist, ChecklistType, Device, Inspectable } = require('../src/models');
const weekUtils = require('../src/utils/weekUtils');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(color, symbol, message) {
  console.log(`${colors[color]}${symbol}${colors.reset} ${message}`);
}

async function verifyWeeklyChecklists() {
  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}   VERIFICACIÓN DE CHECKLISTS SEMANALES${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  try {
    // 1. Verificar que el campo week_identifier existe
    log('blue', '📋', 'Verificando estructura de base de datos...');
    const checklistSample = await Checklist.findOne();
    if (checklistSample && 'week_identifier' in checklistSample.dataValues) {
      log('green', '✓', 'Campo week_identifier existe en la tabla checklists');
    } else {
      log('red', '✗', 'Campo week_identifier NO existe. Ejecuta la migración primero.');
      return;
    }

    // 2. Buscar tipos de checklist de familia
    log('blue', '\n📋', 'Buscando tipos de checklist de familia...');
    const familyChecklistTypes = await ChecklistType.findAll({
      where: {
        type_category: 'family'
      }
    });

    if (familyChecklistTypes.length === 0) {
      log('yellow', '⚠', 'No se encontraron tipos de checklist de familia');
    } else {
      log('green', '✓', `Encontrados ${familyChecklistTypes.length} tipo(s) de checklist de familia`);
      
      for (const type of familyChecklistTypes) {
        console.log(`\n  ${colors.cyan}→ ${type.name}${colors.reset}`);
        console.log(`    ID: ${type.checklist_type_id}`);
        console.log(`    Frecuencia: ${type.frequency}`);
        console.log(`    Categoría: ${type.type_category}`);
        console.log(`    Associated ID: ${type.associated_id}`);

        // Verificar dispositivos asociados
        if (type.associated_id) {
          const devices = await Device.findAll({
            where: { family_id: type.associated_id, public_flag: 'Sí' },
            include: { model: Inspectable, as: 'parentInspectable' }
          });
          console.log(`    Dispositivos activos: ${devices.length}`);
        }
      }
    }

    // 3. Verificar checklists semanales existentes
    log('blue', '\n📋', 'Buscando checklists semanales existentes...');
    const weeklyChecklists = await Checklist.findAll({
      where: {
        week_identifier: { [require('sequelize').Op.ne]: null }
      },
      include: [{ model: ChecklistType, as: 'type' }],
      order: [['week_identifier', 'DESC']],
      limit: 10
    });

    if (weeklyChecklists.length === 0) {
      log('yellow', '⚠', 'No se encontraron checklists semanales aún');
      log('cyan', 'ℹ', 'Esto es normal si acabas de implementar la funcionalidad');
    } else {
      log('green', '✓', `Encontrados ${weeklyChecklists.length} checklist(s) semanal(es) (mostrando últimos 10)`);
      
      for (const checklist of weeklyChecklists) {
        const { startDate, endDate } = weekUtils.getWeekBounds(new Date(checklist.createdAt));
        const weekRange = weekUtils.formatWeekRange(startDate, endDate);
        
        console.log(`\n  ${colors.cyan}→ Checklist #${checklist.checklist_id}${colors.reset}`);
        console.log(`    Semana: ${checklist.week_identifier}`);
        console.log(`    Rango: ${weekRange}`);
        console.log(`    Tipo: ${checklist.type?.name || 'N/A'}`);
        console.log(`    Creado: ${new Date(checklist.createdAt).toLocaleString('es-CO')}`);
      }
    }

    // 4. Verificar checklists de atracción (NO deben tener week_identifier)
    log('blue', '\n📋', 'Verificando checklists de atracción (deben ser diarios)...');
    const attractionChecklists = await Checklist.findAll({
      include: [{
        model: ChecklistType,
        as: 'type',
        where: { type_category: 'attraction' }
      }],
      limit: 5
    });

    if (attractionChecklists.length === 0) {
      log('yellow', '⚠', 'No se encontraron checklists de atracción');
    } else {
      const withWeekId = attractionChecklists.filter(c => c.week_identifier !== null);
      
      if (withWeekId.length > 0) {
        log('red', '✗', `ERROR: ${withWeekId.length} checklist(s) de atracción tienen week_identifier`);
        log('red', '  ', 'Los checklists de atracción NO deben tener week_identifier');
      } else {
        log('green', '✓', `Correcto: ${attractionChecklists.length} checklist(s) de atracción sin week_identifier`);
      }
    }

    // 5. Verificar semana actual
    log('blue', '\n📋', 'Información de la semana actual...');
    const now = new Date();
    const { startOfWeek, endOfWeek } = weekUtils.getWeekBounds(now);
    const weekIdentifier = weekUtils.getWeekIdentifier(now);
    const weekRange = weekUtils.formatWeekRange(startOfWeek, endOfWeek);
    const daysRemaining = weekUtils.getDaysRemainingInWeek(now);

    console.log(`  ${colors.cyan}Hoy:${colors.reset} ${now.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
    console.log(`  ${colors.cyan}Semana actual:${colors.reset} ${weekIdentifier}`);
    console.log(`  ${colors.cyan}Rango:${colors.reset} ${weekRange}`);
    console.log(`  ${colors.cyan}Días restantes:${colors.reset} ${daysRemaining}`);

    // 6. Buscar checklists de la semana actual
    const currentWeekChecklists = await Checklist.findAll({
      where: { week_identifier: weekIdentifier },
      include: [{ model: ChecklistType, as: 'type' }]
    });

    if (currentWeekChecklists.length > 0) {
      log('green', '\n✓', `Hay ${currentWeekChecklists.length} checklist(s) activo(s) para esta semana`);
      for (const checklist of currentWeekChecklists) {
        console.log(`  → ${checklist.type?.name || 'N/A'} (ID: ${checklist.checklist_id})`);
      }
    } else {
      log('yellow', '\n⚠', 'No hay checklists activos para esta semana');
    }

    // 7. Resumen final
    console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    log('green', '✓', 'Verificación completada exitosamente');
    console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  } catch (error) {
    console.error(`\n${colors.red}✗ Error durante la verificación:${colors.reset}`, error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

// Ejecutar verificación
verifyWeeklyChecklists();
