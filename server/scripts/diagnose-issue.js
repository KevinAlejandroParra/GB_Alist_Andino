const { Checklist, ChecklistType, ChecklistResponse } = require('../src/models');
const weekUtils = require('../src/utils/weekUtils');

async function diagnose() {
  console.log('\n=== DIAGNÓSTICO DE CHECKLISTS ===\n');
  
  // 1. Ver checklists de familia recientes
  console.log('1. Últimos checklists de familia:');
  const familyChecklists = await Checklist.findAll({
    include: [{
      model: ChecklistType,
      as: 'type',
      where: { type_category: 'family' }
    }],
    order: [['createdAt', 'DESC']],
    limit: 10
  });
  
  familyChecklists.forEach(c => {
    console.log(`  - ID: ${c.checklist_id}`);
    console.log(`    week_identifier: ${c.week_identifier || 'NULL'}`);
    console.log(`    createdAt: ${c.createdAt}`);
    console.log(`    type: ${c.type.name}`);
    console.log('');
  });
  
  // 2. Calcular semana actual
  console.log('2. Semana actual:');
  const now = new Date();
  const { startOfWeek, endOfWeek } = weekUtils.getWeekBounds(now);
  const weekId = weekUtils.getWeekIdentifier(now);
  const weekRange = weekUtils.formatWeekRange(startOfWeek, endOfWeek);
  
  console.log(`  Hoy: ${now.toISOString()}`);
  console.log(`  Identificador: ${weekId}`);
  console.log(`  Rango: ${weekRange}`);
  console.log(`  Lunes: ${startOfWeek.toISOString()}`);
  console.log(`  Domingo: ${endOfWeek.toISOString()}`);
  console.log('');
  
  // 3. Buscar checklists de esta semana
  console.log('3. Checklists de esta semana:');
  const thisWeekChecklists = await Checklist.findAll({
    where: { week_identifier: weekId },
    include: [{ model: ChecklistType, as: 'type' }]
  });
  
  if (thisWeekChecklists.length === 0) {
    console.log('  ⚠️ No hay checklists para esta semana');
  } else {
    thisWeekChecklists.forEach(c => {
      console.log(`  - ID: ${c.checklist_id}, Tipo: ${c.type?.name}`);
    });
  }
  console.log('');
  
  // 4. Ver respuestas del último checklist
  if (familyChecklists.length > 0) {
    const lastChecklist = familyChecklists[0];
    console.log(`4. Respuestas del checklist ${lastChecklist.checklist_id}:`);
    
    const responses = await ChecklistResponse.findAll({
      where: { checklist_id: lastChecklist.checklist_id },
      limit: 5
    });
    
    console.log(`  Total respuestas: ${responses.length}`);
    responses.forEach(r => {
      console.log(`  - Response ID: ${r.response_id}, Item: ${r.checklist_item_id}`);
    });
  }
  
  process.exit(0);
}

diagnose().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
