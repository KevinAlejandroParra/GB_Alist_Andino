const { ChecklistType } = require('../src/models');

async function checkTypes() {
  console.log('\n=== TIPOS DE CHECKLIST ===\n');
  
  const types = await ChecklistType.findAll({
    order: [['type_category', 'ASC'], ['name', 'ASC']]
  });
  
  console.log(`Total: ${types.length} tipos\n`);
  
  types.forEach(type => {
    console.log(`ID: ${type.checklist_type_id}`);
    console.log(`  Nombre: ${type.name}`);
    console.log(`  Categoría: ${type.type_category}`);
    console.log(`  Frecuencia: ${type.frequency}`);
    console.log(`  Associated ID: ${type.associated_id}`);
    console.log('');
  });
  
  // Verificar específicamente los de familia
  console.log('\n=== TIPOS DE FAMILIA ===\n');
  const familyTypes = types.filter(t => t.type_category === 'family');
  
  if (familyTypes.length === 0) {
    console.log('⚠️ No hay tipos de checklist de familia');
  } else {
    familyTypes.forEach(type => {
      const needsFix = type.frequency !== 'weekly' && type.frequency !== 'Semanal';
      const status = needsFix ? '❌ NECESITA CORRECCIÓN' : '✅ OK';
      
      console.log(`${status} - ${type.name}`);
      console.log(`  Frecuencia actual: "${type.frequency}"`);
      if (needsFix) {
        console.log(`  Debe ser: "weekly" o "Semanal"`);
      }
      console.log('');
    });
  }
  
  process.exit(0);
}

checkTypes().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
