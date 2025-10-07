const { Checklist, ChecklistType } = require('../models');

async function diagnoseChecklists() {
  console.log('=== DIAGNÓSTICO DE CHECKLISTS ===');

  try {
    // 1. Verificar todos los checklists
    const checklists = await Checklist.findAll({
      include: [{ model: ChecklistType, as: 'type' }]
    });

    console.log(`Total de checklists encontrados: ${checklists.length}`);

    // 2. Buscar checklists sin tipo válido
    const problematicChecklists = checklists.filter(c => !c.type);
    console.log(`Checklists sin tipo válido: ${problematicChecklists.length}`);

    if (problematicChecklists.length > 0) {
      console.log('\n=== CHECKLISTS PROBLEMÁTICOS ===');
      problematicChecklists.forEach(checklist => {
        console.log(`ID: ${checklist.checklist_id}, checklist_type_id: ${checklist.checklist_type_id}, fecha: ${checklist.date}`);
      });
    }

    // 3. Verificar ChecklistTypes disponibles
    const checklistTypes = await ChecklistType.findAll();
    console.log(`\nTotal de ChecklistTypes: ${checklistTypes.length}`);

    console.log('\n=== CHECKLISTTYPES DISPONIBLES ===');
    checklistTypes.forEach(type => {
      console.log(`ID: ${type.checklist_type_id}, Nombre: ${type.name}, Categoría: ${type.type_category}, Role: ${type.role_id}`);
    });

    // 4. Checklist específico con ID 4
    const checklist4 = await Checklist.findByPk(4, {
      include: [{ model: ChecklistType, as: 'type' }]
    });

    if (checklist4) {
      console.log('\n=== CHECKLIST ID 4 ===');
      console.log(`ID: ${checklist4.checklist_id}`);
      console.log(`checklist_type_id: ${checklist4.checklist_type_id}`);
      console.log(`Fecha: ${checklist4.date}`);
      console.log(`Tiene tipo: ${!!checklist4.type}`);
      if (checklist4.type) {
        console.log(`Tipo: ${checklist4.type.name}`);
      }
    } else {
      console.log('\n=== CHECKLIST ID 4 NO ENCONTRADO ===');
    }

    // 5. Buscar ChecklistType estático para técnicos
    const staticType = await ChecklistType.findOne({
      where: {
        role_id: 7,
        type_category: 'static'
      }
    });

    if (staticType) {
      console.log('\n=== CHECKLISTTYPE ESTÁTICO PARA TÉCNICOS ===');
      console.log(`ID: ${staticType.checklist_type_id}, Nombre: ${staticType.name}`);
    } else {
      console.log('\n=== NO HAY CHECKLISTTYPE ESTÁTICO PARA TÉCNICOS ===');
    }

  } catch (error) {
    console.error('Error en diagnóstico:', error);
  }
}

async function fixProblematicChecklists() {
  console.log('=== CORRIGIENDO CHECKLISTS PROBLEMÁTICOS ===');

  try {
    // Buscar ChecklistType estático para técnicos
    const staticType = await ChecklistType.findOne({
      where: {
        role_id: 7,
        type_category: 'static'
      }
    });

    if (!staticType) {
      console.log('No se encontró ChecklistType estático para técnicos. Creando uno...');

      // Crear un ChecklistType básico si no existe
      const newType = await ChecklistType.create({
        name: 'Checklist Estático General',
        description: 'Checklist estático general para técnicos',
        frequency: 'diario',
        version_label: 'V1 General',
        role_id: 7,
        type_category: 'static',
        dynamic_items: false
      });

      console.log(`ChecklistType creado con ID: ${newType.checklist_type_id}`);
      staticType = newType;
    }

    // Buscar checklists sin tipo válido
    const checklists = await Checklist.findAll();
    const problematicChecklists = [];

    for (const checklist of checklists) {
      const type = await ChecklistType.findByPk(checklist.checklist_type_id);
      if (!type) {
        problematicChecklists.push(checklist);
      }
    }

    console.log(`Encontrados ${problematicChecklists.length} checklists sin tipo válido`);

    // Corregir cada checklist problemático
    for (const checklist of problematicChecklists) {
      console.log(`Corrigiendo checklist ID ${checklist.checklist_id}...`);

      await checklist.update({
        checklist_type_id: staticType.checklist_type_id
      });

      console.log(`✓ Checklist ${checklist.checklist_id} corregido con tipo ${staticType.checklist_type_id}`);
    }

    console.log(`\n=== CORRECCIÓN COMPLETADA ===`);
    console.log(`Total de checklists corregidos: ${problematicChecklists.length}`);

  } catch (error) {
    console.error('Error corrigiendo checklists:', error);
  }
}

module.exports = { diagnoseChecklists, fixProblematicChecklists };