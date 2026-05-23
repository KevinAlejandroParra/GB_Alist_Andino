/**
 * Script de diagnóstico para checklists semanales
 * Verifica la configuración y estado de los checklists de familia
 */

const { Checklist, ChecklistType, Device, Inspectable } = require('../src/models');
const weekUtils = require('../src/utils/weekUtils');

async function diagnoseWeeklyChecklists() {
  try {
    console.log('🔍 DIAGNÓSTICO DE CHECKLISTS SEMANALES\n');
    console.log('='.repeat(60));

    // 1. Verificar tipos de checklist de familia
    console.log('\n📋 1. TIPOS DE CHECKLIST DE FAMILIA:');
    const familyTypes = await ChecklistType.findAll({
      where: { type_category: 'family' },
      attributes: ['checklist_type_id', 'name', 'frequency', 'associated_id']
    });

    if (familyTypes.length === 0) {
      console.log('   ⚠️  No se encontraron tipos de checklist de familia');
      return;
    }

    familyTypes.forEach(type => {
      console.log(`\n   [${type.checklist_type_id}] ${type.name}`);
      console.log(`       Frecuencia: ${type.frequency || 'NO DEFINIDA'}`);
      console.log(`       Family ID: ${type.associated_id}`);
    });

    // 2. Verificar semana actual
    console.log('\n\n📅 2. INFORMACIÓN DE SEMANA ACTUAL:');
    const now = new Date();
    const { startDate, endDate, identifier, isWeekly } = weekUtils.getDateBoundsForChecklistType(
      { type_category: 'family', frequency: 'semanal' }
    );
    
    console.log(`   Fecha actual: ${now.toISOString()}`);
    console.log(`   Identificador de semana: ${identifier}`);
    console.log(`   Inicio de semana: ${startDate.toISOString()}`);
    console.log(`   Fin de semana: ${endDate.toISOString()}`);
    console.log(`   Rango formateado: ${weekUtils.formatWeekRange(startDate, endDate)}`);
    console.log(`   Días restantes: ${weekUtils.getDaysRemainingInWeek()}`);
    console.log(`   Es semanal: ${isWeekly}`);

    // 3. Verificar checklists existentes para cada familia
    console.log('\n\n📊 3. CHECKLISTS EXISTENTES POR FAMILIA:');
    
    for (const familyType of familyTypes) {
      console.log(`\n   Familia: ${familyType.name}`);
      
      // Buscar checklists de esta semana
      const weeklyChecklists = await Checklist.findAll({
        where: {
          checklist_type_id: familyType.checklist_type_id,
          week_identifier: identifier
        },
        attributes: ['checklist_id', 'week_identifier', 'createdAt', 'updatedAt'],
        order: [['createdAt', 'DESC']]
      });

      if (weeklyChecklists.length === 0) {
        console.log(`       ⚠️  No hay checklist para la semana ${identifier}`);
      } else {
        weeklyChecklists.forEach(checklist => {
          console.log(`       ✅ Checklist ID: ${checklist.checklist_id}`);
          console.log(`          Week ID: ${checklist.week_identifier}`);
          console.log(`          Creado: ${checklist.createdAt.toISOString()}`);
          console.log(`          Actualizado: ${checklist.updatedAt.toISOString()}`);
        });
      }

      // Buscar checklists de semanas anteriores
      const oldChecklists = await Checklist.findAll({
        where: {
          checklist_type_id: familyType.checklist_type_id
        },
        attributes: ['checklist_id', 'week_identifier', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: 5
      });

      if (oldChecklists.length > 0) {
        console.log(`\n       📜 Últimos 5 checklists:`);
        oldChecklists.forEach(checklist => {
          const isCurrentWeek = checklist.week_identifier === identifier;
          const marker = isCurrentWeek ? '🟢' : '⚪';
          console.log(`          ${marker} ID: ${checklist.checklist_id} | Week: ${checklist.week_identifier || 'NULL'} | Creado: ${checklist.createdAt.toISOString().split('T')[0]}`);
        });
      }

      // Verificar dispositivos activos de la familia
      const devices = await Device.findAll({
        where: {
          family_id: familyType.associated_id,
          public_flag: 'Sí'
        },
        include: [{ model: Inspectable, as: 'parentInspectable', attributes: ['name'] }]
      });

      console.log(`\n       🎮 Dispositivos activos: ${devices.length}`);
      if (devices.length > 0) {
        devices.slice(0, 3).forEach(device => {
          console.log(`          - ${device.parentInspectable?.name || 'Sin nombre'}`);
        });
        if (devices.length > 3) {
          console.log(`          ... y ${devices.length - 3} más`);
        }
      }
    }

    // 4. Verificar checklists con week_identifier NULL
    console.log('\n\n⚠️  4. CHECKLISTS SIN WEEK_IDENTIFIER:');
    const nullWeekChecklists = await Checklist.findAll({
      where: {
        week_identifier: null
      },
      include: [{ model: ChecklistType, as: 'type', attributes: ['name', 'type_category', 'frequency'] }],
      limit: 10
    });

    if (nullWeekChecklists.length === 0) {
      console.log('   ✅ No hay checklists con week_identifier NULL');
    } else {
      console.log(`   ⚠️  Encontrados ${nullWeekChecklists.length} checklists sin week_identifier:`);
      nullWeekChecklists.forEach(checklist => {
        console.log(`       - ID: ${checklist.checklist_id} | Tipo: ${checklist.type?.name} | Categoría: ${checklist.type?.type_category} | Creado: ${checklist.createdAt.toISOString().split('T')[0]}`);
      });
    }

    // 5. Recomendaciones
    console.log('\n\n💡 5. RECOMENDACIONES:');
    
    const familyTypesWithoutFrequency = familyTypes.filter(t => !t.frequency || t.frequency === '');
    if (familyTypesWithoutFrequency.length > 0) {
      console.log('   ⚠️  Ejecutar: node server/scripts/fix-checklist-types-frequency.js');
      console.log('       (Para actualizar frequency en checklist_types)');
    }

    if (nullWeekChecklists.length > 0) {
      console.log('   ⚠️  Ejecutar: node server/scripts/fix-existing-checklists.js');
      console.log('       (Para actualizar week_identifier en checklists existentes)');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Diagnóstico completado\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    process.exit(1);
  }
}

// Ejecutar el script
diagnoseWeeklyChecklists();
