const { connection } = require('../models');

async function getChecklistTypes() {
  try {
    console.log('=== OBTENIENDO TODOS LOS CHECKLIST TYPES ===\n');

    // Query simplificada para obtener todos los checklist types
    const checklistTypes = await connection.query(`
      SELECT 
        checklist_type_id,
        name,
        type_category,
        associated_id,
        createdAt
      FROM checklist_types
      ORDER BY checklist_type_id;
    `, { type: connection.QueryTypes.SELECT });
    
    console.log('TODOS LOS CHECKLIST TYPES:');
    console.table(checklistTypes);
    console.log('\n');

    // Query para ver las atracciones
    const attractions = await connection.query(`
      SELECT 
        ins_id,
        name
      FROM attractions
      ORDER BY ins_id;
    `, { type: connection.QueryTypes.SELECT });
    
    console.log('ATRACCIONES:');
    console.table(attractions);

  } catch (error) {
    console.error('Error obteniendo datos:', error);
  }
}

getChecklistTypes();