const { Checklist, ChecklistType } = require('../src/models');
const weekUtils = require('../src/utils/weekUtils');

async function fixExistingChecklists() {
  console.log('\n=== REPARANDO CHECKLISTS EXISTENTES ===\n');
  
  try {
    // 1. Obtener todos los checklists de familia sin week_identifier
    const familyChecklists = await Checklist.findAll({
      include: [{
        model: ChecklistType,
        as: 'type',
        where: { type_category: 'family' }
      }],
      where: { week_identifier: null }
    });
    
    console.log(`Encontrados ${familyChecklists.length} checklists de familia sin week_identifier\n`);
    
    if (familyChecklists.length === 0) {
      console.log('✅ No hay checklists para reparar');
      process.exit(0);
    }
    
    // 2. Actualizar cada checklist con su week_identifier correspondiente
    let updated = 0;
    
    for (const checklist of familyChecklists) {
      const createdDate = new Date(checklist.createdAt);
      
      // Verificar que el tipo es realmente semanal
      const frequency = (checklist.type.frequency || '').toLowerCase();
      const isWeekly = frequency === 'weekly' || frequency === 'semanal';
      
      if (!isWeekly) {
        console.log(`⚠️ Checklist ${checklist.checklist_id} (${checklist.type.name})`);
        console.log(`   Frecuencia: "${checklist.type.frequency}" - NO es semanal, saltando...`);
        console.log('');
        continue;
      }
      
      const weekIdentifier = weekUtils.getWeekIdentifier(createdDate);
      const { startOfWeek, endOfWeek } = weekUtils.getWeekBounds(createdDate);
      const weekRange = weekUtils.formatWeekRange(startOfWeek, endOfWeek);
      
      await checklist.update({ week_identifier: weekIdentifier });
      
      console.log(`✓ Checklist ${checklist.checklist_id}:`);
      console.log(`  Tipo: ${checklist.type.name}`);
      console.log(`  Frecuencia: ${checklist.type.frequency}`);
      console.log(`  Creado: ${createdDate.toLocaleDateString('es-CO')}`);
      console.log(`  Semana asignada: ${weekIdentifier} (${weekRange})`);
      console.log('');
      
      updated++;
    }
    
    console.log(`\n✅ ${updated} checklists actualizados exitosamente\n`);
    
    // 3. Verificar semana actual
    const now = new Date();
    const currentWeekId = weekUtils.getWeekIdentifier(now);
    
    const currentWeekChecklists = await Checklist.findAll({
      where: { week_identifier: currentWeekId },
      include: [{ model: ChecklistType, as: 'type' }]
    });
    
    console.log(`Checklists en la semana actual (${currentWeekId}):`);
    if (currentWeekChecklists.length === 0) {
      console.log('  ⚠️ Ninguno (se creará uno nuevo al acceder)');
    } else {
      currentWeekChecklists.forEach(c => {
        console.log(`  - ID ${c.checklist_id}: ${c.type.name}`);
      });
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixExistingChecklists();
