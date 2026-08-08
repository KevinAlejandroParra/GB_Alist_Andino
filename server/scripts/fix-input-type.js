const { connection } = require('../src/models');
const { ChecklistItem } = require('../src/models');

async function fixInputTypes() {
  console.log('Corrigiendo input_type "number" a "numeric"...');
  try {
    const [updatedRows] = await ChecklistItem.update(
      { input_type: 'numeric' },
      { where: { input_type: 'number' } }
    );
    console.log(`✅ Se han corregido ${updatedRows} items que tenían input_type='number' a 'numeric'.`);
  } catch (error) {
    console.error('❌ Error corrigiendo la base de datos:', error);
  } finally {
    process.exit(0);
  }
}

fixInputTypes();
