const { connection } = require('../models');

async function executeQueries() {
  try {
    console.log('=== EJECUTANDO QUERIES PARA OBTENER ITEMS REALES ===\n');

    // Query 1: Obtener tipos de checklist con atracciones
    console.log('1. TIPOS DE CHECKLIST CON ATRACCIONES:');
    const checklistTypes = await connection.query(`
      SELECT 
        ct.checklist_type_id,
        ct.name as checklist_name,
        ct.type_category,
        a.ins_id as attraction_id,
        i.name as attraction_name,
        ct.createdAt
      FROM checklist_types ct
      LEFT JOIN attractions a ON ct.associated_id = a.ins_id AND ct.type_category = 'attraction'
      LEFT JOIN inspectables i ON a.ins_id = i.ins_id
      WHERE ct.checklist_type_id IN (4, 5, 6, 7, 13, 14)
      ORDER BY ct.checklist_type_id, attraction_name;
    `, { type: connection.QueryTypes.SELECT });
    
    console.table(checklistTypes);
    console.log('\n');

    // Query 2: Items agrupados por checklist_type_id
    console.log('2. ITEMS AGRUPADOS POR CHECKLIST_TYPE_ID:');
    const groupedItems = await connection.query(`
      SELECT 
        ct.checklist_type_id,
        ct.name as checklist_name,
        COUNT(ci.checklist_item_id) as total_items,
        GROUP_CONCAT(ci.checklist_item_id ORDER BY ci.item_number, ci.checklist_item_id SEPARATOR ', ') as item_ids,
        i.name as attraction_name
      FROM checklist_types ct
      LEFT JOIN checklist_items ci ON ct.checklist_type_id = ci.checklist_type_id
      LEFT JOIN attractions a ON ct.associated_id = a.ins_id AND ct.type_category = 'attraction'
      LEFT JOIN inspectables i ON a.ins_id = i.ins_id
      WHERE ct.checklist_type_id IN (4, 5, 6, 7, 13, 14)
      GROUP BY ct.checklist_type_id, ct.name, i.name
      ORDER BY ct.checklist_type_id;
    `, { type: connection.QueryTypes.SELECT });
    
    console.table(groupedItems);
    console.log('\n');

    // Query 3: Items de tipo 'radio' por checklist_type_id
    console.log('3. ITEMS DE TIPO RADIO (DESBLOQUEABLES) POR CHECKLIST:');
    const radioItems = await connection.query(`
      SELECT 
        ct.checklist_type_id,
        ct.name as checklist_name,
        COUNT(ci.checklist_item_id) as total_radio_items,
        GROUP_CONCAT(ci.checklist_item_id ORDER BY ci.item_number, ci.checklist_item_id SEPARATOR ', ') as radio_item_ids,
        i.name as attraction_name
      FROM checklist_types ct
      LEFT JOIN checklist_items ci ON ct.checklist_type_id = ci.checklist_type_id AND ci.input_type = 'radio'
      LEFT JOIN attractions a ON ct.associated_id = a.ins_id AND ct.type_category = 'attraction'
      LEFT JOIN inspectables i ON a.ins_id = i.ins_id
      WHERE ct.checklist_type_id IN (4, 5, 6, 7, 13, 14)
      GROUP BY ct.checklist_type_id, ct.name, i.name
      ORDER BY ct.checklist_type_id;
    `, { type: connection.QueryTypes.SELECT });
    
    console.table(radioItems);
    console.log('\n');

    // Query 4: Detalle completo de items por checklist_type_id = 4
    console.log('4. DETALLE COMPLETO - CHECKLIST_TYPE_ID = 4:');
    const itemsType4 = await connection.query(`
      SELECT 
        ci.checklist_item_id,
        ci.item_number,
        ci.question_text,
        ci.input_type,
        ci.parent_item_id,
        ct.name as checklist_name,
        i.name as attraction_name
      FROM checklist_items ci
      INNER JOIN checklist_types ct ON ci.checklist_type_id = ct.checklist_type_id
      LEFT JOIN attractions a ON ct.associated_id = a.ins_id AND ct.type_category = 'attraction'
      LEFT JOIN inspectables i ON a.ins_id = i.ins_id
      WHERE ci.checklist_type_id = 4
      ORDER BY ci.item_number, ci.checklist_item_id;
    `, { type: connection.QueryTypes.SELECT });
    
    console.table(itemsType4);
    console.log('\n');

    // Query 5: Detalle completo de items por checklist_type_id = 5
    console.log('5. DETALLE COMPLETO - CHECKLIST_TYPE_ID = 5:');
    const itemsType5 = await connection.query(`
      SELECT 
        ci.checklist_item_id,
        ci.item_number,
        ci.question_text,
        ci.input_type,
        ci.parent_item_id,
        ct.name as checklist_name,
        i.name as attraction_name
      FROM checklist_items ci
      INNER JOIN checklist_types ct ON ci.checklist_type_id = ct.checklist_type_id
      LEFT JOIN attractions a ON ct.associated_id = a.ins_id AND ct.type_category = 'attraction'
      LEFT JOIN inspectables i ON a.ins_id = i.ins_id
      WHERE ci.checklist_type_id = 5
      ORDER BY ci.item_number, ci.checklist_item_id;
    `, { type: connection.QueryTypes.SELECT });
    
    console.table(itemsType5);
    console.log('\n');

    // Query 6: Detalle completo de items por checklist_type_id = 6
    console.log('6. DETALLE COMPLETO - CHECKLIST_TYPE_ID = 6:');
    const itemsType6 = await connection.query(`
      SELECT 
        ci.checklist_item_id,
        ci.item_number,
        ci.question_text,
        ci.input_type,
        ci.parent_item_id,
        ct.name as checklist_name,
        i.name as attraction_name
      FROM checklist_items ci
      INNER JOIN checklist_types ct ON ci.checklist_type_id = ct.checklist_type_id
      LEFT JOIN attractions a ON ct.associated_id = a.ins_id AND ct.type_category = 'attraction'
      LEFT JOIN inspectables i ON a.ins_id = i.ins_id
      WHERE ci.checklist_type_id = 6
      ORDER BY ci.item_number, ci.checklist_item_id;
    `, { type: connection.QueryTypes.SELECT });
    
    console.table(itemsType6);
    console.log('\n');

    // Query 7: Detalle completo de items por checklist_type_id = 7
    console.log('7. DETALLE COMPLETO - CHECKLIST_TYPE_ID = 7:');
    const itemsType7 = await connection.query(`
      SELECT 
        ci.checklist_item_id,
        ci.item_number,
        ci.question_text,
        ci.input_type,
        ci.parent_item_id,
        ct.name as checklist_name,
        i.name as attraction_name
      FROM checklist_items ci
      INNER JOIN checklist_types ct ON ci.checklist_type_id = ct.checklist_type_id
      LEFT JOIN attractions a ON ct.associated_id = a.ins_id AND ct.type_category = 'attraction'
      LEFT JOIN inspectables i ON a.ins_id = i.ins_id
      WHERE ci.checklist_type_id = 7
      ORDER BY ci.item_number, ci.checklist_item_id;
    `, { type: connection.QueryTypes.SELECT });
    
    console.table(itemsType7);
    console.log('\n');

    // Query 8: Detalle completo de items por checklist_type_id = 13
    console.log('8. DETALLE COMPLETO - CHECKLIST_TYPE_ID = 13:');
    const itemsType13 = await connection.query(`
      SELECT 
        ci.checklist_item_id,
        ci.item_number,
        ci.question_text,
        ci.input_type,
        ci.parent_item_id,
        ct.name as checklist_name,
        i.name as attraction_name
      FROM checklist_items ci
      INNER JOIN checklist_types ct ON ci.checklist_type_id = ct.checklist_type_id
      LEFT JOIN attractions a ON ct.associated_id = a.ins_id AND ct.type_category = 'attraction'
      LEFT JOIN inspectables i ON a.ins_id = i.ins_id
      WHERE ci.checklist_type_id = 13
      ORDER BY ci.item_number, ci.checklist_item_id;
    `, { type: connection.QueryTypes.SELECT });
    
    console.table(itemsType13);
    console.log('\n');

    // Query 9: Detalle completo de items por checklist_type_id = 14
    console.log('9. DETALLE COMPLETO - CHECKLIST_TYPE_ID = 14:');
    const itemsType14 = await connection.query(`
      SELECT 
        ci.checklist_item_id,
        ci.item_number,
        ci.question_text,
        ci.input_type,
        ci.parent_item_id,
        ct.name as checklist_name,
        i.name as attraction_name
      FROM checklist_items ci
      INNER JOIN checklist_types ct ON ci.checklist_type_id = ct.checklist_type_id
      LEFT JOIN attractions a ON ct.associated_id = a.ins_id AND ct.type_category = 'attraction'
      LEFT JOIN inspectables i ON a.ins_id = i.ins_id
      WHERE ci.checklist_type_id = 14
      ORDER BY ci.item_number, ci.checklist_item_id;
    `, { type: connection.QueryTypes.SELECT });
    
    console.table(itemsType14);

  } catch (error) {
    console.error('Error ejecutando queries:', error);
  }
}

executeQueries();